# Pashu-Mitra — DBIM redesign merge report

**Repository:** `h6362794-sketch/Pashu-Shield-updated`
**Merge branch:** `arena/2d4945a5-pashu-shield-updated` (session branch — `main` untouched)
**Baseline commit:** `e597ea291c714358f8c21d7a94fbf947b4f84196`
**Safety backup:** tag `backup-before-redesign-merge` → same commit
**Redesign source:** `pashu-mitra-redesign.zip` (Google Drive, "Pashu MItra" folder), read file-by-file from the extracted tree
**Companion:** `docs/compliance/DECISIONS.md` (D-01 … D-11) records every deviation and unverified value.

Merge, not replacement: the existing repository remained the source of truth for
functionality; the ZIP contributed visuals, shell, tokens, validators, CI gates
and compliance artefacts only.

---

## 1. Backup branch / restore point

* Tag `backup-before-redesign-merge` created at `e597ea2` **before** any file was written.
* All work committed to `arena/2d4945a5-pashu-shield-updated`. `main` was never checked out, committed to, merged into or pushed to.
* Restore with: `git checkout backup-before-redesign-merge` (or `git reset --hard backup-before-redesign-merge` on the merge branch).

## 2. Compare-before-copy: 20 areas

The ZIP tree and the repository were compared (size + MD5 per file) before anything was copied.

| # | Area | ZIP vs repo | Decision |
|---|------|-------------|----------|
| 1 | `frontend/app.js` | DIFFERS (413,898 vs 412,458 B) | **Kept repo**, palette-migrated surgically. ZIP copy would have dropped merged PR #19–#22 logic. |
| 2 | `frontend/style.css` | DIFFERS (88,367 vs 89,183 B) | **Kept repo**, palette-migrated + `:root` remapped to DBIM text-safe tokens (D-05). |
| 3 | `frontend/shell.js` | DIFFERS (19,290 B) | **Kept repo**, patched surgically: `init()` delegates to `PMShell3` when present, legacy header/footer rendering skipped, prefs/announce/breadcrumbs kept. |
| 4 | `frontend/index.html` | DIFFERS (4,413 B) | **Patched, not replaced**: kept repo Leaflet + hosts, added `dbim-tokens.css`/`dbim-shell.css`, `validators.js`/`dbim-shell.js`, `pmCookieHost`, theme-colour `#0F5757`. |
| 5 | `frontend/a11y.js` | DIFFERS (18,230 B) | Kept repo, palette-migrated (no colour literals changed behaviour). |
| 6 | `frontend/captcha.js` | DIFFERS (8,315 B) | Kept repo, palette-migrated. CAPTCHA logic untouched. |
| 7 | `frontend/info-pages.js` | DIFFERS (44,173 vs 39,760 B) | Kept repo, palette-migrated. ZIP search deltas **not merged** — source unretrievable intact (D-07). |
| 8 | `frontend/sw.js` | DIFFERS (6,597 B) | Kept repo logic; cache bumped `v9 → v10` and the four new DBIM assets pre-cached. |
| 9 | `frontend/manifest.json` | DIFFERS (1,051 vs 854 B) | Kept repo (already points at the official PNG icons); `theme_color` `#3d4db8 → #0F5757`. |
| 10 | `frontend/vercel.json` | DIFFERS (2,832 B) | **Kept repo** — it holds the live deploy config, rewrites and the `pashu-shield` internal name (D-10). ZIP security headers already present. |
| 11 | `frontend/org-config.js` | DIFFERS (8,227 vs 7,443 B) | **Kept repo** — `logo.src` already `assets/pashu-mitra-logo.png`. ZIP copy is placeholder-heavy (`isPlaceholder`, `approved:false`). |
| 12 | `frontend/dbim-shell.js` | new (≈50 KB) | Added — authored in-repo to the ZIP's published contract (D-08), 42,170 B, en/hi/mr/te. |
| 13 | `frontend/dbim-shell.css`, `dbim-tokens.css` | new | Added verbatim (9,055 B / 8,297 B) + two appended rules for the official logo (`.pm-logo-img`, `.pm-logo-chip`). |
| 14 | `frontend/validators.js` + vectors | new | Added verbatim (3,999 B) + `tests/validator-vectors.json`. |
| 15 | `backend/validators.py` + test | new | Added verbatim; wired into `backend/run_tests.sh` (now 11 suites). |
| 16 | `backend/**` (app, realtime, turn_config, webcall, auth, IVR, SMS, Socket.IO) | **byte-identical** | Untouched except `test_compliance.py::test_67` (D-06). |
| 17 | `ml-backend/**`, `voice/**`, `render.yaml`, `.env.example`, `.gitignore`, root docs | **byte-identical** | Untouched. |
| 18 | `frontend/models/**`, `wasm/**`, `vendor/**`, `whisper-worker.js`, `call.js` | identical / absent from ZIP | Untouched (Step 9). |
| 19 | ZIP logo kit (`logo.js`, `logo-dims.js`, `brand.html`, `assets/brand/*`, `build_logos.py`, `outline_text.py`, `pathgeom.py`, `logo_rules.test.mjs`, `shell3.test.mjs`) | new | **Rejected** (D-01); replaced by the official PNG + `tests/shell_official_logo.test.mjs`. |
| 20 | CI / audit config (`.github/workflows/ci.yml`, `.pa11yci.json`, `lighthouserc.json`, `frontend/.well-known/security.txt`, `scripts/check-*.mjs`, `scripts/fetch-fonts.sh`) | new | Added. `check-images.mjs` carries one exact-path exemption (D-04); `check-links.mjs`' comment now points at the merge's own test file. |

