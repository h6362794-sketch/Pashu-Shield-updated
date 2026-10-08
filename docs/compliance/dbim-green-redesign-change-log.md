# Pashu-Mitra — DBIM Green Redesign: Change Log

**Branch:** `arena/a45f5386-pashu-shield-updated` · **Base:** `bdd02d4` (`main`) · **Baseline audit:** `dbim-green-redesign-audit.md`

**Status statement.** The DBIM Green primary colour group is implemented in the Pashu-Mitra
frontend. This is an implementation of the colour group supplied by the project owner. It is not a
DBIM certification, and no certification is claimed here.

---

## 1. Scope

- **In scope:** visual design system (tokens, components, layout tokens), header, navigation, homepage
  presentation, farmer, veterinarian, government and laboratory screens, forms, tables, charts, the
  WebRTC call UI (presentation only), the GIS map presentation, accessibility fixes found in the
  baseline, and service-worker cache versioning.
- **Out of scope and unchanged:** routes, REST and Socket.IO endpoints, authentication and OTP flows,
  RBAC, WebRTC signalling, presence, routing, TURN and STUN configuration, GIS data, database schema,
  backend logic, and all deployment configuration. No backend Python file was changed except one
  compliance test (see §10).

## 2. Palette: old → new

| Role | Before | After (DBIM Green) |
|---|---|---|
| Brand foundation (header, nav, footer, headings, links) | `#102A6B` navy (`--pm-primary`) | `#0F5757` (green 900) |
| Strongest brand text / dark surface | `#0B1E48` navy (`--pm-primary-dark`) | `#0F5757` (green 900) |
| Primary action fill | `#102A6B` navy | `#2D8686` (green 700), white label at large-text size |
| Primary action hover | `#1E3A8A` navy | `#0F5757` (green 900) |
| Light brand surface | `#EEF2F6` / `#EFF6FF` / `#FFFBEB` tints | `#D9F2F2` (green 100) |
| Light borders on brand surfaces | `#CBD5E1`, `#BFDBFE` | `#A6D9D9` (green 300) |
| Decorative accent | `#D97706` saffron | `#75BDBD` (green 500), never used for text |
| Legacy blue primary | `#3d4db8`, `#2c3690`, `#2f6fed` | removed from the default theme |
| Per-role colours | farmer `#1fa971`, vet `#2f6fed`, govt `#8e24aa`, lab `#00838f` | one brand treatment; role identity comes from the text label |
| Chart series | 8 unrelated hues (`#3d4db8`, `#e2483f`, `#1fa971`, `#e08a1e`, `#8e24aa`, `#2f6fed`, `#6d4c41`, `#f4511e`) | green family first, then neutrals; text labels and legends carry the meaning |
| Cluster overlay (GIS) | purple `#8e24aa` / `#e1bee7` | green 900 outline, green 300 fill (dashed, as before) |
| Page background | `#F4F6FA` cool slate | `#F4F7F7` very light neutral |
| Borders | `#CBD5E1` | `#D9D9D9` neutral decorative; `#767676` for form control boundaries |

**Functional colours preserved (not changed):** success `#1B5E20`, danger `#B71C1C`, warning `#D97706`
(icons and boundaries) with `#B45309` for warning **text**, information `#1565C0`, and the legacy
`--green:#1fa971` and `--red:#e2483f`. The GIS risk colours (high `#E2483F`, moderate `#E08A1E`,
low `#1FA971`) keep their meaning. Brand green is never used for a status.

## 3. Design tokens

All brand hex values are declared once, in the `:root` token block of `frontend/style.css`.

- **DBIM primitives:** `--pm-green-900`, `--pm-green-700`, `--pm-green-500`, `--pm-green-300`, `--pm-green-100`.
- **Semantic brand:** `--pm-primary`, `--pm-primary-dark`, `--pm-primary-hover`, `--pm-primary-action`,
  `--pm-primary-light`, `--pm-primary-300`, `--pm-primary-500`, `--pm-accent`, `--pm-tint-hover`.
