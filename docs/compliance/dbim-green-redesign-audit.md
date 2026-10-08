# Pashu-Mitra — DBIM Green Redesign: Pre-Change Audit

**Date:** 2026-10-08 · **Branch:** `arena/a45f5386-pashu-shield-updated` · **Base:** `bdd02d4` (`main`)
**Status:** Completed *before* any source file was changed. Findings below are measured from the
repository and from the untouched application running in headless Chromium, unless marked
"source reading".

> This audit does **not** claim DBIM certification. It records the starting state so that the
> migration can be checked against it. The redesign is a visual/design-system migration; it does
> not change routes, APIs, authentication, RBAC, WebRTC signalling, GIS data, or the database.

---

## 0. Scope and method

| Item | What was done |
|---|---|
| Files read | `frontend/index.html`, `app.js` (6,082 lines), `style.css` (2,141 lines), `call.js` (2,457), `shell.js` (874), `a11y.js` (488), `info-pages.js` (731), `org-config.js`, `captcha.js`, `sw.js`, `manifest.json`; `backend/app.py`, `realtime.py`, `database.py`, `turn_config.py`; all `frontend/tests/*.mjs`; `backend/test_*.py`; `docs/compliance/*` |
| Measurements | `grep`/`wc` counts on the working tree; WCAG 2.x contrast computed with the relative-luminance formula |
| Live rendering | Headless Chromium 131 (bundled build, run from `/tmp`, outside the repository) against a local gunicorn instance using a throwaway SQLite file (`SIH_DB_PATH` outside the repo). The tracked `backend/animal_health.db` was not modified. |
| Accessibility scan | axe-core 4.14.0, rules `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice` |
| Not available | Lighthouse, pa11y, Firefox/WebKit, real device testing. These are reported as NOT VERIFIED in the change log. |

---

## 1. Existing visual system

- **Stack:** plain HTML, one stylesheet (`frontend/style.css`), vanilla JS template literals
  (`app.js`, `shell.js`, `call.js`, `a11y.js`, `info-pages.js`). No CSS framework, no build step,
  no JS framework. This is preserved by the migration.
- **Identity:** navy brand (`#102A6B` primary, `#0B1E48` dark, `#1E3A8A` light), saffron secondary
  (`#D97706`), and a legacy blue (`#3d4db8` / `#2c3690`) that still appears in the legacy tokens.
- **Surfaces:** navy utility bar → white brand header → navy primary navigation → navy footer.
- **Logo:** `frontend/assets/pashu-mitra-logo.png` (official asset, loaded through `ORG.logo.src` in
  `org-config.js`). It is never redrawn or replaced by an emoji.
- **Tricolour stripe:** a 3px hard-stop stripe (`#FF9933 / #FFFFFF / #138808`) above the utility bar
  and on the Officer Access card. It is a national-identity element and is kept.

## 2. Existing colour tokens (before)

### 2.1 Token definitions (`:root`, style.css lines 112–210)