Palette-migration probe: running `scripts/migrate_palette.py` over the 12 DIFFERS files reproduces
**none** of the ZIP's MD5s, i.e. the ZIP tree also contains independent edits. That is why every
DIFFERS file was merged by hand instead of copied.

## 3. Existing functionality protected

Untouched and re-verified by test: OTP login for farmer / vet / government / lab, RBAC, all four
dashboards, livestock, herds, disease cases, treatment responses, mortality, productivity, reports,
exports, print CSS, ML service, IVR, SMS gateway, Socket.IO signalling, WebRTC, STUN/TURN, vet
presence + lease heartbeat, call routing, accept/reject, reconnect, mute/unmute, hang-up, call
history, en/hi/mr/te, Whisper voice input, `/models`, `/wasm`, all REST APIs, Vercel + Render deploy
config. No framework migration, no new runtime dependency, no architecture change. `frontend/call.js`
(WebRTC implementation) is byte-identical to the baseline.

## 4. Additive redesign merge

Added: DBIM design tokens, DBIM shell (header/nav/footer/ticker/cookie consent), shared validators
(JS + Python parity), self-hosted Noto Sans, security.txt, CI workflow, pa11y + Lighthouse configs,
contrast/link/image gates, palette migrator, font fetch script, local dev preview server.
Modified: `index.html` (asset wiring), `shell.js` (delegation), `style.css` + `app.js` + `a11y.js` +
`captcha.js` (palette), `sw.js` (cache v10), `manifest.json` (theme colour), `run_tests.sh`
(+1 suite), `test_compliance.py` (D-06), `.gitignore` (runtime artefacts).
Focus management, skip link, live regions, disclosure `aria-expanded`/`aria-controls`, reduced-motion
and 3px `:focus-visible` rings are asserted by test, not assumed.

## 5. Official logo everywhere

`frontend/assets/pashu-mitra-logo.png` — owner-selected artwork (green veterinary cross + cow head),
1024×1024 PNG, 255,529 B, verified by PNG signature + IHDR parse.
Wired through `org-config.js → logo.src`, so it reaches header, footer, login/OTP screens, all four
dashboards, Web Call, favicon, PWA icons and public pages from one source. Alt text is exactly
`Pashu-Mitra`; the brand link carries `aria-label="Pashu-Mitra – Home"`.
Never distorted: CSS sets `height` + `width:auto` + `object-fit:contain` (asserted in
`shell_official_logo.test.mjs`). The ZIP's generated shield/horns kit is not referenced anywhere
(asserted). Bonus effect: the baseline test *"the official logo file, when present, is a usable PNG"*
was **skipped** before this merge and now **runs and passes**.

