"""Mobile-OTP-only authentication tests (all roles).

Run with::

    cd backend
    python -m unittest test_mobile_otp_auth -v

These cover the role-aware endpoints that replaced email/password auth:

    GET  /api/auth/otp/config
    POST /api/auth/otp/request
    POST /api/auth/otp/resend
    POST /api/auth/otp/verify
    POST /api/auth/otp/register

and the retirement of ``/api/auth/login`` / ``/api/auth/register``.

The SMS gateway is stubbed per test (``sms_gateway.send_text_message``), so no
real SMS is sent; the stub captures the message body, which is how a test reads
the OTP exactly like a handset would. The OTP is never returned by the API.
"""
from __future__ import annotations

import os
import re
import time
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

os.environ.setdefault("SIH_SECRET_KEY", "test-secret-key-for-mobile-otp-suite")
os.environ.setdefault("OTP_PEPPER", "test-pepper-for-mobile-otp-suite")
# Keep the suite away from developer data unless the caller pinned a DB path.
os.environ.setdefault("SIH_DB_PATH",
                      os.path.join(os.path.dirname(__file__), "test_mobile_otp_auth.db"))

import app as app_module  # noqa: E402  (import after env setup)
import database  # noqa: E402
import otp_service  # noqa: E402
import sms_gateway  # noqa: E402

OWNER_MOBILE = "9800000001"        # seeded farmer  (Rajesh Patil)
VET_MOBILE = "9800000010"          # seeded veterinarian
GOVT_MOBILE = "9800000020"         # seeded government officer
LAB_MOBILE = "9800000030"          # seeded laboratory technician
NEW_OWNER_MOBILE = "9700010001"    # never registered
ROLE_BY_MOBILE = {
    OWNER_MOBILE: "owner", VET_MOBILE: "vet",
    GOVT_MOBILE: "govt", LAB_MOBILE: "lab",
}
DEMO_PASSWORD = "password123"


class FakeGateway:
    """Captures OTP SMS instead of contacting the Android SMS Gateway."""

    def __init__(self, fail_with: str | None = None):
        self.fail_with = fail_with
        self.messages: list[dict] = []

    def __call__(self, to_e164, text, **kwargs):
        if self.fail_with:
            raise sms_gateway.SmsGatewayError("stubbed failure", code=self.fail_with, status=503)
        self.messages.append({"to": to_e164, "text": text})
        return {"delivered": True, "simulated": False, "mode": "CLOUD",
                "message_id": f"stub-{len(self.messages)}", "state": "Pending",
                "accepted": True, "http_status": 200}

    @property
    def last_code(self) -> str | None:
        if not self.messages:
            return None
        match = re.search(r"\b(\d{6})\b", self.messages[-1]["text"])
        return match.group(1) if match else None


class MobileOtpAuthTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db()
        cls.client = app_module.app.test_client()
        conn = database.get_db()
        cls.users = {
            role: dict(conn.execute("SELECT * FROM users WHERE mobile=?", (mobile,)).fetchone())
            for mobile, role in ROLE_BY_MOBILE.items()
        }
        conn.commit()
        conn.close()

    def setUp(self):
        self.gateway = FakeGateway()
        self._patcher = mock.patch.object(sms_gateway, "send_text_message", self.gateway)
        self._patcher.start()
        self.addCleanup(self._patcher.stop)
        self._reset_otp_tables()
        self._env = mock.patch.dict(os.environ, {
            "SMS_GATEWAY_MODE": "CLOUD",
            "SMS_GATEWAY_BASE_URL": "https://api.sms-gate.app/3rdparty/v1",
            "SMS_GATEWAY_USERNAME": "test-user",
            "SMS_GATEWAY_PASSWORD": "test-pass",
            "OTP_RESEND_COOLDOWN_SECONDS": "0",
            "OTP_MOBILE_MAX_REQUESTS": "50",
            "OTP_IP_MAX_REQUESTS": "500",
        }, clear=False)
        self._env.start()
        self.addCleanup(self._env.stop)

    # ------------------------------------------------------------- helpers
    def _reset_otp_tables(self):
        conn = database.get_db()
        conn.execute("DELETE FROM otp_codes")
        conn.execute("DELETE FROM otp_request_log")
        conn.commit()
        conn.close()

    def request_otp(self, mobile, **extra):
        return self.client.post("/api/auth/otp/request", json={"mobile": mobile, **extra})

    def resend_otp(self, mobile, **extra):
        return self.client.post("/api/auth/otp/resend", json={"mobile": mobile, **extra})

    def verify_otp(self, code, mobile, **extra):
        return self.client.post("/api/auth/otp/verify",
                                json={"mobile": mobile, "otp": code, **extra})

    def issue(self, mobile):
        """Request an OTP and return the code the gateway received."""
        response = self.request_otp(mobile)
        self.assertEqual(response.status_code, 200, response.get_json())
        code = self.gateway.last_code
        self.assertIsNotNone(code, "an OTP SMS must reach the gateway")
        return code

    def login(self, mobile):
        """Full OTP login; returns the response."""
        return self.verify_otp(self.issue(mobile), mobile)

    def auth(self, token):
        return {"Authorization": f"Bearer {token}"}

    def _force_expiry(self, mobile_e164):
        conn = database.get_db()
        past = (datetime.now(timezone.utc) - timedelta(seconds=5)).isoformat()
        conn.execute("UPDATE otp_codes SET expires_at=? WHERE mobile_e164=? AND status='ACTIVE'",
                     (past, mobile_e164))
        conn.commit()
        conn.close()

    def _row(self, mobile_e164, purpose=otp_service.PURPOSE_MOBILE_AUTH):
        conn = database.get_db()
        row = conn.execute(
            "SELECT * FROM otp_codes WHERE mobile_e164=? AND purpose=? ORDER BY id DESC LIMIT 1",
            (mobile_e164, purpose)).fetchone()
        conn.close()
        return dict(row) if row else None

    def _user_count(self, mobile_e164):
        conn = database.get_db()
        count = conn.execute("SELECT COUNT(*) c FROM users WHERE mobile_e164=?",
                             (mobile_e164,)).fetchone()["c"]
        conn.close()
        return count

    def fresh_mobile(self):
        """A 10-digit number that is not registered yet (unique per call)."""
        self._counter = getattr(self, "_counter", 0) + 1
        candidate = f"9700{self._counter:03d}{int(time.time()) % 1000:03d}"
        candidate = candidate[:10]
        while self._user_count(f"+91{candidate}"):
            self._counter += 1
            candidate = f"9701{self._counter:03d}{int(time.time()) % 1000:03d}"[:10]
        return candidate