| Token | Value | Notes |
|---|---|---|
| `--primary` | `#3d4db8` | Legacy blue. Asserted by `backend/test_compliance.py::test_67` |
| `--primary-dark` | `#2c3690` | Legacy blue. Asserted by `test_67` |
| `--bg` | `#eef0f6` | Asserted by `test_67` |
| `--green` | `#1fa971` | Risk "low" colour and legacy status |
| `--red` | `#e2483f` | Risk "high" colour and legacy status |
| `--pm-primary` | `#102A6B` | Navy brand foundation |
| `--pm-primary-dark` | `#0B1E48` | Navy, used for headings, utility bar, footer |
| `--pm-primary-light` | `#1E3A8A` | Navy hover |
| `--pm-secondary` | `#D97706` | Saffron accent (nav underline, footer rule, skip link focus) |
| `--pm-secondary-dark` | `#B45309` | Saffron text |
| `--pm-secondary-light` | `#FEF3C7` | Saffron tint |
| `--pm-success` / `-bg` / `-border` | `#1B5E20` / `#E8F5E9` / `#A5D6A7` | Functional success |
| `--pm-danger` / `-bg` / `-border` | `#B71C1C` / `#FFEBEE` / `#EF9A9A` | Functional error |
| `--pm-warning` / `-bg` / `-border` | `#D97706` / `#FFFBEB` / `#FDE68A` | Functional warning |
| `--pm-info` / `-bg` / `-border` | `#1565C0` / `#E3F2FD` / `#90CAF9` | Functional information |
| `--pm-bg` | `#F4F6FA` | Page background (cool slate) |
| `--pm-surface` / `--pm-surface-alt` | `#FFFFFF` / `#F8FAFC` | Cards / subtle surfaces |
| `--pm-border` / `--pm-border-subtle` | `#CBD5E1` / `#E2E8F0` | Borders |
| `--pm-text` / `--pm-text-muted` | `#0F172A` / `#475569` | Body / secondary text |
| `--pm-focus` | `#102A6B` | Focus ring (navy) |
| `--pm-space-1…6`, `--pm-space-xs…4xl` | 4, 8, 12, 16, 24, 32, 48 (+20) px | Spacing scale, defined but used inconsistently |
| `--pm-radius-sm/md/lg` | 4 / 6 / 8 px | Corner radii |
| `--pm-shadow-sm/md/lg` | neutral black, 0.05–0.1 alpha | Shadows |

### 2.2 Usage measurements

| Measure | Count |
|---|---|
| `var(--pm-…)` references in `style.css` | 279 |
| Unique hard-coded hex literals in `style.css` | 77 |
| `rgba()/hsl()` literals in `style.css` | 27 |
| Gradients in `style.css` | 3 (flag stripe, skeleton shimmer, Officer Access header `#102A6B→#16357F`) |
| Hex literals in `app.js` | 62 (dashboards, charts, role colours, risk colours) |
| Hex literals in `captcha.js` | 2 |
| Inline `style="…"` attributes in `app.js` | 273 |
| Inline `style="…"` attributes in `call.js` | 28 |

### 2.3 Inconsistencies found

- **Per-role colours:** `ROLE_META` assigns each role its own colour (`#1fa971` farmer, `#2f6fed` vet,
  `#8e24aa` government, `#00838f` lab). The role banner on each login screen uses it inline
  (`background:${color}1a;color:${color}`). This is a "rainbow" pattern. The farmer banner measures
  **2.71:1** (axe, live), which fails.
- **Officer Access icon tints:** `#EAF1FE`, `#F3EAFB`, `#E6F6F8` per role (inline).
- **Chart palette:** `PIE_COLORS` = eight unrelated colours (`#3d4db8`, `#e2483f`, `#1fa971`,
  `#e08a1e`, `#8e24aa`, `#2f6fed`, `#6d4c41`, `#f4511e`). Bar charts use a gradient.
- **Cluster overlay (GIS):** purple `#8e24aa` / `#e1bee7`, outside the brand and risk systems.
- **Ad-hoc tints in components:** helpline banner `#FFFBEB`/`#FCD34D`, demo box `#EFF6FF`/`#BFDBFE`,
  table header and hover `#EEF2F6`, sync indicator `#FEF3C7`, GIS status `#ECFDF5`/`#FFF7ED`.

## 3. Typography

- **Font:** Noto Sans, self-hosted in `frontend/fonts/` as woff2 for Latin, Devanagari (Hindi and
  Marathi) and Telugu. Shipped weights: 400, 500, 600, 700. The font stack is asserted by
  `test_68` and is kept.
- **Heading classes are used but not defined.** `app.js` uses `pm-h2` (15 references incl. `pm-h3`)
  and `pm-small`, `pm-caption`, `pm-page-container`, `pm-chart`, `pm-chart-details`,
  `farmer-list-card`, `farmer-health-warning`, `farmer-health-ok`, `owner-hello`, `owner-home-card`,
  `owner-livestock-action-grid`. None has a CSS rule, so headings fall back to browser defaults.