## 6. Rebranding

User-facing strings were already `Pashu-Mitra` in the baseline (PR #22). Remaining `pashu-shield`
occurrences are internal identifiers only and were deliberately left: `backend/app.py`
`"service":"pashu-shield-backend"`, `frontend/vercel.json` project name + rewrite destination, Render
service names, database names (D-10). Two `style.css` comments were rebranded.

## 7. Demo access without dev messaging

The baseline already renders a clean "Demo access" card (`farmerDemoAccountSection()` in `app.js`)
showing demo mobile + demo OTP, gated on server-side demo config, with no "Demo Login", "Demo mode
enabled", "Development environment" or "Production override" wording in the UI. Verified, kept as-is.
The `*** DEMO MODE IS ENABLED ***` banner is **server stdout only**, never sent to the browser.

## 8. WebRTC — no regression (measured, not asserted)

* `https://pashu-mitra-2bu09eba6-pashu-shield.vercel.app` is present both in `render.yaml:141` and in the built-in fallback list in `backend/realtime.py:105`, so the fix survives even if the Render env var is stale.
* No wildcard CORS: `backend/realtime.py` logs and ignores wildcard entries; the origin gate was re-verified live (below).
* `frontend/call.js` byte-identical to baseline; only palette tokens around it changed.
* **Rung 3 — real two-peer WebRTC through the real server, host candidates:** `PASS — real two-way WebRTC audio verified (13 steps, decoded frames farmer=502 vet=507)`; 248 RTP packets each direction; offer/answer via the durable relay; atomic single-answer; `connected_at` stamped only after client media confirmation; mute relayed; terminal `ended` event; history authorised.
* **Rung 3 forced through TURN** (`SIH_TURN_URLS=turn:127.0.0.1:3478`, `SIH_TURN_SECRET=…`, `SIH_ICE_TRANSPORT_POLICY=relay`, real `node-turn` coturn-REST fixture): `PASS … decoded frames farmer=610 vet=613`, selected candidate pairs `relay->relay` on **both** peers, and every candidate on both peers was a TURN relay candidate → ephemeral credential derivation is correct and TURN credentials are still never returned to the client.
* **Socket.IO origin/CORS gate** (`socketio_origin_check.mjs`, 6 groups, authenticated): allowed origin gets `Access-Control-Allow-Origin` equal to exactly that origin; **no wildcard**; unlisted origin gets no ACAO header over polling *and* is refused over WebSocket; tokenless socket refused; canonical `/socket.io` path confirmed.

## 9. Voice assets

`frontend/models/Xenova/whisper-tiny/**`, `frontend/wasm/**`, `frontend/vendor/**`,
`whisper-worker.js` untouched. `sw.js` still pre-caches them; the new `frontend/fonts/` directory is
served with `font/woff2` and verified 200 over HTTP.

## 10. Four languages

en / hi / mr / te all present and asserted: `PMShell3.labels` key sets are **identical across the four
languages** (deep-equal test), header renders `हमारे बारे में` (hi), `आमच्याबद्दल` (mr), `మా గురించి` (te),
cookie banner renders `सभी स्वीकार करें` (hi), and the shell calls the app's existing `window.setLang`.
Nothing was reduced to en/hi. `app.js`'s own I18N dictionary is untouched.

## 11. Fonts — implemented, not pending

Real woff2 files are vendored in `frontend/fonts/` (12 files, 444 KB, from `@fontsource/noto-sans*`
on the npm registry, SIL OFL 1.1, licence text committed alongside):

| Script | Serves | Weights | 400 size |
|--------|--------|---------|----------|
| latin | English | 400/500/600/700 | 13,120 B |
| Devanagari | Hindi **and** Marathi | 400/500/600/700 | 50,416 B |
| Telugu | Telugu | 400/500/600/700 | 35,760 B |

`dbim-tokens.css` `@font-face` rules reference exactly these paths with `unicode-range` (Devanagari
`U+0900-097F`, Telugu `U+0C00-0C7F`) and `font-display:swap`; body text uses
`var(--dbim-font)`. All 12 paths are asserted to exist on disk **and** to be declared in CSS
(`shell_official_logo.test.mjs`), and each was served `200 font/woff2` by the preview server. No
third-party font CDN is contacted at runtime.

## 12. Security not weakened

XSS escaping helpers and their call sites unchanged (7 escaping tests still pass); safe filenames,
upload validation, CAPTCHA, rate limiting, JWT validation, RBAC, audit logging, security headers
(`vercel.json` untouched), CORS allow-list (no wildcard, re-verified live), safe error messages and
TURN credential protection all re-verified by the 346-test backend suite. Added: shared field
validators with client/server parity vectors (Aadhaar masked on display; no frontend source logs an
Aadhaar number or puts one in a URL — asserted), `.well-known/security.txt`, and three CI gates.
No secret is committed: the only strings matching secret patterns in the diff are documentation
placeholders (`dev-secret`, `<coturn static-auth-secret>`, `password123` for the seeded demo vet).
`backend/animal_health.db` and `backend/server.log` are now **untracked** (`git rm --cached`, files
kept on disk) and ignored. History still contains them — no purge was requested.

## 13. Tests: before and after (both actually executed)

Baseline measured by stashing the merge and running the identical commands at `e597ea2`.

| Suite | Before | After | New | Failed | Skipped |
|-------|--------|-------|-----|--------|---------|
| Frontend `node --test frontend/tests/*.test.mjs` | 81 tests, 78 pass, **3 skip** | **101 tests, 99 pass, 0 fail, 2 skip** | +20 (13 shell/logo, 7 validators) | 0 | 3 → 2 (the official-logo PNG test now runs and passes; the 2 remaining are the browser rung, honest SKIP) |
| Backend `bash backend/run_tests.sh` | 10 suites, 344 tests, all pass | **11 suites, 346 tests, all pass** | +1 suite / +2 tests (`tests/test_validators`) | 0 | 0 |
| ML `python ml-backend/test_main.py` | 24 tests, OK | **24 tests, OK** | 0 | 0 | 0 |
| WebRTC rung 3 `two_peer_call.mjs` (host) | PASS (frames 502/503) | **PASS (frames 502/507)** | 0 | 0 | 0 |
| WebRTC rung 3 forced TURN relay | not run | **PASS, `relay->relay`, frames 610/613** | new coverage | 0 | 0 |
| WebRTC `socketio_origin_check.mjs` | not run | **PASS, 6 groups** | new coverage | 0 | 0 |
| WebRTC `local_turn_ephemeral.mjs` | fixture | **used as the live TURN server for the relay run** | — | 0 | — |
| Contrast gate `scripts/check-contrast.mjs` | did not exist | **94 pairs checked, 0 failures** | new gate | 0 | 11 exempt/unresolved |
| Image budget `scripts/check-images.mjs` | did not exist | **1 image, 1 exempt by path, 0 over budget** | new gate | 0 | — |
| Link checker `scripts/check-links.mjs` | did not exist | **not run locally** — needs outbound HTTPS; CI-only job | — | — | skipped locally |
| Browser rung 4 `webcall_browser.test.mjs` | SKIP | **SKIP** (no browser binary available) | 0 | 0 | 2 |

No regression: nothing that passed before fails now. Two pre-existing test expectations were
deliberately updated, both documented: `test_compliance.py::test_67` (D-06) and the contrast-driven
`:root` remap (D-05). The contrast gate initially reported **13 real failures** caused by the
mechanical palette migration painting `#2D8686` as text (4.32:1); they were fixed at the token level,
not by exempting the rules.

## 14. Browser testing at 360 / 768 / 1366 px — **NOT RUN** (honest)

No browser exists in this environment: `playwright` installs from npm, but
`npx playwright install chromium` fails with *"Failed to download Chrome for Testing 156.0.8078.4"*
because the browser CDN is not on the sandbox network allow-list. `webcall_browser.test.mjs`
therefore reports SKIP (exit 0, `# skipped 2`) and is **not** claimed as passed.

What was done instead, and can be repeated in one command:

* `scripts/dev-preview.mjs` — dependency-free static server that reproduces the Vercel rewrites (`/api/*` and `/socket.io/*`, including the WebSocket upgrade splice) so the portal can be driven in a real browser against a real backend.
* Verified over HTTP: `/` 200, `dbim-tokens.css` 8,297 B, `dbim-shell.css` 9,055 B, `dbim-shell.js` 42,170 B, `validators.js` 3,999 B, all three scripts' woff2 `200 font/woff2`, official logo `200 image/png` 255,529 B, `manifest.json`, `sw.js`, `.well-known/security.txt`, and `/api/webcall/config` → `401` through the proxy (proxy path proven).
* Verified statically instead of visually: zoomable viewport (no `user-scalable=no` / `maximum-scale=1`), single `<main>`, skip link is the first focusable element, DBIM mobile type scale at ≤767 px, `scroll-padding-top`, reduced-motion block, 3px focus rings, print stylesheet.

Owner reproduction (real browser, 360/768/1366 + 200 % zoom + keyboard):

```bash
cd backend && SIH_SECRET_KEY=dev-secret SIH_DB_PATH=/tmp/webcall_dev.db DEMO_MODE=true \
  python3 -c "from app import app, socketio; socketio.run(app, host='127.0.0.1', port=5001, allow_unsafe_werkzeug=True)"
node scripts/dev-preview.mjs                      # http://127.0.0.1:8080
npx playwright install chromium && PM_BROWSER_URL=http://127.0.0.1:8080 \
  node --test frontend/tests/webcall_browser.test.mjs
npx pa11y-ci --config .pa11yci.json               # a11y at the configured viewports
```

Demo access for the walkthrough: farmer mobile `8341564042`, OTP `123456` (requires `DEMO_MODE=true`);
vet `vet1@example.com` / `password123`.

## 15. Two-real-browser WebRTC test — **NOT RUN**; real two-peer WebRTC **WAS RUN**

Rung 4 (two real browsers over `getUserMedia`) could not run for the reason in §14 and is not claimed.
Rung 3 — two genuine WebRTC peer connections negotiating through the **real** server, with real RTP
audio measured on both peers — **was run twice and passed**, once with host candidates and once with
`iceTransportPolicy=relay` against a real local TURN server (§8). That is the highest rung available
without a browser binary, and it proves signaling, routing, presence/lease, atomic answer, SDP/ICE
relay, DTLS-SRTP, bidirectional audio, mute relay, timestamps, terminal events and history.

## 16. Pre-commit inspection

`git status`, `git diff --stat` and the full staged diff were inspected before committing:
45 paths — 33 added, 10 modified, 2 index-only deletions (`backend/animal_health.db`,
`backend/server.log`; both still on disk). ~1.3 MB staged, largest blobs `frontend/app.js`
(412 KB, palette-migrated), the official logo (255 KB) and `frontend/style.css` (89 KB).
`.venv/`, `node_modules/`, `backend/*.db` and `backend/server.log` confirmed ignored; no `.env`, no
credentials, no TURN secret, no SMS credential, no API key, no database and no log file in the diff.

## 17. Commit / push / no auto-merge

Committed to `arena/2d4945a5-pashu-shield-updated` and pushed to `origin`. `main` was not merged,
not fast-forwarded and not pushed. To review:

```bash
gh pr create --base main --head arena/2d4945a5-pashu-shield-updated \
  --title "Pashu-Mitra: DBIM redesign merge (additive, official logo, no functional regression)"
```

### Owner actions before production

1. **Verify the DBIM hex values** against `https://dbimtoolkit.digifootprint.gov.in` (D-02) — unreachable from the build sandbox; the Blue theme override is included, other colour groups are deliberately absent rather than guessed.
2. **Run §14/§15 in a real browser** (360/768/1366, 200 % zoom, keyboard, two-browser Web Call).
3. **Decide on D-07** — whether the ZIP's `info-pages.js` search synonyms / "Did you mean" / category chips should be re-implemented.
4. Fill the `org-config.js` placeholders (`approved:false` policy entries, helpline, `officialGovPortal`) before claiming GIGW/DBIM conformance publicly; `scripts/check-links.mjs` needs outbound network and runs in CI only.
5. `backend/animal_health.db` and `backend/server.log` remain in Git **history**; purge separately if required.