# ==========================================================================
# 1. Login for every role
# ==========================================================================
class TestRoleOtpLogin(MobileOtpAuthTestCase):
    def test_01_every_role_logs_in_with_a_mobile_otp(self):
        for mobile, role in ROLE_BY_MOBILE.items():
            response = self.login(mobile)
            self.assertEqual(response.status_code, 200, f"{role}: {response.get_json()}")
            body = response.get_json()
            self.assertEqual(body["user"]["role"], role)
            self.assertEqual(body["user"]["id"], self.users[role]["id"])
            self.assertEqual(body["login_method"], "otp")
            self.assertIn("token", body)
            # The JWT is the same shape the dashboards already expect.
            me = self.client.get("/api/users/me", headers=self.auth(body["token"]))
            self.assertEqual(me.status_code, 200)
            self.assertEqual(me.get_json()["role"], role)

    def test_02_login_lands_each_role_on_its_own_dashboard_data(self):
        """The verified account role decides the dashboard, not the request.

        Only role-exclusive endpoints are asserted here: the platform already
        shares some surveillance views between govt and vet (e.g.
        /api/govt/analytics is @auth_required(roles=["govt","vet"])), and that
        existing authorization policy is deliberately left untouched.
        """
        exclusive = {
            "owner": "/api/owner/summary",
            "vet": "/api/vet/summary",
            "govt": "/api/govt/ai/status",
        }
        dashboards = {
            "owner": ["/api/owner/summary", "/api/animals", "/api/herds"],
            "vet": ["/api/vet/summary", "/api/cases", "/api/campaigns"],
            "govt": ["/api/govt/analytics", "/api/govt/ai/status"],
            "lab": ["/api/lab/summary", "/api/lab/queue", "/api/lab/reports"],
        }
        for mobile, role in ROLE_BY_MOBILE.items():
            token = self.login(mobile).get_json()["token"]
            for path in dashboards[role]:
                own = self.client.get(path, headers=self.auth(token))
                self.assertEqual(own.status_code, 200, f"{role} must reach {path}")
            for other_role, path in exclusive.items():
                if other_role == role:
                    continue
                blocked = self.client.get(path, headers=self.auth(token))
                self.assertEqual(blocked.status_code, 403,
                                 f"{role} must not reach {path} "
                                 f"(got {blocked.status_code})")

    def test_03_selecting_a_different_role_on_login_does_not_change_the_account(self):
        """A farmer who taps the 'Government' portal still gets the farmer account."""
        response = self.verify_otp(self.issue(OWNER_MOBILE), OWNER_MOBILE, role="govt")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["user"]["role"], "owner")
        self.assertEqual(body["user"]["id"], self.users["owner"]["id"])
        token = body["token"]
        self.assertEqual(self.client.get("/api/govt/analytics",
                                         headers=self.auth(token)).status_code, 403)
        self.assertEqual(self.client.get("/api/owner/summary",
                                         headers=self.auth(token)).status_code, 200)

    def test_04_number_notation_variants_resolve_to_one_account(self):
        for notation in ("9800000010", "09800000010", "+91 98000 00010", "+919800000010"):
            response = self.login(notation)
            self.assertEqual(response.status_code, 200, notation)
            self.assertEqual(response.get_json()["user"]["id"], self.users["vet"]["id"])

    def test_05_country_code_defaults_to_india_and_can_be_overridden(self):
        # No calling code supplied -> India.
        self.assertEqual(self.request_otp(OWNER_MOBILE).status_code, 200)
        self.assertEqual(self.gateway.messages[-1]["to"], "+919800000001")
        # Explicit +91 behaves identically.
        self.assertEqual(self.request_otp(OWNER_MOBILE, calling_code="91").status_code, 200)
        self.assertEqual(self.gateway.messages[-1]["to"], "+919800000001")
        # An explicit foreign calling code is honoured (signup-capable flow).
        self.assertEqual(self.request_otp("4155550123", calling_code="1").status_code, 200)
        self.assertEqual(self.gateway.messages[-1]["to"], "+14155550123")

    def test_06_unsupported_country_code_is_rejected_not_guessed(self):
        response = self.request_otp("4155550123", calling_code="999")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["code"], "INVALID_MOBILE")
        self.assertEqual(self.gateway.messages, [])

    def test_07_config_publishes_the_login_contract_without_secrets(self):
        body = self.client.get("/api/auth/otp/config").get_json()
        self.assertEqual(body["login_method"], "mobile_otp")
        self.assertIs(body["password_auth_enabled"], False)
        self.assertIs(body["password_fallback_enabled"], False)
        self.assertEqual(body["self_register_roles"], ["owner"])
        self.assertEqual(sorted(body["provisioned_roles"]), ["govt", "lab", "vet"])
        self.assertEqual(body["otp_length"], 6)
        self.assertEqual(body["default_calling_code"], "91")
        self.assertIn({"calling_code": "91", "e164_prefix": "+91"},
                      body["supported_calling_codes"])
        rendered = str(body).lower()
        for secret in ("test-pass", "test-user", "sms-gate.app", "pepper_value"):
            self.assertNotIn(secret, rendered)


