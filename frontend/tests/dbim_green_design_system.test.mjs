/**
 * DBIM Green design-system guards (source-level, no browser needed).
 *
 *   node --test frontend/tests/
 *
 * What these checks protect:
 *  - the five DBIM Green primary values are declared exactly once, and the
 *    retired navy brand is no longer the primary colour;
 *  - the functional status palette is preserved (brand green is never a status);
 *  - the text, surface and boundary pairs the design relies on meet WCAG 2.1
 *    contrast. Ratios are computed here with the relative-luminance formula;
 *  - brand chrome (header, navigation, footer, bottom navigation) is flat;
 *  - regressions that were found in the baseline audit cannot silently return:
 *    white text on light banners, per-role coloured banners, the homepage
 *    portal card, role="banner" inside <main>, and stale service-worker CSS.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

const css = read("style.css");
const appSource = read("app.js");
const shellSource = read("shell.js");
const indexHtml = read("index.html");
const manifest = JSON.parse(read("manifest.json"));
const swSource = read("sw.js");

// The default theme's :root token block (high-contrast overrides come later).
const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("/* ---------- base & reset"));

// ---------------------------------------------------------------- contrast --
function rgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const DBIM = { 900: "#0F5757", 700: "#2D8686", 500: "#75BDBD", 300: "#A6D9D9", 100: "#D9F2F2" };

/** Returns the body of the first top-level rule whose selector list starts with `selector`. */
function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `rule for ${selector} not found`);
  return match[1];
}

// ------------------------------------------------------------------ palette --
test("the five DBIM Green primary values are declared exactly once", () => {
  for (const [step, hex] of Object.entries(DBIM)) {
    const declarations = css.match(new RegExp(`--pm-green-${step}:\\s*${hex}\\s*;`, "gi")) || [];
    assert.equal(declarations.length, 1, `--pm-green-${step} must be ${hex}, declared once`);
  }
});

