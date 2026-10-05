# Pashu-Shield — Web Calling Audit (Farmer ↔ Veterinarian) — 2026-10-05

**Repo:** `h6362794-sketch/Pashu-Shield-updated` · branch `arena/01a10a4f-pashu-shield-updated` (base `9777ae1860`)  
**Inspector:** Arena AI Agent · **Date (UTC):** 2026-10-05

---

## 0) One-line verdict

**The in-app WebRTC calling implementation is architecturally correct and passes all automated rungs** — zero logic regressions.  
It **WILL fail for real users** until 4 operational gaps are closed (TURN, VAPID, WSS origin, single-worker). 2 UX gaps then decide whether the farmer/vet *understand* why a call didn't connect.

| Rung | Command | Result (this repo, 2026-10-05) | What it proves |
|------|---------|-------------------------------|----------------|
| 1 Backend FSM/routing/auth/presence/signaling | `cd backend && rm -f test_webcalling.db* && python3 -m unittest test_webcalling` | **47/47 ✅** | AuthZ, routing (`district_language_load_v1`), atomic single-answer, FSM timestamps, lease expiry, durable signals, history, push dispatch |
| 2 Client unit (no browser) | `node --test frontend/tests/webcall_ui.test.mjs` | **15/15 ✅** | Socket open (WebSocket-first), popup+ringtone, decline→stop ringtone, answer→mic+`track.enabled` mute, `connected` only after `pc.connected`, PC teardown, signal ordering/dedupe, REST backfill, mic denial |
| 2b Full portal client suite | `node --test frontend/tests/*.test.mjs` | **41 pass / 0 fail / 2 skipped** | The 2 skips are the Playwright browser rung (no Chromium in this image) — expected |
| 3 Real two-peer WebRTC (node-webrtc) | `node backend/tests/webrtc/two_peer_call.mjs` | **Implemented, not executed here** — requires `@roamhq/wrtc` + live backend + demo accounts | Bidirectional RTP + decoded frames both ways, `relay`→`relay` when TURN forced |
| 4 Two real browsers (Playwright) | `node --test frontend/tests/webcall_browser.test.mjs` | **Implemented, not executed here** — requires Chromium | Real `getUserMedia`, popup, ringtone, mute badge, hang-up stops mic indicator |

> `WEB_CALLING.md` §7/§8 records the same 47/47 + 41/43 numbers and the measured `gthread --workers 1 --threads 100` vs `--workers 2` failure (0/6 `call:incoming` delivered). Nothing in this branch changed that.

---

## 1) Farmer side — does it work?

| Check | File:line | Result | Note |
|-------|-----------|--------|------|
| **Dashboard entry point** | `frontend/app.js:2228` `ownerDashboard()` → `#/owner/webcall` card + `frontend/call.js:ownerCallViewHtml()` | ✅ | Action card on owner dashboard routes to `#/owner/webcall`; i18n exists in en/mr/hi/te |
| **Call creation auth & routing** | `backend/app.py:POST /api/webcall/calls` → `backend/webcalling.py:create_call()` | ✅ | Identity/region read from DB via JWT, never from body. Hard filters: AVAILABLE + live lease + language + not busy (web/IVR). Scoring: same-district +100, block +20, prior case +35, etc. |
| **Mic pre-flight before creating the call record** | `frontend/call.js:startFarmerCallFlow()` → `getMicrophone()` before `POST /webcall/calls` | ✅ | Denied/missing mic surfaces `webcall.mic_denied` / `mic_missing` and never creates a DB row |
| **Signaling (fast+ durable)** | `frontend/call.js:WebCallSession` + `backend/realtime.py:_on_signal()` + `GET /api/webcall/calls/<id>/signals` | ✅ | Every `offer/answer/ice` persisted to `web_call_signals` before emit; REST `?after=` backfills gaps across workers / refreshes. `signalFloorId` + `SIGNAL_REORDER_MS=30` |
| **Connected = real media** | `frontend/call.js:onMediaConnected()` → `sampleInboundAudio()` → `POST /connected {media_confirmed}` + `backend/webcalling.py:mark_connected()` | ✅ | `RTCPeerConnection.connectionState === "connected"` + inbound-RTP packets >0 before `connected_at` written; server keeps its own timestamp |
| **Hang-up / cancel / reconnect** | `endCall/cancelCall/expire_stale_calls + reconcileCurrentCall()` | ✅ | Ringing→`cancelled`, live→`ended`, 45 s ring timeout→`expired`, abandoned 45 min→`failed`; reconnect via `GET /api/webcall/calls/current` |
| **History scoping** | `backend/webcalling.py:list_history()` + `frontend/call.js:renderCallHistory()` | ✅ | Owner sees own, vet sees assigned, govt sees all; contact withheld from govt |