# ==========================================================================
# 2. Registration
# ==========================================================================
class TestOtpRegistration(MobileOtpAuthTestCase):
    def setUp(self):
        super().setUp()
        # Every registration test needs a number nobody has claimed yet.
        self.mobile = self.fresh_mobile()

    def _verified_token(self, mobile=None):
        mobile = mobile or self.mobile
        code = self.issue(mobile)
        response = self.verify_otp(code, mobile)
        self.assertEqual(response.status_code, 200, response.get_json())
        body = response.get_json()
        self.assertTrue(body["registration_required"])
        self.assertEqual(body["mobile_e164"], f"+91{mobile}")
        self.assertNotIn("token", body, "no session may exist before registration")
        return body["registration_token"]

    def test_10_verified_new_number_registers_as_a_farmer(self):
        token = self._verified_token()
        response = self.client.post("/api/auth/otp/register", json={
            "registration_token": token, "role": "owner",
            "full_name": "Asha Bhosale", "district": "Pune",
            "village": "Wagholi", "block": "Haveli", "preferred_language": "mr",
        })
        self.assertEqual(response.status_code, 201, response.get_json())
        body = response.get_json()
        self.assertTrue(body["registered"])
        user = body["user"]
        self.assertEqual(user["role"], "owner")
        self.assertEqual(user["mobile_e164"], f"+91{self.mobile}")
        self.assertEqual(user["preferred_language"], "mr")
        # No password material or OTP ever leaves the API.
        self.assertNotIn("password_hash", user)
        self.assertNotIn("salt", user)
        self.assertNotIn("otp", body)
        # The new account works immediately and sees an empty farm.
        me = self.client.get("/api/users/me", headers=self.auth(body["token"]))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.get_json()["full_name"], "Asha Bhosale")
        animals = self.client.get("/api/animals", headers=self.auth(body["token"]))
        self.assertEqual(animals.status_code, 200)
        self.assertEqual(animals.get_json(), [])

    def test_11_registration_only_collects_the_fields_that_role_needs(self):
        token = self._verified_token()
        # No email and no password are required any more.
        response = self.client.post("/api/auth/otp/register", json={
            "registration_token": token, "role": "owner",
            "full_name": "Minimal Farmer", "district": "Nashik",
        })
        self.assertEqual(response.status_code, 201, response.get_json())
        user = response.get_json()["user"]
        self.assertEqual(user["district"], "Nashik")
        self.assertIsNone(user["preferred_language"])
        # The email column stays NOT NULL/UNIQUE, so a placeholder is derived
        # from the verified number — it is contact data, never a credential.
        self.assertEqual(user["email"], f"91{self.mobile}@mobile.pashumitra.local")

    def test_12_missing_profile_fields_are_reported(self):
        token = self._verified_token()
        response = self.client.post("/api/auth/otp/register", json={
            "registration_token": token, "role": "owner", "full_name": "No District",
        })
        self.assertEqual(response.status_code, 400)
        body = response.get_json()
        self.assertEqual(body["code"], "MISSING_PROFILE_FIELDS")
        self.assertEqual(body["required_fields"], ["full_name", "district"])
        self.assertEqual(self._user_count(f"+91{self.mobile}"), 0)

    def test_13_invalid_preferred_language_is_rejected(self):
        token = self._verified_token()
        response = self.client.post("/api/auth/otp/register", json={
            "registration_token": token, "role": "owner", "full_name": "Bad Lang",
            "district": "Pune", "preferred_language": "fr",
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["code"], "INVALID_PROFILE")

    def test_14_privileged_roles_cannot_self_register(self):
        for role in ("vet", "govt", "lab", "VET", "Govt", "", "administrator", "superuser"):
            token = self._verified_token()
            response = self.client.post("/api/auth/otp/register", json={
                "registration_token": token, "role": role,
                "full_name": "Privilege Seeker", "district": "Pune",
            })
            self.assertEqual(response.status_code, 403, role)
            body = response.get_json()
            self.assertEqual(body["code"], "ROLE_NOT_SELF_REGISTERABLE")
            self.assertEqual(body["self_register_roles"], ["owner"])
            self.assertNotIn("token", body)
            self.assertEqual(self._user_count(f"+91{self.mobile}"), 0)

    def test_14b_the_farmer_role_is_accepted_case_and_space_insensitively(self):
        """Normalizing 'OWNER ' must not turn into a rejection for a real farmer."""
        response = self.client.post("/api/auth/otp/register", json={
            "registration_token": self._verified_token(), "role": " OWNER ",
            "full_name": "Uppercase Farmer", "district": "Pune",
        })
        self.assertEqual(response.status_code, 201, response.get_json())
        self.assertEqual(response.get_json()["user"]["role"], "owner")

    def test_15_registration_requires_a_verified_token(self):
        for bad in (None, "", "nonsense", "abc.def", "e30=.deadbeef"):
            response = self.client.post("/api/auth/otp/register", json={
                "registration_token": bad, "role": "owner",
                "full_name": "No Token", "district": "Pune",
            })
            self.assertEqual(response.status_code, 401, bad)
            self.assertEqual(response.get_json()["code"], "REGISTRATION_TOKEN_INVALID")
        self.assertEqual(self._user_count(f"+91{self.mobile}"), 0)

    def test_16_registration_token_is_bound_to_the_verified_number(self):
        token = self._verified_token()
        # A token minted for another number registers *that* number, never this one.
        other = self.fresh_mobile()
        forged = app_module._issue_registration_token(f"+91{other}")
        response = self.client.post("/api/auth/otp/register", json={
            "registration_token": forged, "role": "owner",
            "full_name": "Other Number", "district": "Pune",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["user"]["mobile_e164"], f"+91{other}")
        self.assertEqual(self._user_count(f"+91{self.mobile}"), 0)
        # ...and the original token still only ever creates its own account.
        response = self.client.post("/api/auth/otp/register", json={
            "registration_token": token, "role": "owner",
            "full_name": "Right Number", "district": "Pune",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["user"]["mobile_e164"], f"+91{self.mobile}")

    def test_17_registration_token_expires(self):
        token = self._verified_token()
        with mock.patch.object(app_module.time, "time",
                               return_value=time.time() + app_module.REGISTRATION_TOKEN_TTL_SECONDS + 5):
            response = self.client.post("/api/auth/otp/register", json={
                "registration_token": token, "role": "owner",
                "full_name": "Too Late", "district": "Pune",
            })
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["code"], "REGISTRATION_TOKEN_INVALID")
        self.assertEqual(self._user_count(f"+91{self.mobile}"), 0)

    def test_18_a_tampered_token_is_rejected(self):
        token = self._verified_token()
        payload, _, signature = token.rpartition(".")
        tampered = f"{payload}.{signature[:-2]}{'00' if not signature.endswith('00') else '11'}"
        response = self.client.post("/api/auth/otp/register", json={
            "registration_token": tampered, "role": "owner",
            "full_name": "Tampered", "district": "Pune",
        })
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["code"], "REGISTRATION_TOKEN_INVALID")

    def test_19_existing_number_logs_in_instead_of_creating_a_duplicate(self):
        """Signup for a number that already has an account must not fork it."""
        token = app_module._issue_registration_token(f"+91{VET_MOBILE}")
        before = self._user_count(f"+91{VET_MOBILE}")
        response = self.client.post("/api/auth/otp/register", json={
            "registration_token": token, "role": "owner",
            "full_name": "Impostor Farmer", "district": "Pune",
        })
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertFalse(body["registered"])
        self.assertEqual(body["user"]["role"], "vet")
        self.assertEqual(body["user"]["full_name"], self.users["vet"]["full_name"])
        self.assertEqual(self._user_count(f"+91{VET_MOBILE}"), before)

    def test_20_a_second_signup_for_the_same_number_is_refused(self):
        first = self.client.post("/api/auth/otp/register", json={
            "registration_token": self._verified_token(), "role": "owner",
            "full_name": "First Farmer", "district": "Pune",
        })
        self.assertEqual(first.status_code, 201)
        second_token = app_module._issue_registration_token(f"+91{self.mobile}")
        second = self.client.post("/api/auth/otp/register", json={
            "registration_token": second_token, "role": "owner",
            "full_name": "Second Farmer", "district": "Pune",
        })
        self.assertEqual(second.status_code, 200)
        self.assertFalse(second.get_json()["registered"])
        self.assertEqual(second.get_json()["user"]["full_name"], "First Farmer")
        self.assertEqual(self._user_count(f"+91{self.mobile}"), 1)

    def test_21_mobile_numbers_are_stored_normalized_and_unique(self):
        self.client.post("/api/auth/otp/register", json={
            "registration_token": self._verified_token(), "role": "owner",
            "full_name": "Normalized", "district": "Pune",
        })
        conn = database.get_db()
        indexes = {row["name"] for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='users'").fetchall()}
        duplicates = conn.execute(
            "SELECT mobile_e164, COUNT(*) c FROM users WHERE mobile_e164 IS NOT NULL "
            "GROUP BY mobile_e164 HAVING c > 1").fetchall()
        conn.close()
        self.assertIn("idx_users_mobile_e164_unique", indexes)
        self.assertEqual(duplicates, [])

    def test_22_new_accounts_get_an_unusable_password_credential(self):
        self.client.post("/api/auth/otp/register", json={
            "registration_token": self._verified_token(), "role": "owner",
            "full_name": "No Password", "district": "Pune",
        })
        conn = database.get_db()
        row = conn.execute("SELECT password_hash, salt FROM users WHERE mobile_e164=?",
                           (f"+91{self.mobile}",)).fetchone()
        conn.close()
        # The NOT NULL columns are kept, but nothing can authenticate with them.
        self.assertTrue(row["password_hash"] and row["salt"])
        for guess in ("password123", "", "password", "123456", "Password1"):
            self.assertFalse(database.verify_password(guess, row["salt"], row["password_hash"]))


# ==========================================================================
# 3. OTP security controls on the role-aware endpoints
# ==========================================================================
class TestOtpSecurity(MobileOtpAuthTestCase):
    def test_30_wrong_otp_is_rejected_and_the_correct_one_still_works(self):
        code = self.issue(VET_MOBILE)
        wrong = "000000" if code != "000000" else "111111"
        response = self.verify_otp(wrong, VET_MOBILE)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["code"], "OTP_INVALID")
        self.assertNotIn("token", response.get_json())
        self.assertEqual(self.verify_otp(code, VET_MOBILE).status_code, 200)

    def test_31_expired_otp_is_rejected(self):
        code = self.issue(VET_MOBILE)
        self._force_expiry("+91" + VET_MOBILE)
        response = self.verify_otp(code, VET_MOBILE)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["code"], "OTP_EXPIRED")

    def test_32_a_used_otp_cannot_be_replayed(self):
        code = self.issue(VET_MOBILE)
        self.assertEqual(self.verify_otp(code, VET_MOBILE).status_code, 200)
        replay = self.verify_otp(code, VET_MOBILE)
        self.assertEqual(replay.status_code, 401)
        self.assertEqual(replay.get_json()["code"], "OTP_ALREADY_USED")

    def test_33_attempt_limit_locks_the_otp(self):
        code = self.issue(VET_MOBILE)
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(5):
            self.verify_otp(wrong, VET_MOBILE)
        locked = self.verify_otp(code, VET_MOBILE)
        self.assertEqual(locked.status_code, 429)
        self.assertEqual(locked.get_json()["code"], "OTP_LOCKED")

    def test_34_malformed_otps_are_rejected_before_any_lookup(self):
        self.issue(VET_MOBILE)
        for bad in ("12345", "abcdef", "", "1234567", None):
            response = self.verify_otp(bad, VET_MOBILE)
            self.assertEqual(response.status_code, 400, bad)
            self.assertEqual(response.get_json()["code"], "INVALID_OTP_FORMAT")

    def test_35_rate_limited_requests_are_reported_with_a_retry_hint(self):
        with mock.patch.dict(os.environ, {"OTP_MOBILE_MAX_REQUESTS": "2"}):
            self.request_otp(NEW_OWNER_MOBILE)
            self.request_otp(NEW_OWNER_MOBILE)
            limited = self.request_otp(NEW_OWNER_MOBILE)
        self.assertEqual(limited.status_code, 429)
        body = limited.get_json()
        self.assertEqual(body["code"], "RATE_LIMITED")
        self.assertIn("retry_after", body)
        self.assertNotIn("token", body)

    def test_36_resend_cooldown_is_enforced(self):
        with mock.patch.dict(os.environ, {"OTP_RESEND_COOLDOWN_SECONDS": "60"}):
            self.assertEqual(self.request_otp(NEW_OWNER_MOBILE).status_code, 200)
            cooled = self.resend_otp(NEW_OWNER_MOBILE)
        self.assertEqual(cooled.status_code, 429)
        body = cooled.get_json()
        self.assertEqual(body["code"], "COOLDOWN_ACTIVE")
        self.assertGreater(body["retry_after"], 0)

    def test_37_a_new_otp_invalidates_the_previous_one(self):
        first = self.issue(NEW_OWNER_MOBILE)
        second = self.issue(NEW_OWNER_MOBILE)
        self.assertNotEqual(first, second)
        superseded = self.verify_otp(first, NEW_OWNER_MOBILE)
        self.assertEqual(superseded.status_code, 401)
        self.assertEqual(superseded.get_json()["code"], "OTP_INVALID")
        self.assertEqual(self.verify_otp(second, NEW_OWNER_MOBILE).status_code, 200)

    def test_38_an_otp_for_one_number_does_not_work_for_another(self):
        code = self.issue(OWNER_MOBILE)
        response = self.verify_otp(code, VET_MOBILE)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["code"], "OTP_INVALID")

    def test_39_unknown_and_known_numbers_get_an_identical_request_response(self):
        known = self.request_otp(OWNER_MOBILE).get_json()
        self.gateway.messages.clear()
        unknown = self.request_otp(NEW_OWNER_MOBILE).get_json()
        self.assertEqual(known.keys(), unknown.keys())
        self.assertEqual(known["message"], unknown["message"])
        self.assertIs(known["delivery_confirmed"], False)
        self.assertIs(unknown["delivery_confirmed"], False)
        # Neither response leaks whether the number has an account.
        for body in (known, unknown):
            self.assertNotIn("registered", str(body["message"]).replace("can receive", ""))
            self.assertNotIn("pre_account", body)

    def test_40_the_request_response_never_claims_delivery(self):
        body = self.request_otp(OWNER_MOBILE).get_json()
        self.assertIs(body["delivery_confirmed"], False)
        self.assertNotIn("delivered", body["message"].lower())
        self.assertIn("submitted to the SMS gateway", body["message"])
        # The OTP itself never leaves the server.
        self.assertNotIn(self.gateway.last_code, str(body))

    def test_41_no_otp_or_secret_is_written_to_the_audit_trail(self):
        code = self.issue(OWNER_MOBILE)
        self.verify_otp(code, OWNER_MOBILE)
        conn = database.get_db()
        audit = str([dict(r) for r in conn.execute(
            "SELECT * FROM audit_events ORDER BY id DESC LIMIT 20").fetchall()])
        otp_rows = str([dict(r) for r in conn.execute("SELECT * FROM otp_codes").fetchall()])
        conn.close()
        for rendered in (audit, otp_rows):
            self.assertNotIn(code, rendered)
            self.assertNotIn("test-pass", rendered)
        # The audit trail masks recipients. (``otp_request_log.mobile_e164``
        # keeps the full number by design — it is the per-mobile rate-limit key
        # and is never returned by any endpoint.)
        self.assertNotIn("+919800000001", audit, "audit recipients must be masked")
        self.assertIn("******0001", audit)

    def test_42_sms_gateway_failure_is_reported_as_a_failure(self):
        self.gateway.fail_with = "SMS_GATEWAY_UNAVAILABLE"
        response = self.request_otp(OWNER_MOBILE)
        self.assertEqual(response.status_code, 502)
        body = response.get_json()
        self.assertEqual(body["code"], "SMS_GATEWAY_UNAVAILABLE")
        self.assertNotIn("ok", body, "a failed dispatch must never look accepted")
        # The unusable code is retired, so it cannot be verified later.
        row = self._row("+919800000001")
        self.assertEqual(row["status"], "SEND_FAILED")
        self.assertIsNotNone(row["send_error_code"])

    def test_43_unusable_gateway_is_a_503_that_does_not_mention_passwords(self):
        with mock.patch.object(otp_service, "otp_login_available", return_value=False), \
                mock.patch.object(app_module, "otp_login_available", return_value=False):
            response = self.request_otp(OWNER_MOBILE)
        self.assertEqual(response.status_code, 503)
        body = response.get_json()
        self.assertIn(body["code"], ("SMS_GATEWAY_NOT_CONFIGURED", "OTP_PEPPER_UNSTABLE"))
        self.assertIs(body["password_fallback_enabled"], False)
        self.assertNotIn("password", body["error"].lower())

    def test_44_missing_or_invalid_mobile_is_rejected(self):
        for payload in ({}, {"mobile": ""}, {"mobile": "12345"}, {"mobile": "abcdefghij"}):
            response = self.client.post("/api/auth/otp/request", json=payload)
            self.assertEqual(response.status_code, 400, payload)
            self.assertEqual(response.get_json()["code"], "INVALID_MOBILE")
        self.assertEqual(self.gateway.messages, [])