test("the default theme no longer uses the retired navy or legacy blue as its brand", () => {
  for (const retired of ["#102A6B", "#0B1E48", "#1E3A8A", "#3d4db8", "#2c3690"]) {
    assert.doesNotMatch(rootBlock, new RegExp(retired, "i"), `${retired} must not be a default token`);
  }
  assert.match(rootBlock, /--pm-primary:\s*var\(--pm-green-900\)/);
  assert.match(rootBlock, /--pm-primary-action:\s*var\(--pm-green-700\)/);
  assert.doesNotMatch(css, /#102A6B/i, "no navy literal may remain in the stylesheet");
});

test("functional status colours are preserved (brand green is never a status)", () => {
  assert.match(rootBlock, /--pm-success:\s*#1B5E20;/);
  assert.match(rootBlock, /--pm-danger:\s*#B71C1C;/);
  assert.match(rootBlock, /--pm-warning:\s*#D97706;/);
  assert.match(rootBlock, /--pm-warning-text:\s*#B45309;/);
  assert.match(rootBlock, /--pm-info:\s*#1565C0;/);
  // Risk colours keep their meaning on the map.
  assert.match(rootBlock, /--pm-risk-high:\s*#E2483F;/);
  assert.match(rootBlock, /--pm-risk-moderate:\s*#E08A1E;/);
  assert.match(rootBlock, /--pm-risk-low:\s*#1FA971;/);
});

// ----------------------------------------------------------------- contrast --
const PAIRS = [
  // [what it is, foreground, background, WCAG minimum]
  ["body text on the page background", "#0F172A", "#F4F7F7", 4.5],
  ["secondary text on white", "#475569", "#FFFFFF", 4.5],
  ["secondary text on the light brand surface", "#475569", DBIM[100], 4.5],
  ["headings and links on white", DBIM[900], "#FFFFFF", 4.5],
  ["headings on the page background", DBIM[900], "#F4F7F7", 4.5],
  ["header text on the brand foundation", "#FFFFFF", DBIM[900], 4.5],
  ["tagline on the brand foundation", DBIM[100], DBIM[900], 4.5],
  ["footer secondary text on the brand foundation", DBIM[300], DBIM[900], 4.5],
  ["active navigation item (text on light surface)", DBIM[900], DBIM[100], 4.5],
  ["table header text on the light brand surface", DBIM[900], DBIM[100], 4.5],
  ["primary button label (large-text size, 18.7px bold)", "#FFFFFF", DBIM[700], 3],
  ["form control boundary on white", "#767676", "#FFFFFF", 3],
  ["focus ring on white", DBIM[900], "#FFFFFF", 3],
  ["focus ring on the brand foundation", DBIM[100], DBIM[900], 3],
  ["chart primary series against white (graphic)", DBIM[700], "#FFFFFF", 3],
  ["success text on success surface", "#1B5E20", "#E8F5E9", 4.5],
  ["danger text on danger surface", "#B71C1C", "#FFEBEE", 4.5],
  ["warning text on warning surface", "#B45309", "#FFFBEB", 4.5],
  ["information text on information surface", "#1565C0", "#E3F2FD", 4.5],
  ["white label on the success action", "#FFFFFF", "#1B5E20", 4.5],
  ["white label on the danger action", "#FFFFFF", "#B71C1C", 4.5],
  ["white label on the muted-call action", "#FFFFFF", "#B45309", 4.5],
];

for (const [label, fg, bg, minimum] of PAIRS) {
  test(`contrast ${label}: ${fg} on ${bg} >= ${minimum}:1`, () => {
    const ratio = contrast(fg, bg);
    assert.ok(ratio >= minimum, `${label}: ${ratio.toFixed(2)}:1 is below ${minimum}:1`);
  });
}

test("the documented exceptions stay out of body text", () => {
  // White on the 700 fill is 4.32:1: it is allowed only as large text (primary labels).
  assert.ok(contrast("#FFFFFF", DBIM[700]) >= 4.3 && contrast("#FFFFFF", DBIM[700]) < 4.5);
  // 500 is 2.15:1 against white, so it must never be a text colour on white.
  assert.ok(contrast(DBIM[500], "#FFFFFF") < 3);
  // Warning amber is 3.19:1 as text on white. Warning text uses the darker token.
  assert.ok(contrast("#D97706", "#FFFFFF") < 4.5);
  assert.match(rootBlock, /--pm-warning-text:\s*#B45309;/);
});

test("primary button labels are at the WCAG large-text size with a floor", () => {
  assert.match(rootBlock, /--pm-btn-primary-size:\s*18\.7px;/);
  const primary = ruleBody(".btn-primary");
  assert.match(primary, /font-size:\s*max\(var\(--pm-btn-primary-size\)/);
  assert.match(primary, /background:\s*var\(--pm-primary-action\)/);
  assert.match(primary, /color:\s*#ffffff/);
});

// ------------------------------------------------------------ brand chrome --
test("brand chrome is flat: no gradients on header, navigation, footer or bottom nav", () => {
  for (const selector of [".pm-site-header", ".pm-primary-nav", ".pm-footer", ".bottom-nav", ".pm-officer-head", ".btn-primary"]) {
    assert.doesNotMatch(ruleBody(selector), /gradient/, `${selector} must not use a gradient`);
  }
  // The only gradients left are the national tricolour stripe (hard stops) and the loading shimmer.
  const gradients = css.match(/linear-gradient\([^;]*\)/g) || [];
  assert.equal(gradients.length, 2, `unexpected gradient count: ${gradients.length}`);
});

test("the header and navigation foundation use the brand token", () => {
  assert.match(ruleBody(".pm-site-header"), /background:\s*var\(--pm-primary\)/);
  assert.match(ruleBody(".pm-primary-nav"), /background:\s*var\(--pm-primary\)/);
  assert.match(ruleBody(".bottom-nav"), /background:\s*var\(--pm-primary\)/);
  assert.match(ruleBody(".nav-item.active"), /background:\s*var\(--pm-green-100\)/);
  assert.match(ruleBody(".nav-item.active"), /color:\s*var\(--pm-green-900\)/);
});

test("focus rings on dark brand surfaces use the light focus colour", () => {
  assert.match(css, /\.pm-site-header :focus-visible,[\s\S]*?outline-color:\s*var\(--pm-focus-on-dark\)/);
});

test("the stylesheet defines the typography and state classes the templates use", () => {
  for (const cls of ["pm-h1", "pm-h2", "pm-h3", "pm-small", "pm-caption", "small-muted",
    "pm-field-error", "pm-error-summary", "pm-req", "pm-chart-details", "pm-call-overlay",
    "pm-pagination", "timeline-item", "progress-wrap", "pm-placeholder", "pm-faq-item"]) {
    assert.match(css, new RegExp(`\\.${cls}\\b`), `.${cls} has no CSS rule`);
  }
});

// -------------------------------------------------------- regression guards --
test("the homepage keeps the service content and has no portal card", () => {
  const start = appSource.indexOf("function renderRoleSelect()");
  const end = appSource.indexOf("function validRole(");
  assert.ok(start > 0 && end > start, "renderRoleSelect() not found");
  const homepage = appSource.slice(start, end);
  for (const phrase of ["Integrated Livestock Healthcare & Surveillance Network", "Citizen Livestock Services",
    "Veterinary Clinical Operations", "Epidemiology & State Surveillance", "Diagnostic Laboratory Network",
    "National Animal Disease Emergency Helpline"]) {
    assert.ok(homepage.includes(phrase), `homepage lost: ${phrase}`);
  }
  for (const cardText of ["auth.choose", "Choose your portal", "Animal Owner", "Govt Officer", "Laboratory Staff", "Veterinarian"]) {
    assert.ok(!homepage.includes(cardText), `homepage must not contain the portal card text: ${cardText}`);
  }
  assert.match(appSource, /route\("#\/", \(\) => renderRoleSelect\(\)\);/);
});

test("role banners carry no per-role colour (identity comes from the text label)", () => {
  assert.doesNotMatch(appSource, /class="role-banner" style=/);
  assert.doesNotMatch(appSource, /#8e24aa|#e1bee7|#2f6fed|#3d4db8|#00838f/i,
    "old per-role or chart purples/blues must not return to the templates");
});

test("no hero banner sets white text on the light banner surface", () => {
  assert.doesNotMatch(appSource, /color:rgba\(255,255,255,0\.9\)/);
});

test("the in-page header is not a second banner landmark", () => {
  assert.doesNotMatch(appSource, /class="app-header[^"]*"\s+role="banner"/);
  assert.match(shellSource, /<header class="pm-site-header" id="site-header" role="banner">|'<header class="pm-site-header" id="site-header" role="banner">'/);
});

test("login screens expose a level-one heading", () => {
  assert.match(appSource, /<h1>Pashu-Mitra · \$\{t\(meta\.label\)\}<\/h1>/);
  assert.match(appSource, /<h1>\$\{tx\.title\}<\/h1>/);
});

test("chart charts keep the focusable data table outside the role=img graphic", () => {
  assert.doesNotMatch(appSource, /role="img" aria-label="\$\{escapeAttr\(summary\)\}" class="pm-chart pm-(bar|pie)-chart"/);
  assert.match(appSource, /<div class="pm-chart-bars" role="img" aria-label="\$\{escapeAttr\(summary\)\}"/);
  assert.match(appSource, /<div role="img" aria-label="\$\{escapeAttr\(summary\)\}" style="display:flex;gap:20px/);
});

test("accessible names start with the visible label text (WCAG 2.5.3)", () => {
  assert.match(shellSource, /T\("decreaseText"\) \+ ", A-"/);
  assert.match(shellSource, /T\("increaseText"\) \+ ", A\+"/);
  assert.match(shellSource, /T\("resetText"\) \+ ", A"/);
  assert.match(shellSource, /\(org\.appName \|\| "Pashu-Mitra"\) \+ " " \+/);
  assert.match(appSource, /aria-label="Call 1962, national animal health helpline"/);
});

test("browser chrome colours and manifest use the brand", () => {
  assert.match(indexHtml, /<meta name="theme-color" content="#0F5757" \/>/);
  assert.equal(manifest.theme_color, "#0F5757");
  assert.equal(manifest.name.includes("Pashu-Mitra"), true);
});

test("the service worker cache name changed with the stylesheet", () => {
  const match = swSource.match(/CACHE_NAME = "pashu-mitra-v(\d+)"/);
  assert.ok(match, "CACHE_NAME not found");
  assert.ok(Number(match[1]) >= 11, `cache must be bumped past v10 (found v${match[1]}) so returning users get the new CSS`);
  assert.match(swSource, /"\/style\.css"/);
});

test("the brand identity is still exactly Pashu-Mitra in the visible shell", () => {
  assert.doesNotMatch(shellSource, /Pashu[\s-]?Shield/i);
  assert.doesNotMatch(appSource, /Pashu[\s-]?Shield/i);
});

test("the product name is never transliterated in any frontend string (Pashu-Mitra in every language)", () => {
  // Devanagari and Telugu transliterations of the brand that were found in the baseline audit.
  const transliterations = ["पशु-मित्र", "पशुमित्र", "పశు-మిత్ర"];
  // Rendered sources only. org-config.js keeps its configured Devanagari value,
  // which an existing test pins and which no screen renders.
  for (const name of ["app.js", "shell.js", "info-pages.js", "a11y.js", "call.js", "captcha.js", "index.html"]) {
    const source = read(name);
    for (const t of transliterations) {
      assert.ok(!source.includes(t), `${name} transliterates the brand as "${t}"`);
    }
  }
});