- **Functional:** `--pm-success*`, `--pm-danger*`, `--pm-warning`, `--pm-warning-text`, `--pm-warning-bg`,
  `--pm-warning-border`, `--pm-info*`.
- **Risk and charts:** `--pm-risk-high|moderate|low`, `--pm-chart-1…6`.
- **Surfaces and text:** `--pm-bg`, `--pm-surface`, `--pm-surface-subtle` (alias `--pm-surface-alt`),
  `--pm-border`, `--pm-border-subtle`, `--pm-border-strong`, `--pm-text`, `--pm-text-secondary`
  (alias `--pm-text-muted`), `--pm-link`, `--pm-focus`, `--pm-focus-on-dark`, `--pm-scrim`.
- **Shape and depth:** radius 8 / 12 / 16 px (`--pm-radius-sm|md|lg`) and pill for badges, chips and tags
  only; subtle shadows `--pm-shadow-sm|md|lg`; spacing scale 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 px.
- **Type:** `--pm-btn-primary-size: 18.7px` (WCAG large-text size for primary labels).
- **Legacy aliases** (`--primary`, `--bg`, `--muted`, `--green-*`, `--red-*`, `--orange-*`, `--blue-*`) map onto the
  new values so existing selectors keep working.
- **Visual system files:** still one stylesheet, `frontend/style.css`. No framework, no build step, no new
  dependency. Font stack (Noto Sans, self-hosted) unchanged.

## 4. Component changes

**Header and utility bar.** The utility bar is a light green-100 band with green-900 text. Its controls
(text-size A-/A/A+, high contrast, reduce motion, language, Help, Contact, Search) are unchanged in behaviour.
The brand header is green-900 with white text. The logo sits on a white tile so its own colours stay true.
"Farmer OTP Login" is a white button with green text; "Officer Access" is an outlined button. Search keeps
its behaviour. The utility bar is now a labelled region.

**Primary navigation.** Green-900 foundation with white items. Active item: green-100 surface, green-900 text,
plus `aria-current`. Hover: translucent white with a green-500 indicator (see §5 for why hover does not use
green-700 as a text background).

**Mobile bottom navigation.** Green-900 foundation, white labels, 48px tall items. Active item: green-100 tile
with green-900 label and icon. Labels are 12px (11px below 400px), with hyphenation where the browser supports it.

**Homepage.** The service content is unchanged, including all six headings and the emergency helpline. It is
presented on a white hero with a green top rule, a white pillar card with a green-700 left rule for each service,
and a light green helpline panel with a green-700 "Call 1962" button. The portal card (Animal Owner, Veterinarian, Govt Officer,
Laboratory Staff) is still absent. A test asserts this.

**Farmer portal.** Light surfaces with green headings and primary actions. The welcome panel is light green. The
"Report a problem" tile has a light green surface. The welcome line now shows a single count (see §8). Farmer
navigation and language switching are unchanged.

**Veterinarian portal.** The "Priority — Cases & Availability" card carries a green top rule (strongest
hierarchy). The "New Cases" metric carries a danger rule and its text label. The primary action is "View
Incoming Reports". The web-call availability card and its honest state text are unchanged. Call state chips
keep their text.

**Government portal.** KPI cards are restrained: white, a green-700 top rule, green-900 numbers, neutral labels.
Charts use the green family with text labels, value pills and data tables. The GIS entry is unchanged.

**Laboratory portal.** The same system, with no separate palette. Quick-access tiles and the bottom
navigation follow the shared components.

**Cards, buttons and forms.**
- Cards: white, 1px neutral border, 12px radius, subtle shadow.
- Buttons: primary is green-700 with white labels at 18.7px / 700 (see §5). Hover and active move to green-900.
  Secondary, outline, ghost, danger and success follow the same tokens. Disabled and busy states are kept.