# ==========================================================================
# 4. Password authentication is gone
# ==========================================================================
class TestPasswordAuthRemoved(MobileOtpAuthTestCase):
    def test_50_password_login_is_gone_for_every_seeded_account(self):
        for mobile, role in ROLE_BY_MOBILE.items():
            user = self.users[role]
            for identifier in (user["email"], mobile):
                response = self.client.post("/api/auth/login",
                                            json={"identifier": identifier,
                                                  "password": DEMO_PASSWORD})
                self.assertEqual(response.status_code, 410, identifier)
                body = response.get_json()
                self.assertEqual(body["code"], "PASSWORD_AUTH_REMOVED")
                self.assertEqual(body["login_method"], "mobile_otp")
                self.assertNotIn("token", body)

    def test_51_the_login_route_is_closed_for_get_too(self):
        self.assertEqual(self.client.get("/api/auth/login").status_code, 410)
        self.assertEqual(self.client.get("/api/auth/register").status_code, 410)

    def test_52_password_signup_is_gone_and_creates_nothing(self):
        response = self.client.post("/api/auth/register", json={
            "full_name": "Legacy Signup", "mobile": "9111222333",
            "email": "legacy-signup@example.com", "password": "secret12",
            "confirm_password": "secret12", "role": "govt", "district": "Pune",
        })
        self.assertEqual(response.status_code, 410)
        self.assertEqual(response.get_json()["code"], "PASSWORD_AUTH_REMOVED")
        self.assertEqual(self._user_count("+919111222333"), 0)
        conn = database.get_db()
        created = conn.execute(
            "SELECT COUNT(*) c FROM users WHERE email='legacy-signup@example.com'"
        ).fetchone()["c"]
        conn.close()
        self.assertEqual(created, 0)

    def test_53_no_password_field_is_accepted_anywhere_in_the_auth_api(self):
        """A password (or a role override) in the body must not open a side door."""
        code = self.issue(OWNER_MOBILE)
        # verify: a valid OTP still logs in, but the smuggled role is ignored.
        verify = self.client.post("/api/auth/otp/verify", json={
            "mobile": OWNER_MOBILE, "otp": code,
            "password": DEMO_PASSWORD, "role": "govt",
        })
        self.assertEqual(verify.status_code, 200)
        self.assertEqual(verify.get_json()["user"]["role"], "owner")
        self.assertEqual(verify.get_json()["user"]["id"], self.users["owner"]["id"])
        # register: the same trick on a provisioned role is still refused.
        fresh = self.fresh_mobile()
        response = self.client.post("/api/auth/otp/register", json={
            "registration_token": app_module._issue_registration_token(f"+91{fresh}"),
            "role": "govt", "password": DEMO_PASSWORD, "confirm_password": DEMO_PASSWORD,
            "full_name": "Side Door", "district": "Pune",
        })
        self.assertEqual(response.status_code, 403)
        self.assertNotIn("token", response.get_json())
        self.assertEqual(self._user_count(f"+91{fresh}"), 0)

    def test_54_public_responses_never_expose_credentials(self):
        token = self.login(OWNER_MOBILE).get_json()["token"]
        bodies = [
            self.client.get("/api/users/me", headers=self.auth(token)).get_json(),
            self.client.get("/api/auth/otp/config").get_json(),
            self.client.get("/api/health").get_json(),
        ]
        rendered = str(bodies)
        user = self.users["owner"]
        self.assertNotIn(user["password_hash"], rendered)
        self.assertNotIn(user["salt"], rendered)
        self.assertNotIn("password_hash", rendered)
        self.assertNotIn("test-pass", rendered)

    def test_55_health_reports_otp_only_authentication(self):
        body = self.client.get("/api/health").get_json()
        self.assertEqual(body["authentication"]["method"], "mobile_otp")
        self.assertIs(body["authentication"]["password_auth_enabled"], False)
        self.assertEqual(body["authentication"]["self_register_roles"], ["owner"])
        self.assertIs(body["farmer_otp_login"]["password_fallback_enabled"], False)


