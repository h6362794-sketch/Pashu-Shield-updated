# Mobile OTP authentication (all roles)

Every PashuMitra portal — **Animal Owner**, **Veterinarian**, **Government** and
**Laboratory** — authenticates with a **mobile number** and a **six-digit OTP
delivered by SMS** through the installed
[Android SMS Gateway™ (capcom6)](https://github.com/capcom6/android-sms-gateway)
app running in **Cloud Server** mode.

**Email/password authentication has been removed.** There is no password field on
any login or signup screen, no forgotten-password flow, and no public backend
route that accepts a password.

Every existing user record, animal, herd, case, prescription, lab report and
notification is preserved. Accounts that previously signed in with a password now
sign in with the mobile number already stored on their record.

---

## 1. What changed

| Layer | File | Change |
|---|---|---|
| API | `backend/app.py` | New role-aware `GET /api/auth/otp/config`, `POST /api/auth/otp/request`, `POST /api/auth/otp/resend`, `POST /api/auth/otp/verify`, `POST /api/auth/otp/register`. `POST`/`GET /api/auth/login` and `/api/auth/register` are retired with `410 Gone`. `/api/health` reports `authentication.method = "mobile_otp"`. |
| OTP service | `backend/otp_service.py` | `request_otp` / `resend_otp` / `verify_otp` take `roles`, `allow_unregistered` and `calling_code`; a new `mobile_auth` purpose serves every role and pre-account (signup) codes. All existing crypto, expiry, attempt, cooldown and rate-limit controls are unchanged. |
| Database | `backend/database.py` | Additive `users.mobile_e164` column + unique index, backfilled from `mobile` (`ensure_mobile_e164_backfill`); `find_user_by_mobile` lookup helper; `otp_codes.user_id` / `role` relaxed to nullable so a signup OTP can exist before the account does (`_ensure_otp_signup_columns_nullable`). `password_hash` / `salt` / `email` columns are **kept**. |
| Phone normalisation | `backend/ivr_config.py` | `normalize_mobile_number(value, calling_code)` + `SUPPORTED_CALLING_CODES` (India `+91` default). Identical results to `normalize_indian_number` for every Indian input. |
| Login/signup UI | `frontend/app.js`, `frontend/style.css` | One mobile-OTP screen for all four portals: country-code selector, send → six-digit verify → resend countdown → change number, then either the farmer profile step or the "provisioned by an administrator" notice. Password forms, the `#/login/:role/password` route and the demo passwords are gone. |
| Offline cache | `frontend/sw.js` | Cache bumped to `pashumitra-v4` so clients receive the new bundle. |
| Tests | `backend/test_mobile_otp_auth.py` *(new)*, `backend/test_farmer_otp_login.py`, `backend/test_helpline.py`, `backend/test_all_features.py`, `frontend/tests/otp_login_ui.test.mjs` | Role-aware OTP login/registration, privilege-escalation prevention, retired password routes, migration and data preservation. |
| Config | `.env.example`, `render.yaml` | `FARMER_PASSWORD_FALLBACK` removed — there is no password fallback to configure. |

No ML code, ML models, IVR/helpline behaviour, dashboards or role-based access
controls were modified.

---

## 2. API

All endpoints are JSON. None of them ever returns an OTP, a password hash, a
gateway credential or a full phone number in a log or audit record.

### `GET /api/auth/otp/config`

Public, secret-free settings for the login screen:

```json
{
  "login_method": "mobile_otp",
  "password_auth_enabled": false,
  "password_fallback_enabled": false,
  "otp_login_enabled": true,
  "otp_length": 6,
  "otp_ttl_seconds": 300,
  "resend_cooldown_seconds": 60,
  "max_attempts": 5,
  "pepper_stable": true,
  "default_calling_code": "91",
  "supported_calling_codes": [{ "calling_code": "91", "e164_prefix": "+91" }],
  "self_register_roles": ["owner"],
  "provisioned_roles": ["vet", "govt", "lab"]
}
```

### `POST /api/auth/otp/request` · `POST /api/auth/otp/resend`

```json
{ "mobile": "9800000001", "calling_code": "91" }
```

`calling_code` is optional and defaults to India (`91`).

`200` — identical body for a number with an account and a number without one, so
nothing is revealed about registration:

```json
{
  "ok": true,
  "message": "An OTP has been submitted to the SMS gateway. If this mobile number can receive SMS it will arrive shortly. It is valid for 5 minutes.",
  "delivery_confirmed": false,
  "expires_in": 300,
  "resend_after": 60
}
```

`delivery_confirmed` is always `false`. A `200` means *the gateway accepted the
submission*, never that a handset received the message. Errors: `400
INVALID_MOBILE`, `429 COOLDOWN_ACTIVE` / `RATE_LIMITED` (with `retry_after`),
`502`/`503` gateway failures (`SMS_GATEWAY_UNAVAILABLE`,
`SMS_GATEWAY_NOT_CONFIGURED`, `OTP_PEPPER_UNSTABLE`, …). A failed dispatch is
never reported as success and the unusable code is retired (`SEND_FAILED`).

### `POST /api/auth/otp/verify`

```json
{ "mobile": "9800000001", "otp": "123456", "calling_code": "91" }
```

**Existing account** → the same token/user shape every dashboard already expects.
The role comes from the stored account, never from the request:

```json
{ "token": "<jwt>", "user": { "id": 3, "role": "vet", "full_name": "…" }, "login_method": "otp" }
```

**No account yet** → phone ownership is proven but no session is issued:

```json
{
  "ok": true,
  "registration_required": true,
  "mobile_e164": "+919704400111",
  "registration_token": "<short-lived HMAC token>",
  "registration_token_expires_in": 900,
  "self_register_roles": ["owner"],
  "provisioned_roles": ["vet", "govt", "lab"]
}
```

Errors: `400 INVALID_OTP_FORMAT` / `INVALID_MOBILE`, `401 OTP_INVALID` /
`OTP_EXPIRED` / `OTP_ALREADY_USED`, `429 OTP_LOCKED` / `RATE_LIMITED`.

### `POST /api/auth/otp/register`

```json
{
  "registration_token": "<from verify>",
  "role": "owner",
  "full_name": "Asha Bhosale",
  "district": "Pune",
  "village": "Wagholi",
  "block": "Haveli",
  "preferred_language": "mr"
}
```

`201` with `{ token, user, login_method: "otp", registered: true }`.

Only `owner` may self-register. `403 ROLE_NOT_SELF_REGISTERABLE` for `vet`,
`govt`, `lab` or any other value. `401 REGISTRATION_TOKEN_INVALID` for a missing,
tampered or expired token. If the number gained an account in the meantime the
endpoint logs that account in (`200`, `registered: false`) instead of creating a
duplicate.

Only the fields the role actually needs are collected: `full_name` and `district`
are required; `village`, `block`, `preferred_language` are optional. **Email and
password are not requested.** `users.email` stays `NOT NULL`/`UNIQUE` for schema
compatibility, so a verified number without an email gets a deterministic
placeholder (`<number>@mobile.pashumitra.local`) that is contact data only and
can never be used to sign in.

### Retired routes

| Route | Response |
|---|---|
| `POST` / `GET /api/auth/login` | `410` `{"code":"PASSWORD_AUTH_REMOVED","login_method":"mobile_otp"}` |
| `POST` / `GET /api/auth/register` | `410` `{"code":"PASSWORD_AUTH_REMOVED","login_method":"mobile_otp"}` |

They return an explicit `410` rather than being deleted so an old client gets an
actionable answer instead of a `404` that looks like a routing bug — and so a
scripted attempt to reach the old password path fails loudly.

### Farmer endpoints (kept for the deployed farmer client)

`GET /api/auth/farmer/config`, `POST /api/auth/farmer/request-otp`,
`/resend-otp`, `/verify-otp` still exist and still behave as before: farmer
accounts only, no SMS dispatched for an unknown number, and a farmer OTP can
never authenticate another role. `password_fallback_enabled` is now always
`false`.

---

## 3. Security model

Unchanged from the farmer design and applied to every role:

* Six-digit code from `secrets.randbelow` (CSPRNG).
* Only a PBKDF2-HMAC-SHA256 hash is stored, salted per OTP row and peppered with
  `OTP_PEPPER` (falling back to `SIH_SECRET_KEY`).
* 5-minute expiry, 5 verification attempts, single use, consumed atomically
  (`UPDATE … WHERE status='ACTIVE'` + `rowcount` check) so two concurrent
  verifies can never both succeed.
* 60-second resend cooldown; per-mobile, per-IP and per-mobile-failure rate
  limits.
* Issuing a new OTP invalidates every older active OTP for that number+purpose.
* OTP plaintext is never returned by an endpoint, never written to a log or to
  `audit_events`, and never stored in the browser.
* `OTP_PEPPER` must be stable: with more than one Gunicorn worker an ephemeral
  per-process pepper makes valid codes fail with `401`. `/api/health` reports
  `pepper_stable`, and production refuses to issue OTPs when it is `false`.

Added for role-aware signup:

* **No account is created without a verified OTP.** `verify` hands back a
  short-lived (15-minute) HMAC token bound to the exact verified number;
  `register` rejects anything else.
* **The requested role is never trusted.** An existing number always resolves to
  its own stored role, so tapping the Government portal on a farmer's number logs
  the farmer into the farmer dashboard. New numbers may only become `owner`.
* **Privileged accounts keep the existing trusted provisioning path** — they are
  operator-seeded / administrator-approved, exactly as before. There is no
  self-service route to `vet`, `govt` or `lab`.
* **Mobile numbers are stored normalized** (`users.mobile_e164`) and indexed
  uniquely, so the same number cannot be registered twice, including across
  notations (`9800000001`, `09800000001`, `+91 98000 00001`).
* New accounts receive an **unusable password credential** (a hash of a discarded
  random secret) so the retained `NOT NULL` columns are satisfied and no password
  can ever match.

---

## 4. Migration

`database.init_db()` runs on boot under an inter-process lock and is additive:

1. `ensure_user_columns` adds `users.mobile_e164`.
2. `ensure_otp_tables` relaxes `otp_codes.user_id` / `role` to nullable by
   rebuilding the table once, copying **every** existing column verbatim (hashes,
   salts, statuses and gateway diagnostics survive).
3. `ensure_mobile_e164_backfill` derives `mobile_e164` from `mobile` for every
   row (seeded staff and accounts migrated from email/password signup included)
   and creates a unique index. If two legacy rows normalize to the same number
   the unique index is *not* created (a plain index is used instead) and the
   conflict is logged for an operator — no row is ever rewritten or deleted.

Nothing is removed: `password_hash`, `salt` and `email` stay so existing rows are
untouched and an older revision can still be rolled back onto the same database.

---

## 5. Configuration

See `.env.example`. The relevant keys:

```
OTP_PEPPER=                     # required in production; must be stable across workers
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MOBILE_MAX_REQUESTS=5
OTP_MOBILE_RATE_WINDOW_SECONDS=900
OTP_IP_MAX_REQUESTS=20
OTP_IP_RATE_WINDOW_SECONDS=3600
SMS_GATEWAY_MODE=CLOUD
SMS_GATEWAY_BASE_URL=https://api.sms-gate.app/3rdparty/v1
SMS_GATEWAY_USERNAME=
SMS_GATEWAY_PASSWORD=
SMS_GATEWAY_DEVICE_ID=          # strongly recommended: pin the sending handset
```

`FARMER_PASSWORD_FALLBACK` was **removed** — there is no password fallback to
configure.

---

## 6. Tests

```bash
cd backend
python -m unittest test_mobile_otp_auth      # 49 tests: role-aware OTP auth
python -m unittest test_farmer_otp_login     # 61 tests: farmer flow + gateway client
python -m unittest test_regression           # 10 tests: existing dashboards/APIs
python -m unittest test_all_features         # 12 tests: health-chain features
IVR_WEBHOOK_SECRET=<secret> python -m unittest test_helpline   # 34 tests

cd ..
node --test frontend/tests/*.test.mjs        # 16 tests: OTP UI contract
```

`test_mobile_otp_auth.py` covers: OTP login for all four roles and dashboard
routing per role; role selection on the login screen not changing the account;
number-notation and calling-code handling; farmer self-registration with only the
required profile fields; refusal of `vet`/`govt`/`lab` self-registration;
registration-token expiry, tampering and binding; duplicate prevention; wrong,
expired, replayed, malformed, locked and rate-limited OTPs; honest SMS-gateway
failure reporting; retired password routes; and migration/data preservation.

---

## 7. Rollback

The database migrations are additive, so an earlier revision still runs against
the same file. Note that a revision from before this change will re-enable
`/api/auth/login`, and accounts created by OTP signup have an unusable password
credential — those users would need a password set by an operator to sign in on
the old revision.