- Forms: labels are dark neutral. Inputs are white with a 1.5px `#767676` boundary (4.54:1). Focus shows a 3px
  ring and a green-700 border. `aria-invalid` draws a danger border. The error summary and field-error styles
  that `a11y.js` already emits are now defined (before, they had no CSS).
- Badges: pills with text. Status uses the functional colours only.

**Tables.** White body, light green-100 header with green-900 text, subtle row rules, a very light green row
hover, and horizontal scroll on small screens. Row headers in the body are no longer styled as column headers.
The GIS district table is now a labelled, keyboard-scrollable region.

**Charts.** Bar charts use a solid green-700 fill (the gradient is removed). Pie charts use the green family and
neutrals. Every chart has a text summary, value labels, legends, and a `<details>` data table. The focusable table
now sits outside the `role="img"` graphic (see §5).

**WebRTC call UI.** The overlay is styled as a bottom-docked call panel. It does not block the page. Answer is
success green, decline is danger red, mute while muted is warning-text amber, and the call buttons are 48px.
Every state keeps its text. Signalling, presence, routing, ICE, STUN, TURN, mute, hang-up and reconnect logic are
unchanged.

**GIS risk map.** The map container keeps its explicit height. The controls, risk chips, legend, status line and
summary cards use the new tokens. Risk colours keep their meaning. The district outline uses green-900, and the
cluster overlay uses green-900 and green-300.

**Officer Access.** A flat green-900 header replaces the navy gradient. All three role tiles share one light
green surface. The tiles are routing buttons only, with no credential fields.

**Footer.** Green-900 foundation with white headings, light green body text, and white underlined links. Every
link from the baseline is kept.

**Search, notifications, toast, modals.** Search keeps its behaviour and uses the new field and button styles.
Toasts use green-900, or danger for errors. Modal scrims use a green-900 tint.

## 5. Decisions that need owner awareness

1. **Primary button label size.** White on `#2D8686` is **4.32:1**. That passes the 3:1 large-text rule but
   misses the 4.5:1 normal-text rule. Primary labels are therefore 18.7px / 700, which is WCAG large text. This is
   larger than the old button labels. The alternatives are a black label (4.87:1, not the specified white), or a
   `#0F5757` fill (8.33:1, not the specified fill). Both are the owner's call.
2. **Hover does not use `#2D8686` as a text background.** The specified hover colour would drop contrast below
   4.5:1 for 14–15px labels. Hover uses a translucent white tint with a `#75BDBD` indicator, which is 3.88:1 on
   green-900.
3. **Warning text uses `#B45309`, not `#D97706`.** Amber on white is 3.19:1. The darker token is 5.02:1.
4. **Green-500 `#75BDBD` is never text.** On white it is 2.15:1. It appears only as decorative accents and as
   secondary chart and map elements, always with a text label or legend.
5. **The utility bar is light green-100**, not dark. This keeps the teal header as the single dark band. This
   is a design choice and can be changed in one token.

## 6. Accessibility changes