- **Info pages** (`info-pages.js`) use `pm-h1`, `pm-h2`, `pm-faq`, `pm-faq-item`, `pm-faq-q`, `pm-form`,
  `pm-req`, `pm-error-summary`, `pm-error-title`, `pm-note`, `pm-placeholder`,
  `pm-placeholder-inline`, `pm-placeholder-tag`, `pm-pending`, `pm-dl`, `pm-list`, `pm-page`. None is
  defined in `style.css`.
- **Weight 800:** several headings request 800, but no 800 face ships, so 700 is used.
- **Type scale tokens** `--pm-text-xs…3xl` exist but most sizes are hard-coded px values.
- **Button text:** `.btn` is 14.5px × text scale, weight 600.

## 4. Existing components (inventory)

| Component | Classes / IDs (source) |
|---|---|
| Utility bar | `.pm-a11y-bar`, `.pm-flag-stripe`, `.pm-a11y-btn` (A-/A/A+), high-contrast and reduce-motion toggles, `#pmGlobalLangSelect` |
| Brand header | `.pm-site-header`, `.pm-brand`, `.pm-logo-img`, `.pm-brand-name`, `.pm-brand-tag`, `.pm-header-search-btn`, `.pm-auth-cta-farmer`, `.pm-auth-cta-staff` |
| Primary navigation | `.pm-primary-nav`, `.pm-nav-link` (`aria-current`) |
| Breadcrumbs | `.pm-crumbs`, `.pm-crumb-link` |
| Page header (staff) | `.app-header` (`role="banner"` inside `<main>`), `.header-icon-btn` |
| Page header (farmer) | `.owner-app-header`, `.owner-brand`, `.owner-page-title`, `.sync-indicator` |
| Cards | `.section-card`, `.stat-card` (`.pm-kpi`), `.list-card`, `.owner-action-card`, `.icon-item`, `.pm-card-elevated`, `.hello-banner` |
| Buttons | `.btn` + `.btn-primary / -outline / -secondary / -ghost / -danger / -success / -sm`, `.btn-row` |
| Forms | `.field`, `.form-row`, `.otp-*` (mobile row, code input, resend), `.demo-box*` |
| Badges / chips | `.badge`, `.badge-green/orange/red/blue`, `.pm-state-chip`, `.risk-chip` |
| Tables | `.pm-table-scroll` (role=region, tabindex=0), `.pm-data-table`, `.pm-num` |
| Alerts / states | `.pm-alert-*`, `.pm-emphasis-*`, `.pm-state`, `.pm-state-error`, `.empty-state`, `.loading`, `.pm-skeleton` |
| Toast | `#toast.toast` (`.error`) |
| Modals | `.pm-modal-overlay`, `.qr-modal`, `.pm-modal-content` |
| Charts | `barChart()`, `pieChart()`, `trendBarChart()`, `.pm-chart`, `.pm-bar-chart`, `.pm-pie-chart`, `<details class="pm-chart-details">` data tables |
| GIS | `.gis-map`, `.gis-status`, `.gis-controls`, `.gis-risk-toggles`, `.risk-chip`, `.gis-legend`, `.pm-legend-*`, `.pm-map-warn`, `.pm-gis-popup*`, `.pm-data-table` |
| WebRTC | `.pm-call-card`, `.pm-call-header`, `.pm-call-status`, `.pm-call-meta`, `.pm-call-actions`, `.pm-call-btn` (`.pm-call-accept`, `.pm-call-decline`, `.is-muted`), `.pm-state-strip`, `.pm-state-chip`, `#pmCallOverlay` |
| Officer Access | `.pm-officer-wrap`, `.pm-officer-card`, `.pm-officer-head`, `.pm-officer-role`, `.pm-officer-icon`, `.pm-officer-note` |
| Homepage | `.pm-landing-grid`, `.pm-landing-hero`, `.pm-portal-badge`, `.pm-landing-title`, `.pm-service-pillars`, `.pm-pillar-item`, `.pm-helpline-banner`, `.pm-helpline-btn` |
| Auth | `.auth-wrap`, `.auth-logo`, `.role-banner`, `.auth-switch`, `#loginForm`, `#registerForm`, `#farmerOtpForm` |
| Footer | `.pm-footer`, `.pm-footer-inner`, `.pm-footer-h`, `.pm-footer-list`, `.pm-footer-bar`, `.pm-footer-line` |
| Mobile nav | `.bottom-nav`, `.nav-item` (`.active`, `aria-current`), `.owner-bottom-nav` |