# ==========================================================================
# 5. Migration & data preservation
# ==========================================================================
class TestMigrationAndPreservation(MobileOtpAuthTestCase):
    def test_60_existing_accounts_are_normalized_without_losing_data(self):
        conn = database.get_db()
        missing = conn.execute(
            "SELECT COUNT(*) c FROM users WHERE mobile_e164 IS NULL OR mobile_e164=''"
        ).fetchone()["c"]
        seeded = conn.execute(
            "SELECT full_name, email, role, mobile, mobile_e164 FROM users WHERE is_seed=1"
        ).fetchall()
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
        conn.close()
        self.assertEqual(missing, 0)
        self.assertGreaterEqual(len(seeded), 5)
        for row in seeded:
            self.assertEqual(row["mobile_e164"], f"+91{row['mobile'][-10:]}")
            # Legacy credential columns are retained, not dropped.
            self.assertIn("password_hash", columns)
            self.assertIn("salt", columns)
            self.assertIn("email", columns)

    def test_61_an_account_migrated_from_email_password_logs_in_by_otp(self):
        """Simulate a pre-OTP account: legacy mobile + password, no e164."""
        conn = database.get_db()
        pw_hash, salt = database.hash_password("legacy-password")
        conn.execute(
            "INSERT INTO users (full_name, mobile, email, password_hash, salt, role, "
            "district, is_seed) VALUES (?,?,?,?,?,?,?,0)",
            ("Migrated Farmer", "9611112222", "migrated@example.com", pw_hash, salt,
             "owner", "Pune"),
        )
        conn.commit()
        conn.close()
        # The backfill that runs on boot normalizes it.
        conn = database.get_db()
        database.ensure_mobile_e164_backfill(conn)
        row = conn.execute("SELECT mobile_e164 FROM users WHERE mobile='9611112222'").fetchone()
        conn.close()
        self.assertEqual(row["mobile_e164"], "+919611112222")

        response = self.login("9611112222")
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertEqual(response.get_json()["user"]["full_name"], "Migrated Farmer")
        # Its password no longer authenticates anything.
        self.assertEqual(
            self.client.post("/api/auth/login",
                             json={"identifier": "migrated@example.com",
                                   "password": "legacy-password"}).status_code, 410)

    def test_62_otp_tables_accept_a_pre_account_code(self):
        self.issue(NEW_OWNER_MOBILE)
        row = self._row(f"+91{NEW_OWNER_MOBILE}")
        self.assertIsNone(row["user_id"])
        self.assertIsNone(row["role"])
        self.assertEqual(row["purpose"], "mobile_auth")
        # And the migration is re-runnable.
        conn = database.get_db()
        database.ensure_otp_tables(conn)
        database.ensure_otp_tables(conn)
        conn.close()

    def test_63_existing_farmer_data_still_works_after_an_otp_login(self):
        token = self.login(OWNER_MOBILE).get_json()["token"]
        headers = self.auth(token)
        animals = self.client.get("/api/animals", headers=headers)
        herds = self.client.get("/api/herds", headers=headers)
        cases = self.client.get("/api/cases", headers=headers)
        self.assertEqual(animals.status_code, 200)
        self.assertGreater(len(animals.get_json()), 0)
        self.assertEqual(herds.status_code, 200)
        self.assertGreater(len(herds.get_json()), 0)
        self.assertEqual(cases.status_code, 200)

    def test_64_existing_role_dashboards_still_answer_their_own_role(self):
        checks = {
            "vet": ["/api/vet/summary", "/api/cases", "/api/campaigns"],
            "govt": ["/api/govt/analytics", "/api/govt/geo"],
            "lab": ["/api/lab/summary", "/api/lab/reports"],
            "owner": ["/api/owner/summary", "/api/animals", "/api/prescriptions"],
        }
        for mobile, role in ROLE_BY_MOBILE.items():
            token = self.login(mobile).get_json()["token"]
            for path in checks[role]:
                response = self.client.get(path, headers=self.auth(token))
                self.assertEqual(response.status_code, 200, f"{role} {path}")

    def test_65_the_farmer_endpoints_still_work_and_stay_farmer_only(self):
        response = self.client.post("/api/auth/farmer/request-otp",
                                    json={"mobile": OWNER_MOBILE})
        self.assertEqual(response.status_code, 200)
        verified = self.client.post("/api/auth/farmer/verify-otp",
                                    json={"mobile": OWNER_MOBILE,
                                          "otp": self.gateway.last_code})
        self.assertEqual(verified.status_code, 200)
        self.assertEqual(verified.get_json()["user"]["role"], "owner")
        # A farmer-purpose OTP is never issued to another role's number.
        self.assertEqual(
            self.client.post("/api/auth/farmer/request-otp",
                             json={"mobile": VET_MOBILE}).status_code, 200)
        self.assertEqual(self.gateway.messages[-1]["to"], "+919800000001",
                         "no SMS may be dispatched for the vet number")
        rejected = self.client.post("/api/auth/farmer/verify-otp",
                                    json={"mobile": VET_MOBILE, "otp": "123456"})
        self.assertEqual(rejected.status_code, 401)

    def test_66_staff_login_otp_cannot_reach_the_farmer_purpose_and_back(self):
        """Purposes are isolated: a staff OTP row is not a farmer OTP row."""
        self.issue(VET_MOBILE)
        farmer_row = self._row(f"+91{VET_MOBILE}", otp_service.PURPOSE_FARMER_LOGIN)
        self.assertIsNone(farmer_row)
        unified = self._row(f"+91{VET_MOBILE}", otp_service.PURPOSE_MOBILE_AUTH)
        self.assertIsNotNone(unified)


if __name__ == "__main__":
    unittest.main(verbosity=2)