**Farmer-side blockers (not code bugs — missing prod wiring):**

1. **Language mismatch looks like "nothing happened"** — if no vet speaks the farmer's `preferred_language`, `choose_veterinarian()` returns `skipped: LANGUAGE_NOT_SUPPORTED` and the API returns `200 {outcome:"unavailable"}` with a truthful message, but the owner call view does not pre-check availability before enabling **Start call**. User sees a summary card after the POST instead of a disabled state + helpline CTA.
2. **No upfront TURN warning** — `/api/health` → `web_calling.ice.turn_configured: false` when `SIH_TURN_URLS`/`SIH_TURN_SECRET` empty. Farmer can still start a call; it will later `failed` with `MEDIA_CONNECTION_FAILED` only after the vet answers. Honest, but not proactive.

---

## 2) Veterinarian side — does it work?

| Check | File:line | Result | Note |
|-------|-----------|--------|------|
| **Availability + presence separation** | `backend/webcalling.py:_vet_rows()` + `vet_presence` lease (60 s) + `backend/realtime.py:presence:heartbeat` every 20 s + `GET /api/vet/availability` | ✅ code, ⚠️ UX | `AVAILABLE` is explicit (stored in `vet_availability`), liveness is a lease refreshed by the socket. Correct design — a closed browser expires without a stale flag. **UX gap:** vet dashboard renders *two* availability UIs: the helpline card (ids `vetAvailabilityStatus`) and the web-call card (`pmVetCallHost` from `PMCall.mountVetCard()`). Both `PUT /api/vet/availability` to the same row. A vet who only uses the top card still becomes routable — but if the socket is blocked (firewall, CORS), the lease expires in 60 s and routing skips with `NO_LIVE_SESSION` while the badge still says `AVAILABLE`. No single "You are live / you are not live" truth. |
| **Incoming call delivery (live tab)** | `backend/realtime.py:emit_to_user("call:incoming")` → `frontend/call.js:handleIncomingCall()` | ✅ | Private room `user:<id>`, never broadcast. Measured 4/4 delivered (gthread 1×100) vs 0/6 with 2 sync workers |
| **Incoming call delivery (background tab)** | `backend/webcalling.py:dispatch_incoming_call_push()` + `frontend/sw.js: push` | ⚠️ wired, **disabled in prod** | Needs `VAPID_PUBLIC_KEY/PRIVATE_KEY/CLAIM_EMAIL` (render.yaml `sync:false`). Without it `is_push_configured()==false`; `GET /api/health → push_configured:false`. Vet gets no OS notification when tab backgrounded. |
| **Ringtone lifecycle** | `frontend/call.js:createRingtone()` (WebAudio two-tone burst/3 s) | ✅ | Starts on `handleIncomingCall`, `blocked` reported if autoplay denied, `stop()` on every terminal state (`rejected/cancelled/expired/missed/busy/failed/ended`). Tested in `webcall_ui.test.mjs`. |
| **Answer is atomic** | `backend/webcalling.py:accept_call()` + `_transition(... WHERE status IN ('ringing'))` + partial unique indexes `uq_web_calls_active_vet/caller` | ✅ | Two simultaneous `POST /accept` → one 200, one 409 `state_conflict`. Idempotent retry for same vet. |
| **Media + mute** | `pc.addTrack(mic) / track.enabled` + `socket "call:mute"` | ✅ | Real mute, not a label; peer shows badge from `peerMuteChanged`. Verified in client test "mute really disables the outgoing track". |
| **Teardown** | `WebCallSession.teardown()` | ✅ | Stops every `MediaStreamTrack`, `pc.close()`, detaches `<audio>`, clears poll/stats/ring timers, `state.ringtone.stop()` |

**Vet-side blockers (same 4 as farmer + 1 vet-specific):**