## 5. Existing layouts

- **`#app`:** `max-width:1440px`, `padding:0 16px 80px`.
- **Staff dashboards:** `hello-banner` → `stat-grid` of stat cards → `section-card` stack → `icon-grid`
  → account card → fixed bottom nav.
- **Farmer home:** `owner-hello` → `owner-home-actions` (auto-fit grid, minimum 130px) → helpline card
  → account card → bottom nav (5 items).
- **Homepage:** `.pm-landing-grid` (880px max) with one hero card: badge, h1, paragraph, four service
  pillars, helpline banner. No portal card (see §12).
- **Auth:** `.auth-wrap` centred at 540px.
- **Officer Access:** `.pm-officer-wrap` centred at 560px.
- **Grid utility:** `.pm-grid-12` (12 / 8 / 4 columns at 1024 / 640px).

## 6. Existing dashboards (source reading of the render functions)

| Portal | Render function | Content order | Navigation |
|---|---|---|---|
| Farmer | `ownerDashboard()` | Hello banner (animal and case counts), "What do you need?" action grid (Livestock, Report, Health, Web Call, Notifications, Herds), helpline card, account card | Bottom nav: Home, My Livestock, Cases, Health & Treatment, Notifications |
| Veterinarian | `vetDashboard()` | Hello banner, "Priority — Cases & Availability" (6 stat cards, 2 buttons), `#pmVetCallHost` (web-call availability card, mounted by `call.js`), read-only IVR/helpline card, IVR status, "Today's Tasks" icon grid (14 items), account card | Bottom nav (6 items). English only (hard-coded strings) |
| Government | `govtDashboard()` | "Key Metrics" (6 stat cards), "Helpline Reporting" (4 stat cards), "GIS Risk Map & Surveillance", "Cases by District" (`barChart`), "Most Spread Diseases" (`pieChart`), "Quick Access" icon grid | Bottom nav (6 items). English only |
| Laboratory | `labDashboard()` | Hello banner, stat cards (incl. "In Testing"), quick-access icon grid (4 items), account card | Bottom nav (5 items). English only |

## 7. Existing accessibility implementation

- Skip link is the first focusable element (`.pm-skip-link`, `href="#main-content"`); a second inline
  skip link sits in the utility bar.
- Utility bar: text-size control with five scales (0.875 / 1.0 / 1.125 / 1.25 / 1.5), high-contrast
  toggle (`html.pm-high-contrast` token override block), reduce-motion toggle
  (`html.pm-reduced-motion` and `prefers-reduced-motion`).
- Focus: `:focus-visible` 3px outline in `--pm-focus`; a `@supports not selector(:focus-visible)` fallback.
- Landmarks: `header#site-header role=banner`, `nav aria-label`, `main#main-content tabindex=-1`,
  `footer role=contentinfo`. Live regions `#pmLivePolite` and `#pmLiveAssertive` are in the initial HTML.
- `a11y.js`: focus trap, accessible dialogs with Escape, keyboard-operable cards, error summary,
  `aria-invalid` and `aria-describedby` on fields, autocomplete enhancement, result counts.
- Charts: `role="img"` summary, `sr-only` paragraph, and a `<details>` data table alternative.
- Print stylesheet (`@media print`, `@page size:A4`) hides chrome.
- Viewport does not block zoom (`test_64`).

### 7.1 Baseline axe-core results (live, before any change)