**Baseline axe-core results (live Chromium, 8 pages, rules `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, best practice):**
35 violated rule groups before the change, **0 after**.

| Finding (baseline) | Fix |
|---|---|
| Label in name (WCAG 2.5.3): `A-`, `A+`, `A` and the brand link | Accessible names start with the visible text (for example "Decrease text size, A-") |
| Label in name: "Call 1962" and officer role tiles and owner tiles | Tile names come from their visible title and description; the call button label matches its visible text |
| Colour contrast: farmer role banner `#1fa971` text on a 10% tint, **2.71:1** | Role banner is green-900 on green-100, **7.11:1** |
| Colour contrast: muted-call button white on `#D97706`, **3.19:1** | Muted state uses `--pm-warning-text` with white, **5.02:1** |
| Page has no `<h1>` on login screens | Login titles are `<h1>` |
| Two banner landmarks, one nested in `<main>` | The in-page header is no longer a banner |
| Focusable `<details>` inside `role="img"` (nested interactive) | Graphic and data table are siblings |
| `role="list"`/`role="listitem"` on buttons (invalid ARIA) | Roles removed |
| Duplicate navigation landmark names | Header navigation is "Site navigation"; bottom navigation keeps "Primary navigation" |
| Utility controls outside any landmark (region rule) | Utility bar is a labelled region |

**Other accessibility work:**
- Focus rings use the light focus colour on dark brand surfaces, and the green-900 ring on light surfaces.
- Reduced motion, high contrast and print are preserved. High contrast now also covers the new light
  surfaces, so the opt-in mode stays usable.
- Touch targets: primary buttons 48px, the bottom navigation 48px, call controls 48px, and on coarse pointers the
  utility and crumb controls 44px.
- Indic scripts use a larger line height so Hindi, Marathi and Telugu marks do not clip.
- Labels, error summary, `aria-invalid` and `aria-describedby` behaviour is unchanged.

## 7. Responsive changes

- Farmer header: the brand name never wraps, and the language control wraps to its own line on narrow phones.
- Bottom navigation: 11px labels below 400px with tighter padding, so "Notifications" no longer breaks mid-word
  on common phones.
- GIS table: scrolls inside its region instead of pushing the page wider than the viewport.
- Utility bar and breadcrumb controls: minimum sizes raised (see §6).
- Call panel: docked full width on phones, with 8px margins.

**Measured.** Eight screens at nine widths (320, 360, 390, 480, 768, 1024, 1280, 1366, 1440): **72 / 72**
combinations have no page-level horizontal overflow and no visible content clipped. Excluded by design: the
bot honeypot field (positioned at −9999px and hidden from assistive technology) and the skip link (off-screen
until focused). Remaining controls under 24px are inline text links inside sentences (WCAG 2.2 exception) and
map attribution. Checkboxes sit inside 40px labels.

## 8. Multilingual changes

**Defects corrected** (pre-existing, found during verification):
1. **The global language selector did not switch the language.** The shell called the page router directly,
   so the app's language state never changed. The shell now delegates to the app's `setLang()`. The global and
   farmer selectors now agree, and the choice is persisted. Verified: Hindi sets `<html lang="hi">`, the
   farmer navigation is translated ("होम | मेरे पशु | …"), and Telugu works.
2. **The brand was transliterated in farmer-facing text.** `farmer.app_name`, `farmer.helpline_name` and several
   OTP sentences used Devanagari or Telugu forms of "Pashu-Mitra" (for example "पशुमित्रात", "पशु-मित्र में").
   They now read "Pashu-Mitra" in every language, as the requirements specify.
3. **Double count on the farmer dashboard.** The welcome line showed "0 0 animals" because the template added the
   number to a translation that already contained it. It now shows "0 animals".

**Not changed:** the four languages, all translation keys, and the staff portals' English-only scope.

**Other pre-existing defect corrected.** The farmer dashboard's "active cases" count called `/api/farmer/cases`,
which does not exist (HTTP 404), so the count always showed 0 and the error was silently swallowed. It now uses
`/api/cases`, the existing endpoint that the server scopes to the signed-in farmer (`owner_id = uid`). No backend
change was needed, and no farmer can see another farmer's cases.

## 9. Authentication and RBAC

- Frontend authentication paths are unchanged. The OTP flow, demo card, staff password login, registration
  and forgot-password screens and Officer Access routing are the same. No credential handling changed.
- The Farmer demo card still comes from the server configuration and is still hidden when demo mode is off.
- RBAC is enforced by the unchanged backend. The backend test suites pass (see §10).

## 10. Files changed

| File | Change |
|---|---|
| `frontend/style.css` | Rewritten on the DBIM Green token system. Checked programmatically: every class and ID defined by the previous stylesheet is still defined (none removed). Of the 113 class names the templates use without a rule, 91 now have one, including the heading utilities `pm-h1/h2/h3`, `pm-small`, `pm-caption`, `small-muted`, the call overlay, timeline, progress, pagination, error summary and info-page classes. The remaining 22 are behavioural hooks (for example `show`, `pm-tooltip-visible`), bot-check widget classes, and chart wrappers styled by their parents. |
| `frontend/app.js` | Inline colours tokenised; farmer active-case count uses the role-scoped `/api/cases` (was a 404); role banners unified; Officer Access tiles and roles; header landmark fix; chart markup and palette; GIS table wrapper and cluster colours; vet priority card and urgent metric; hero banner colours; homepage helpline note and label; owner tiles; farmer welcome-count fix; brand transliterations corrected; login headings to `<h1>`. |
| `frontend/shell.js` | Accessible names for text-size and brand controls; utility bar region; "Site navigation" label; language selector delegates to `setLang()`; four-language labels for the new strings. |
| `frontend/index.html` | `theme-color` is `#0F5757`. |
| `frontend/manifest.json` | `theme_color` is `#0F5757`. |
| `frontend/captcha.js` | Two inline tints tokenised. |
| `frontend/sw.js` | Cache name `pashu-mitra-v11`, so returning users receive the new stylesheet. |
| `frontend/tests/dbim_green_design_system.test.mjs` | **New.** 42 source-level guards: palette declared once; no retired navy; functional palette preserved; 21 WCAG contrast pairs computed; brand chrome flat; typography and state classes defined; homepage without the portal card; no white text on light banners; no per-role colours; accessible-name fixes; service-worker version; brand never transliterated in rendered sources. |
| `backend/test_compliance.py` | `test_67` (exemption 4.3) updated. See below. |
| `docs/compliance/dbim-green-redesign-audit.md` | **New.** Pre-change audit. |
| `docs/compliance/dbim-green-redesign-change-log.md` | **New.** This document. |

**Test change, reported explicitly.** `test_67` asserted the legacy navy and blue brand tokens as "Exemption
4.3 — brand colours preserved". That exemption is superseded by this migration. The test now asserts the five
DBIM Green primitives (declared once), the absence of the retired navy primary, the preserved functional values,
and the high-contrast opt-in rule. Its docstring states the change. Nothing else in the test was weakened.

**Not changed, deliberately.** `frontend/org-config.js` keeps its dormant `appNameLocal: "पशु-मित्र"`. An existing
test pins it, and no screen renders it. Owner action: decide whether to remove the field.

## 11. Verification

### 11.1 Automated test suites

| Suite | Result |
|---|---|
| `backend/run_tests.sh` (Python 3.11.2 venv from `backend/requirements.txt`) | **10 / 10 suites PASS**, 344 tests (same count as baseline; `test_67` updated in place) |
| `node --test frontend/tests/*.test.mjs` | **134 tests: 132 pass, 0 fail, 2 skipped.** Baseline was 92 tests (90 pass, 2 skipped). The 42 new tests are in the design-system file. The 2 skipped tests are the real two-browser WebRTC tests, which need `PM_BROWSER_URL`, `PM_VET_*` and `PM_FARMER_*`. They are covered by the browser run below. |

### 11.2 Browser verification (headless Chromium 131, local gunicorn, throwaway SQLite file)

Chromium was run headless from `/tmp`, outside the repository. The tracked `backend/animal_health.db` was not
modified. The baseline was captured from the untouched code, and the final run used the redesigned code.

**Accessibility (axe-core 4.14.0)**
- Final: **0 violations on 8 screens** (homepage, farmer login at 390px, Officer Access, vet login, vet dashboard,
  government dashboard, GIS, farmer dashboard at 390px). Each screen has 2–3 "incomplete" items that axe cannot
  decide automatically.
- Baseline: 35 violated rule groups across the same screens.
- **Not run:** Lighthouse and pa11y were not run. They are reported as NOT VERIFIED. No scores are claimed.

**Responsive:** 72 / 72 combinations at 320–1440px (see §7).

**Functional flows (UI, real backend): 21 / 21 pass, 0 JavaScript page errors**
- Farmer OTP login with the demo card: request code, six digits verify, dashboard opens. (Six digits verify
  automatically; that is existing behaviour.)
- Farmer welcome line shows a single count.
- Farmer language: Hindi and Telugu switch the page and the navigation; the brand stays "Pashu-Mitra".
- Officer Access lists the three roles, has no credential fields, and "Veterinarian" opens the sign-in form.
- Vet staff password login through the real form lands on the vet dashboard; the web-call availability card renders.
- GIS: Leaflet map renders; live district markers are drawn (3 shapes: outline and 2 districts); the data table
  has 2 rows in a labelled, keyboard-scrollable region; risk summary cards render.
- Search page renders its input.

**WebRTC (two real Chromium contexts, real backend, Socket.IO signalling)**
- **12 / 12 pass.**
- The vet is routable (available, socket connected, presence live): "CONNECTED · AVAILABLE — receiving calls".
- The farmer's Call Veterinarian rings the vet. The vet answers. Both sides show "Connected" with a running timer.
- Real media: ICE connected on both sides. Inbound audio RTP was received on both sides (360 packets each
  way, from `RTCPeerConnection.getStats()`). A second call also connects and carries audio (208 packets).
- Hang-up ends the call on both sides. Mute and unmute change the control's state.
- Visual check: the ringing and connected panels render correctly on a 390px phone.
- Final run on a fresh database after a clean server start: the same results.
- **Not verified:** reconnection after a network drop; **TURN relay** (not exercised, because both browsers ran on
  one host and connected directly); audio level while muted (only the control state was checked).

**GIS real-data result:** the map loads and the data arrives from the live API. Markers, the table and summary
render. **Marker popups did not open** when clicked or hovered in headless Chromium. The original code behaves
identically, so this is an environment or pre-existing behaviour and is reported as **NOT VERIFIED**, not as a
pass. The basemap tiles (OpenStreetMap) are blank in the sandbox, which has no internet access.

### 11.3 Screens checked visually

Homepage, vet dashboard, farmer dashboard (390px), GIS (1366px), call panels (vet ringing and farmer connected
at 390px), and every screen in the axe run. The screenshots and axe JSON were captured locally and are not
committed, in line with the repository policy on generated artefacts. Emoji glyphs render as boxes in the
sandbox because it has no colour-emoji font. That is an environment limit, not a product defect.

## 12. Remaining issues and owner decisions

1. **Primary button size and colour**: owner decision (see §5.1).
2. **GIS marker popups**: not verified in headless Chromium. Check manually in a desktop browser.
3. **TURN relay and reconnection**: not exercised. Run the two-browser test against the deployed backend with
   TURN configured, and test a network drop.
4. **Lighthouse and pa11y**: not run. Run them against a deployed build.
5. **Physical devices and other browsers**: only Chromium was tested. Firefox, Safari and real phones are not verified.
6. **Staff portals** (vet, government, laboratory) remain English-only. This is the existing scope and was not extended.
7. **Required-field indicators**: the `pm-req` style and the error-summary styles exist, but the existing forms do
   not yet add visible asterisks. Add them in a follow-up if owners want them.
8. **Utility bar height on phones**: about 250px when wrapped. It is the existing layout, now restyled. A
   compact mobile variant would help.
9. **Dormant `appNameLocal`** in `org-config.js` (see §10).
10. **Historical compliance documents** (for example `ui-ux-audit.md`) still describe the navy palette. They are
    records of earlier work and were not rewritten.
11. **DBIM certification** is not claimed. Confirm the functional colour values and the button size treatment with
    the DBIM owner before any certification request.