1. **Socket never connects on split deployment** — `frontend/vercel.json` rewrites `/api/*` to `https://pashu-shield-backend-hjgr.onrender.com` but **cannot proxy WebSocket upgrades**. `frontend/call.js:signalingUrl()` returns `cfg.signaling.url` which is `SIH_PUBLIC_BACKEND_URL` (render.yaml `sync:false` → empty by default). When empty, `io()` connects same-origin → Vercel → 400 upgrade. When set but `SIH_ALLOWED_ORIGINS` does not list the exact origin (Vercel preview URLs are `https://pashu-mitra-smoky-*.vercel.app`), handshake rejected by `realtime.py:allowed_origins()` CORS check. Symptom: `pmCallLinkBadge` stays "Web calls offline", presence lease never refreshed, no `call:incoming` — but the REST fallback still polls every 4 s in background, so vet may see call with ~4 s delay.
2. **Multi-worker kills instant delivery** — `render.yaml:startCommand` correctly pins `gthread --workers 1 --threads 100`. If anyone raises `SIH_GUNICORN_WORKERS>1` without `SIH_REDIS_URL`, `deploy_check.mjs` proves 0/6 incoming events. The code logs a warning (`_multi_worker_warning`) but does not refuse to start — easy to miss in Render logs.

---

## 3) What is *honestly* not guaranteed (by design, documented)

* Ringing with browser fully closed / offline / notifications denied / OS battery saver → impossible for a plain website (needs native app or PSTN). Push narrows but does not close the gap. `sw.js` states this.
* TURN relay without a TURN server → `relay` candidates absent; cross-NAT calls fail with `could not connect` instead of fake "Connected". `WEB_CALLING.md` blocker #1.
* Web call ≠ phone call — no PSTN/DTMF/bridging; `voice/asterisk/*.example` remains the only PSTN path.

---

## 4) Copy-paste FIX PROMPT (paste this into any capable code agent / LLM)

> The block below is a **single self-contained prompt**. Paste it verbatim — it contains repo, branch, files, constraints and the exact verification ladder.