| Page (viewport) | Violations (rule × nodes) | Incomplete |
|---|---|---|
| Homepage (1366) | `label-content-name-mismatch` ×4 (serious); `region` ×4 | 2 |
| Farmer login (390) | `color-contrast` ×1 (serious, 2.71:1); `label-content-name-mismatch` ×3; `page-has-heading-one` ×1; `region` ×4 | 3 |
| Officer Access (1366) | `aria-allowed-role` ×3 (minor); `label-content-name-mismatch` ×3; `page-has-heading-one`; `region` ×4 | 2 |
| Vet login (1366) | `color-contrast` ×1 (serious); `label-content-name-mismatch` ×3; `page-has-heading-one`; `region` ×4 | 2 |
| Vet dashboard (1366) | `label-content-name-mismatch` ×3; `landmark-banner-is-top-level`; `landmark-no-duplicate-banner`; `landmark-unique` ×2; `region` ×4 | 3 |
| Govt dashboard (1366) | as vet, plus `nested-interactive` ×2 (serious: focusable `<details>` inside `role="img"` charts) | 2 |
| Govt GIS (1366) | `label-content-name-mismatch` ×3; landmark rules; `region` ×4 | 3 |
| Farmer dashboard (390) | `label-content-name-mismatch` ×5; landmark rules; `region` ×4 | 3 |

**Root causes found:**

1. **Label in name (WCAG 2.5.3):** `aria-label` values do not contain the visible text. Examples:
   the `A-` button labelled "Decrease text size", the `A+` button labelled "Increase text size",
   the brand link labelled "Pashu-Mitra — go to the home page" while it shows the tagline, and
   "Call 1962" labelled "Call Helpline 1962".
2. **Colour contrast:** the role banner (`#1fa971` text on a 10% tint) at 2.71:1. The call mute
   button uses white text on `#D97706` (3.19:1).
3. **Heading level:** login pages have no `<h1>` (the title is an `<h2>` in `.auth-logo`).
4. **Landmarks:** the staff/farmer page header is `role="banner"` inside `<main>`, so there are two
   banners and one is nested.
5. **Nested interactive:** the chart `role="img"` wrapper contains focusable `<details>` and `<summary>`.
6. **ARIA roles:** `role="list"` on a `div` with `<button role="listitem">` children is not valid.

## 8. Existing responsive behaviour

- Breakpoints in use: 1024px, 640px (grid), 600px (form rows stack), 480px (compact header, GIS map
  320px), 360px (smaller logo and CTAs), `pointer:coarse` (small buttons 44px).
- Bottom nav is fixed; primary nav scrolls horizontally (`overflow-x:auto`).
- **Measured before change:** no horizontal page overflow (`scrollWidth == clientWidth`) at 320, 360,
  390 and 1366px on the pages captured (homepage, farmer login, farmer dashboard, vet/govt dashboards,
  GIS, lab dashboard).
- Visible tightness: the farmer bottom nav uses an 11px label size. Owner-header titles are capped at
  20px. Telugu and Hindi labels are longer and need wrapping room.

## 9. Existing language system

- **Farmer UI** is fully translated. Strings come from `I18N` in `app.js` (en, hi, mr, te) through
  `ft(key)` and `t(key)`. `farmer.*` keys cover auth, OTP, demo, livestock, cases, health, profile,
  notifications and web-call text.
- **Shell** (utility bar, header, nav, footer) is translated through `SHELL_I18N` in `shell.js`.
- **A11y strings** are in `A11Y_I18N` in `a11y.js`.
- **Language persistence:** `localStorage["pm_lang"]` is shared between `app.js` and `shell.js`
  (`PashuShell.syncAppLanguage`). `render()` sets `<html lang>`.
- **Brand:** "Pashu-Mitra" is never translated. Tests assert this (`officer_access_gis_i18n.test.mjs`,
  `branding_webcall_states.test.mjs`).
- **Staff portals** (vet, government, lab) are English-only with hard-coded strings. This is the
  existing scope; the migration does not extend translation to staff screens.

## 10. Existing WebRTC UI

- `call.js` renders the overlay `#pmCallOverlay`, the farmer call card, the vet availability card
  (`#pmVetCallHost`), and status badges (`#pmCallLinkBadge`, `#pmVetAvailabilityBadge`,
  `#pmVetPresenceBadge`, `#pmVetPresenceDetail`, `#pmCallSignalStatus`, `#pmVetSignalStatus`).
- Buttons include `#pmCallAnswer`, `#pmCallReject`, `#pmCallPeerMute` and the hang-up control.
  Also `#pmCallTimer` and `#pmCallHint`.
- State model: 12 call states shown as text chips (`.pm-state-chip[aria-current]`). Routability is
  gated by Socket.IO connected, presence lease live, availability AVAILABLE and not busy.
  The UI shows the honest state and never shows "Receiving calls" from availability alone.
- Ringtone is generated with WebAudio. No audio file is used.
- Visual classes: `.pm-call-accept` (success), `.pm-call-decline` (danger), `.pm-call-btn.is-muted`
  (saffron, contrast problem as noted in §7.1), `.pm-call-status` (navy).
- Overlay stacking: `.pm-call-overlay` z-index 9999; QR modal z-index 1000.

## 11. Existing GIS UI

- Leaflet **1.9.4** is vendored (`frontend/vendor/leaflet.min.js`, `leaflet.css`). CDN fallback loads
  only if the vendored copy is missing.
- Tiles come from OpenStreetMap (`https://{s}.tile.openstreetmap.org/...`).
- Map container `.gis-map` has an explicit height (420px; 320px at ≤480px). `styleSource` tests
  require the px height.
- Controls: disease select, risk toggles (`.risk-chip`, checkboxes plus colour dots), spatiotemporal
  cluster toggle, status line (`.gis-status.online/offline`), unmapped-district warning
  (`#gisUnmappedWarn`).
- Risk colours are semantic and hard-coded in JS: High `#E2483F`, Moderate `#E08A1E`, Low `#1FA971`.
  These must keep their meaning.
- Clusters use purple (`#8E24AA`, fill `#E1BEE7`, dashed).
- Accessible alternative: `#gisTable` (`.pm-data-table`, caption sr-only, `th scope`), summary cards
  (`#gisSummary`) and the top-five list (`#gisTop`). Test `officer_access_gis_i18n` asserts the table
  headers.

## 12. Existing authentication UI

- **Farmer:** OTP only. `#/login/owner` renders `farmerOtpLoginForm()`:
  mobile field `#otpMobile` with a +91 prefix, `#otpSendBtn`, the demo card slot `#farmerDemoAccountSlot`,
  then `#otpCodeStep` (`#otpCode`, `#otpVerifyBtn`, resend `#otpResendBtn` with cooldown),
  `#farmerProfileStep` (signup), change-mobile and mode switch.
  The demo card appears only when `/api/auth/farmer/config` reports demo mode enabled (verified live:
  `demo_mode.enabled: true` with `DEMO_MODE=true`).
- **Staff (vet, government, lab):** password login `#loginForm` (`#pm_identifier`, `#pm_password`),
  registration `#registerForm`, forgot-password. A staff demo box (`class="demo-box"`, username and
  password) is present on these screens and is asserted by `demo_account_ui.test.mjs`.
- **Officer Access** (`#/officer-access`): public routing page. Three buttons send the officer to
  `#/login/vet|govt|lab`. It contains no password field and no identifier field (asserted).
- **Header CTAs:** "Farmer OTP Login" → `#/login/owner`; "Officer Access" → `#/officer-access`.
- **"Choose your portal":** the homepage portal card is absent. The phrase survives only as the
  back-link text on the Officer Access page (`auth.choose`), which navigates home. The card itself
  must not be recreated.
- **"Demo Login" message:** not present anywhere in the frontend. The only demo content is the
  server-config-driven farmer card and the staff demo box.
- **Role banner:** per-role inline colours (§2.3), which fails contrast.
- **Login screens have no `<h1>`:** `.auth-logo` uses `<h2>` (axe `page-has-heading-one`).

## 13. Existing reusable classes

- **Defined and widely used:** `.btn*`, `.field`, `.form-row`, `.section-card`, `.section-title`,
  `.hello-banner`, `.stat-grid`, `.stat-card`, `.list-card`, `.badge-*`, `.icon-grid`, `.icon-item`,
  `.owner-action-card`, `.pm-table-scroll`, `.pm-alert-*`, `.pm-state*`, `.empty-state`, `.loading`,
  `.toast`, `.pm-modal-*`, `.gis-*`, `.pm-call-*`, `.pm-officer-*`, `.pm-footer*`, `.pm-helpline-*`,
  `.pm-landing-*`, `.auth-wrap`, `.role-banner`, `.demo-box*`, `.otp-*`.