```markdown
You are a senior full-stack engineer working on the cloned repo `h6362794-sketch/Pashu-Shield-updated`
branch `arena/01a10a4f-pashu-shield-updated` (do all work on that branch, push only to it).
Your working directory is `/home/user/Pashu-Shield-updated`. Do NOT rename/move the repo root or its `.git` dir.

## CONTEXT — what exists
PashuMitra already has a production-grade in-app WebRTC calling feature (farmer portal ↔ vet portal).

Key files (read them before changing anything):
- `WEB_CALLING.md` (architecture + verification ladder + blockers)
- `backend/webcalling.py` (FSM, routing `district_language_load_v1`, presence lease 60s, durable signals, history)
- `backend/realtime.py` (Flask-SocketIO wss, JWT handshake, private rooms `user:<id>`, sweeper)
- `backend/turn_config.py` (STUN + coturn REST ephemeral creds `HMAC-SHA1`, fallback static)
- `backend/app.py` (`/api/webcall/*` routes, `/api/health` `web_calling` block, `init_realtime()`)
- `backend/database.py` (`SCHEMA_WEBCALL` + `ensure_webcall_tables()` → web_calls/web_call_events/web_call_signals/vet_presence, partial unique indexes)
- `frontend/call.js` (real RTCPeerConnection, ringtone WebAudio, signal ordering/dedupe, REST backfill, mute via `track.enabled`)
- `frontend/app.js` (roles owner/vet/govt/lab, `ownerDashboard` call card → `#/owner/webcall`, `vetDashboard` → `#pmVetCallHost`, routes `#/owner/webcall` `#/owner/calls` `#/vet/calls`, i18n en/mr/hi/te)
- `frontend/index.html` (loads `vendor/socket.io.min.js` then `call.js` after `app.js`)
- `frontend/sw.js` (v7, caches `call.js`+vendor, `/api/webcall/*` never cached, `push`→`incoming_call` + `notificationclick`)
- `render.yaml` (gthread 1×100 is required; SIH_* env vars), `frontend/vercel.json` (rewrite `/api/*` to Render — NOTE: Vercel rewrites cannot proxy WSS)

Automated rungs that MUST stay green after your changes:
1) `cd backend && rm -f test_webcalling.db* && python3 -m unittest test_webcalling` → 47/47 OK
2) `node --test frontend/tests/*.test.mjs` → 41 pass / 0 fail / 2 skipped (browser rung skips without Chromium)
3) Real two-peer WebRTC: `node backend/tests/webrtc/two_peer_call.mjs` (needs PM_WEBCALL_URL + vet creds + demo/mobile OTP) → PASS with inbound RTP + decoded frames both ways
4) Two browsers: `node --test frontend/tests/webcall_browser.test.mjs` (needs Playwright) → PASS with `media_confirmed`
Plus: `node backend/tests/deploy/deploy_check.mjs` with PM_WEBCALL_URL → 22 checks PASS, especially “vet socket received call:incoming”

## OBJECTIVE
Make farmer-initiated web calling **reliably work end-to-end** for both roles in a split deployment (Vercel static frontend + Render Flask backend) and on mobile carrier/CGNAT networks, without breaking anything that already passes.

“Working properly” means ALL of:
- Farmer sees Call a Veterinarian on `#/owner/dashboard`, opens `#/owner/webcall`, picks language/reason/note, pre-flight mic succeeds, creates a call that is routed ONLY to an AVAILABLE + lease-live + language-matching + not-busy vet, sees “Ringing {vetname}…” and can Cancel.
- Vet on `#/vet/dashboard` sees ONE truthful availability/presence card, sets AVAILABLE + languages ONCE, sees badge Online/Offline that matches the actual lease, receives an isolated popup+looping ringtone (with “sound blocked → tap” when autoplay denied) within 1s, with caller name/village/district/case/language/reason and a ring-elapsed countdown, and can Answer (which creates a peer connection, exchanges offer/answer/ICE through the server, proves `connected` + inbound RTP, starts a timer, supports Mute/Unmute that flips `track.enabled`) or Decline. Push OS notification works when tab is backgrounded (if VAPID configured).
- Either side Hang up / Decline / no-answer timeout (45s) / busy vet → honest terminal state (`rejected/cancelled/expired/missed/busy/failed/ended`) with ringtone stopped, mic indicator gone, duration recorded, visible in both histories and NOT visible to an unrelated farmer; govt sees counts only.
- A refresh mid-call reconciles via `GET /api/webcall/calls/current` + signal backfill and either restores audio or reports an honest failure — never a fake “Connected”.

## CONSTRAINTS (violations cause rejection)
- Do NOT replace Flask-SocketIO with PeerJS / third-party signaling service / random Peer IDs. Keep one signaling stack: Flask-SocketIO `simple-websocket` threading.
- Do NOT store routing decisions in localStorage, fake “Connected”, use `simulateIVR()`, or add a global `currentCall`.
- Do NOT touch IVR/PSTN helpline: `backend/ivr_service.py`, `voice/asterisk/*`, `/api/ivr/*`, helpline number `7382210251` remain unchanged. Web call is an additional `web` channel.
- Do NOT introduce a second push system; reuse `push_subscriptions` + `push_service.py` + existing `sw.js`.
- Keep JWT as the only identity source: caller id/role/region/language from `g.user` + `users` row, never from request body. Keep atomic `compare-and-set` answer and partial unique indexes.
- Keep `call.js` loaded as a plain script after `app.js` (no bundler, no framework). Keep `vendor/socket.io.min.js` vendored.
- Keep `render.yaml` startCommand as `gthread --workers 1 --threads 100` unless `SIH_REDIS_URL` is set; the multi-worker failure is measured (0/6 events). If you change it, update `WEB_CALLING.md` + the warning in `realtime.py`.
- Never log or return TURN credentials, tokens, or signaling payloads. `/api/health` and `describe()` stay secret-free.

## KNOWN GAPS TO CLOSE (root-caused to file:line)
1) **WSS never connects on split deployment** — `realtime.py:allowed_origins()` only lists `SIH_ALLOWED_ORIGINS` + localhost. Vercel preview origins are dynamic; `SIH_PUBLIC_BACKEND_URL` is `sync:false` (empty → same-origin → Vercel cannot proxy WSS). FIX: make `signalingUrl()` in `call.js` fall back to `window.location.origin` rewritten through `/api` only for REST, but for WSS always use an absolute `SIH_PUBLIC_BACKEND_URL`; make `allowed_origins()` accept the preview pattern or document that every Vercel domain (including `*.vercel.app`) must be added; surface a visible “Signaling offline — check SIH_PUBLIC_BACKEND_URL / SIH_ALLOWED_ORIGINS” banner when `socket `connect_error`` persists >10s (do not silently rely on the 4s REST poll).
2) **Mobile/CGNAT calls fail** — `turn_config.py:turn_mode()=="none"` when `SIH_TURN_URLS`/`SIH_TURN_SECRET` unset; `GET /api/health {web_calling.ice.turn_configured:false}`. FIX: provision a coturn (or managed TURN) and set `SIH_TURN_URLS`+`SIH_TURN_SECRET` on Render; keep `ice_servers(user_id)` minting short-lived `base64(HMAC-SHA1)` creds; add a farmer-side pre-call warning when `turn_configured==false` (“calls may fail on mobile networks until a TURN server is configured”) and a `PM_EXPECT_TURN=1` check in `deploy_check.mjs`.
3) **Background ringing never shows** — `push_service.is_push_configured()==false` when `VAPID_*` unset; `backend/tools/vapid_keys.py` generates the pair but dashboard vars remain empty. FIX: generate with `python3 backend/tools/vapid_keys.py`, set `VAPID_PUBLIC_KEY/PRIVATE_KEY/CLAIM_EMAIL` on Render, re-deploy, have vet click “Enable call notifications” and verify `GET /api/push/vapid-key` + the `push_loopback_check.py` (VAPID sig + aes128gcm 410 pruning) passes; keep `TTL = ring_timeout` and `Urgency: high` in the push.
4) **Vet thinks they are available but are not routable** — two UI cards write the same row (`frontend/app.js:vetDashboard` top card + `frontend/call.js:mountVetCard` inside `#pmVetCallHost`). The lease expires 60s after the socket dies. FIX: collapse to ONE canonical card (keep the `pmVetCallHost` card, remove the duplicate top-card availability block OR make it read-only and drive it from `PMCall`). Show a single truth: `AVAILABLE + lease online → 🟢 Routable`, `AVAILABLE + lease stale → 🟡 Available but portal not live (reconnect)`, `OFFLINE/BUSY → 🔴 Not routable`. Show the exact `skipped_codes` from a test call (`GET /api/webcall/availability` + `listHistory`) so the farmer’s “No vet available” message maps to the vet’s view.
5) **Language surprise** — `choose_veterinarian()` hard-filters `language not in supported_languages`. FIX: on `#/owner/webcall` before enabling Start call, fetch `GET /api/webcall/availability` and show “No veterinarian for {language} is online — try {fallback} or helpline {number}”. Do not let the POST fail after mic permission was already granted.
6) **No loud deployment guard** — `realtime.py:_multi_worker_warning()` only warns. FIX: keep the warning, plus make `GET /api/health` report `web_calling.redis_message_queue + ice + ring_timeout + push_configured` and make `deploy_check.mjs` FAIL the deploy when `PM_EXPECT_TURN/PM_EXPECT_PUSH` mismatches, as already implemented. Document the required env var table in `WEB_CALLING.md` §5.

## SCOPE — files you may touch
- `backend/realtime.py`, `backend/turn_config.py`, `backend/webcalling.py`, `backend/app.py` (web_calling routes + health only), `backend/database.py` (only if migration is additive/idempotent)
- `frontend/call.js`, `frontend/app.js` (ownerDashboard/vetDashboard/cards), `frontend/style.css` (call card/hint only), `frontend/sw.js` (version bump + handlers)
- `render.yaml` (add env var docs, keep gthread), `frontend/vercel.json` (headers/rewrites for `call.js` and `vendor/*` already correct — verify)
- `WEB_CALLING.md` (update blockers & env table), `.env.example` (add placeholders)

## SCOPE — do NOT touch
- `backend/ivr_service.py`, `backend/ivr_security.py`, `backend/ivr_config.py`, `voice/asterisk/*`, any `/api/ivr/*` semantics
- `backend/otp_service.py`, `backend/sms_gateway.py`, `backend/demo_auth.py` (keep farmer OTP flow intact)
- `ml-backend/*` (AI service is independent)

## ACCEPTANCE CRITERIA (all must be true)
- `cd backend && rm -f test_webcalling.db* && python3 -m unittest test_webcalling` → 47/47 OK (or 47 minus only your new additive tests). Run also `test_regression test_role_auth test_demo_account test_farmer_otp_login test_all_features` → OK (helpline suite is pre-existing-failing at base, not required).
- `node --test frontend/tests/*.test.mjs` → 41 pass / 0 fail / 2 skipped (or more passes with your new tests; no new failures).
- With a local backend (`SIH_SECRET_KEY=dev-secret SIH_DB_PATH=/tmp/webcall.db DEMO_MODE=true python3 -c "from app import app, socketio; socketio.run(app, host='0.0.0.0', port=5001, allow_unsafe_werkzeug=True)"`) and VAPID keys set, `PM_WEBCALL_URL=http://127.0.0.1:5001 PM_VET_EMAIL=vet1@example.com PM_VET_PASSWORD=password123 node backend/tests/webrtc/two_peer_call.mjs` → PASS with non-zero packets + decoded frames both directions. With `SIH_ICE_TRANSPORT_POLICY=relay` and a local TURN (see `backend/tests/webrtc/local_turn_ephemeral.mjs`) both peers report `relay->relay`.
- In a real two-device manual test (one farmer phone on mobile data, one vet laptop on Wi-Fi, both HTTPS, TURN configured): vet Available+lease Online, farmer Start call → vet popup+ringtone <1s, Answer → both hear each other, mute badge correct, timer runs, hang-up stops mic indicator, history correct, refresh-mid-call reconciles. Record date/devices/networks/TURN used/both-directions audible.
- No fake “Connected” without `RTCPeerConnection.connected`; ringtone never survives a terminal state; no phone numbers leak to non-participants.

## DELIVERABLES
- Patched repo on `arena/01a10a4f-pashu-shield-updated` with the 6 gaps closed, tests still green.
- Updated `WEB_CALLING.md` §5 env table and §8 blockers to reflect the new state (TURN/VAPID provisioned or still pending).
- Console proof: paste the three commands’ outputs (backend 47, frontend 41/43, deploy_check 22) and, if possible, the two-peer WebRTC PASS lines.

## ENVIRONMENT NOTES
- Bind dev servers to `0.0.0.0`, not 127.0.0.1. Preview host is `https://{port}-{sandboxId}.e2b.app`; the app must accept that origin.
- Never delete/rename the repo root or `.git`. Keep generated artifacts out of Git (`node_modules/`, `*.db*` ignored).
- Use `git push origin arena/01a10a4f-pashu-shield-updated` when ready; open a PR from that branch if requested.
```

---

## 5) How to use it

1. Copy the entire fenced block above (from ````markdown`` to the closing ````).
2. Paste it as the **first message** in a new ChatGPT / Claude / Codex / Arena agent session that has this repo checked out.
3. The agent will read the cited files, fix the 6 gaps, and must paste the verification outputs before submitting.

*Tip:* If you paste into **this** Arena session, it will continue directly on `arena/01a10a4f-pashu-shield-updated` — just say “apply the fix prompt now” and it will start.

---

## 6) Quick remediation checklist if you are deploying manually today

- [ ] `python3 backend/tools/vapid_keys.py` → paste `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_CLAIM_EMAIL` into Render dashboard (backend service → Environment), re-deploy. Verify `curl -s https://pashu-shield-backend-hjgr.onrender.com/api/health | grep push_configured` → `true`.
- [ ] Provision coturn (`use-auth-secret`, `static-auth-secret`), set `SIH_TURN_URLS=turn:turn.example.org:3478` + `SIH_TURN_SECRET=<secret>` on Render, `SIH_ICE_TRANSPORT_POLICY=all` (or `relay` to force-test). Re-deploy. Verify `curl -s .../api/health | grep turn` → `turn_configured:true, turn_mode:ephemeral`.
- [ ] Set `SIH_PUBLIC_BACKEND_URL=https://pashu-shield-backend-hjgr.onrender.com` and `SIH_ALLOWED_ORIGINS=https://pashu-mitra-smoky.vercel.app,https://pashu-mitra-smoky-*.vercel.app` (add every preview domain) on Render. Re-deploy. Verify `GET /api/webcall/config` returns `signaling.url` == that URL and the vet badge turns 🟢 within 2 s.
- [ ] Keep `render.yaml` startCommand `gthread --workers 1 --threads 100 --timeout 120`. Do NOT raise workers without setting `SIH_REDIS_URL`.
- [ ] Vet: set **Available** + languages once, click **Enable call notifications**, confirm `Presence: ONLINE` and browser `🔔 Allowed`.
- [ ] Run `PM_WEBCALL_URL=https://pashu-shield-backend-hjgr.onrender.com PM_VET_EMAIL=… PM_VET_PASSWORD=… node backend/tests/deploy/deploy_check.mjs` → expect `PASS — 22 checks` and `call:incoming received`. If that fails, the worker model or CORS is still wrong.

---

*Generated from direct source inspection of `webcalling.py`, `realtime.py`, `turn_config.py`, `app.py`, `database.py`, `call.js`, `app.js`, `index.html`, `sw.js`, `vercel.json`, `render.yaml`, `WEB_CALLING.md`, `test_webcalling.py`, `webcall_ui.test.mjs`, `two_peer_call.mjs`, `deploy_check.mjs` and live `python -m unittest test_webcalling` + `node --test frontend/tests/webcall_ui.test.mjs`.*