- **Used but not defined** (see §3): `pm-h1`, `pm-h2`, `pm-h3`, `pm-small`, `pm-caption`,
  `pm-page-container`, `pm-chart`, `pm-chart-details`, `farmer-list-card`, `farmer-health-*`,
  `owner-hello`, `owner-home-card`, `owner-livestock-action-grid`, and the info-page set.
- **Inline-style heavy:** 273 `style=` attributes in `app.js`. They carry layout (margins, grids)
  and occasional hard-coded colours. Only colour values are tokenised in this migration.

## 14. Measured contrast of the DBIM Green palette (before any use)

Computed with the WCAG 2.x relative-luminance formula. Normal text needs 4.5:1; large text and UI
components need 3:1. Large text means 18.66px (14pt) bold or 24px regular and above.

| Foreground on background | Ratio | Result |
|---|---|---|
| `#FFFFFF` on `#0F5757` (900) | 8.33 | Normal text pass |
| `#FFFFFF` on `#2D8686` (700) | **4.32** | **Fails normal text (4.5). Passes large text and UI (3:1)** |
| `#000000` on `#2D8686` | 4.87 | Passes normal text (not the spec's white text) |
| `#0F5757` on `#2D8686` | 1.93 | Fails; do not place dark-teal text on the 700 fill |
| `#FFFFFF` on `#75BDBD` (500) | 2.15 | Fails; do not use 500 as a text background with white text |
| `#0F5757` on `#75BDBD` | 3.88 | Large text and UI only |
| `#0F5757` on `#A6D9D9` (300) | 5.37 | Normal text pass |
| `#0F5757` on `#D9F2F2` (100) | 7.11 | Normal text pass |
| `#2D8686` on `#FFFFFF` | 4.32 | UI boundary and graphics pass (3:1). **Not for body text** |
| `#2D8686` on `#D9F2F2` | 3.69 | UI pass. Not for body text |
| `#75BDBD` on `#FFFFFF` | 2.15 | **Not a UI boundary on white.** Never used as the only indicator |
| `#1B5E20` (success) on `#FFFFFF` | 7.87 | Pass |
| `#B71C1C` (danger) on `#FFFFFF` | 6.57 | Pass |
| `#D97706` (warning) on `#FFFFFF` | 3.19 | **Fails as text.** Use `#B45309` (5.02) for warning text |
| `#1565C0` (info) on `#FFFFFF` | 5.75 | Pass |
| `#475569` (muted text) on `#FFFFFF` | 7.58 | Pass |

**Conclusion:** the spec's primary button (`#2D8686` fill with white text) cannot meet the 4.5:1
normal-text threshold. The migration therefore sets primary-button labels to large-text size (18.7px,
weight 700), which meets the 3:1 large-text threshold at 4.32:1. This is a documented trade-off, and
§17 explains the alternatives.

## 15. Baseline test results (before any change)

| Suite | Result |
|---|---|
| `backend/run_tests.sh` (Python 3.11.2 venv from `backend/requirements.txt`) | **10 / 10 suites PASS** (344 tests: regression 10, role_auth 30, farmer_otp_login 60, webcalling 70, demo_account 34, clerk_login 15, helpline 34, all_features 12, ml_service 16, compliance 63) |
| `node --test frontend/tests/*.test.mjs` | **92 tests: 90 pass, 0 fail, 2 skipped** (both skipped tests are the real two-browser WebRTC tests, which need `PM_BROWSER_URL`) |
| Repository state | Clean working tree on `arena/a45f5386-pashu-shield-updated`, HEAD `bdd02d4` |

## 16. Risk areas for regression

1. **String-matched CSS in tests** (must be preserved or intentionally updated):
   - `branding_webcall_states.test.mjs`: `.pm-brand-logo{…object-fit:contain`, `.pm-logo-img{…height:40px; width:auto`, and no `aspect-ratio` on `.pm-logo-img`.
   - `officer_access_gis_i18n.test.mjs`: `.gis-map { … height: <n>px`.
   - `backend/test_compliance.py`: `test_67` (legacy brand token values, see §17), `test_68` (font stack), `test_69` (reduced motion), `test_70` (focus-visible, `--pm-focus`), `test_71` (print block: `.bottom-nav`, `@page`, `size:A4`), `html.pm-high-contrast{`.
2. **Escape call sites in `app.js`** asserted by `test_90`–`test_97`: `escapeHtml(a.animal_name`, `escapeHtml(a.animal_code`, `safeId(a.id)`, `escapeJsStr(a.animal_code)`, `escapeHtml(i.label)`, `escapeHtml(i.value)` in chart code. The chart refactor must keep these calls.
3. **DOM IDs used by JavaScript and tests** must not change: `otpMobile`, `otpSendBtn`, `otpCode`, `otpVerifyBtn`, `otpResendBtn`, `otpResendHint`, `otpMissingHint`, `otpChangeMobile`, `otpUseDemoBtn`, `farmerDemoAccount`, `farmerDemoAccountSlot`, `farmerProfileStep`, `farmerOtpForm`, `loginForm`, `registerForm`, `pm_identifier`, `pm_password`, `gisTable`, `gisSummary`, `gisTop`, `gisUnmappedWarn`, `pmCall*`, `pmVet*`, `pmSiteHeaderHost`, `pmA11yBarHost`, `pmLivePolite`, `pmLiveAssertive`, `pmGlobalLangSelect`, `pmCaptchaFarmer`.
4. **Service worker cache:** `sw.js` serves static assets cache-first from `pashu-mitra-v10`. Without a
   version bump, returning users keep the old CSS.
5. **Web-call overlay:** the state text and routability logic must stay honest. Colour changes must
   not replace text.
6. **High-contrast mode** overrides the legacy `--primary`, `--color-*` and `--green/--red` tokens.
   Changing the base tokens must not break that mode.
7. **Leaflet map** needs an explicit px height and must keep `z-index` stacking.
8. **Repository-tracked files:** `backend/animal_health.db` and `backend/server.log` are tracked. The
   test runner restores the DB. Local verification uses a throwaway DB outside the repo.
9. **Demo accounts:** the farmer demo card must remain server-config driven and must not be hard-coded.

## 17. Decisions this audit leads to (detailed in the change log)

- **Brand:** navy → DBIM Green. The five exact hex values become the palette and the single source
  of truth for brand colours.
- **Primary action:** `#2D8686` fill with white labels at large-text size (18.7px / 700). Alternatives
  documented for the owner: black label (4.87:1, not the spec's white), or `#0F5757` fill (8.33:1, not the
  spec's fill).
- **Hover states:** `#2D8686` is not used as a text-bearing hover background (4.32:1). Hover uses a
  translucent white tint plus `#75BDBD` indicator, which passes 3:1 on `#0F5757`.
- **Functional colours:** the existing values are kept (success `#1B5E20`, danger `#B71C1C`,
  warning `#D97706` for icons and borders with `#B45309` for warning text, info `#1565C0`). Brand green is
  never used for status.
- **Legacy test expectations:** `test_67` asserts the old navy/blue brand tokens. Those tokens
  are replaced on purpose; the test is updated to assert the new DBIM tokens and keep the high-contrast
  opt-in rule. The change is reported, not hidden.
- **Service worker:** cache name bumped to `pashu-mitra-v11`.
- **Accessibility fixes in scope:** label-in-name, role-banner contrast, login `<h1>`, duplicate banner
  landmark, nested-interactive chart markup, invalid list roles, call mute button contrast.
- **Typography utilities:** define the missing `pm-h1/h2/h3`, `pm-small`, `pm-caption` and other classes
  so that headings follow the design system.
- **Out of scope:** routes, APIs, auth, RBAC, WebRTC signalling and TURN, GIS data, database, the
  staff-portal language scope.

---

*This audit is the baseline for the DBIM Green migration. The change log
(`dbim-green-redesign-change-log.md`) records what changed and how each item was verified.*
