// DBIM shell (Header 3 / nav / footer / cookie consent) + OFFICIAL logo rules.
// node --test frontend/tests/shell_official_logo.test.mjs
//
// This is the merge-adapted successor of the redesign ZIP's shell3.test.mjs and
// logo_rules.test.mjs. The ZIP's generated shield/horns logo kit is NOT used:
// the owner supplied the official Pashu-Mitra mark (green veterinary cross +
// cow head) at frontend/assets/pashu-mitra-logo.png, so the assertions below
// gate THAT artwork and the DBIM shell contract around it.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

function makeEnv(lang = "en", orgPatch = {}) {
  const store = {};
  const sb = {
    console, Event: class {}, setTimeout,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    location: { hash: "#/about" },
    document: { documentElement: { getAttribute: () => lang, lang }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} },
    addEventListener() {},
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(read("org-config.js"), sb);
  Object.assign(sb.ORG, orgPatch);
  vm.runInContext(read("validators.js"), sb);
  vm.runInContext(read("dbim-shell.js"), sb);
  return sb;
}

// every internal route registered anywhere in the app
const registered = new Set();
for (const f of ["app.js", "call.js", "info-pages.js"]) {
  for (const m of read(f).matchAll(/route\("(#\/[^"]+)"/g)) registered.add(m[1]);
  for (const m of read(f).matchAll(/route\(`(#\/\$\{role\}\/[^`]+)`/g)) for (const r of ["owner", "vet", "govt", "lab"]) registered.add(m[1].replace("${role}", r));
}
const patterns = [...registered].map(r => new RegExp("^" + r.replace(/:[^/]+/g, "[^/]+") + "$"));
const routeExists = h => h === "#/" || patterns.some(p => p.test(h.split("?")[0]));
const hrefs = html => [...html.matchAll(/href="(#\/[^"]*)"/g)].map(m => m[1]);

test("header: official Pashu-Mitra logo, nav labels, search form, language 'अ | A', 3 text-size buttons", () => {
  const { PMShell3 } = makeEnv();
  const h = PMShell3.renderHeader();
  assert.match(h, /role="banner"/);
  assert.match(h, /assets\/pashu-mitra-logo\.png/);              // official artwork, byte-for-byte
  assert.match(h, /alt="Pashu-Mitra"/);                          // accessible name
  assert.match(h, /aria-label="Pashu-Mitra – Home"/);
  for (const label of ["Home", "About us", "Services", "Documents", "Resources", "Connect"]) assert.ok(h.includes(">" + label + "<"), label);
  assert.match(h, /role="search"/);
  assert.match(h, /अ \| A/);
  assert.equal((h.match(/data-pm-size=/g) || []).length, 3);
});

test("the rejected shield/horns logo kit is not referenced anywhere in the frontend", () => {
  for (const f of ["index.html", "dbim-shell.js", "shell.js", "app.js", "org-config.js", "manifest.json", "sw.js"]) {
    const s = read(f);
    assert.doesNotMatch(s, /assets\/brand\/pashumitra_/i, f);
    assert.doesNotMatch(s, /build_logos/i, f);
  }
});

test("navigation is at most 3 levels and every internal link is a registered route", () => {
  const { PMShell3 } = makeEnv();
  for (const n of PMShell3.navModel()) if (n.items) for (const s of n.items) assert.ok(!s.items, "no 4th level");
  const all = hrefs(PMShell3.renderHeader()).concat(hrefs(PMShell3.renderFooter()));
  assert.ok(all.length > 15);
  for (const h of all) assert.ok(routeExists(h), "broken internal link: " + h);
});

test("persona entry points for farmer, veterinary officer, administrator and laboratory", () => {
  const h = makeEnv().PMShell3.renderHeader();
  for (const r of ["owner", "vet", "govt", "lab"]) assert.ok(h.includes('href="#/login/' + r + '"'), r);
});

test("disclosure menus: aria-expanded + aria-controls, hidden panels", () => {
  const h = makeEnv().PMShell3.renderHeader();
  const n = (h.match(/data-pm-disc/g) || []).length;
  assert.ok(n >= 5);
  assert.equal((h.match(/aria-expanded="false" aria-controls="pm(Nav|Sign)P/g) || []).length, n);
});

test("footer: required groups, official logo, lineage follows OFFICIAL_GOV_PORTAL", () => {
  let { PMShell3 } = makeEnv("en");
  let f = PMShell3.renderFooter();
  for (const t of ["Website policy", "Sitemap", "Related links", "Help", "Feedback", "Terms of use", "Privacy policy", "Hyperlinking policy", "Copyright policy", "Disclaimer", "Last updated on"]) assert.ok(f.includes(t), t);
  assert.match(f, /assets\/pashu-mitra-logo\.png/);
  assert.match(f, /independent initiative and not an official Government of India website/);
  assert.match(f, /Designed to conform to DBIM 3\.0 and GIGW 3\.0; CQW\/STQC certification pending audit/);
  ({ PMShell3 } = makeEnv("en", { officialGovPortal: true }));
  assert.doesNotMatch(PMShell3.renderFooter(), /independent initiative/);
});

test("'Last updated on' is data-driven, per page, DD/MM/YYYY", () => {
  const { PMShell3 } = makeEnv("en", { pageUpdated: { "#/help": "2026-09-30" }, lastReviewed: "2026-10-05" });
  assert.equal(PMShell3.lastUpdatedFor("#/help"), "30/09/2026");
  assert.equal(PMShell3.lastUpdatedFor("#/about?x=1"), "05/10/2026");
  assert.equal(PMShell3.ddmmyyyy("2026-01-02"), "02/01/2026");
});

test("all four supported languages: header/footer/cookie switch and key sets match", () => {
  const { PMShell3 } = makeEnv("hi");
  assert.match(PMShell3.renderHeader(), /हमारे बारे में/);
  assert.match(PMShell3.renderFooter(), /यह एक स्वतंत्र पहल है/);
  assert.match(PMShell3.renderCookie(), /सभी स्वीकार करें/);
  const mr = makeEnv("mr").PMShell3, te = makeEnv("te").PMShell3;
  assert.match(mr.renderHeader(), /आमच्याबद्दल/);
  assert.match(te.renderHeader(), /మా గురించి/);
  const keys = Object.keys(PMShell3.labels.en).sort();
  for (const l of ["hi", "mr", "te"]) assert.deepEqual(Object.keys(PMShell3.labels[l]).sort(), keys, l);
});

test("cookie consent: opt-in, nothing pre-ticked, Accept / Reject / Customise, withdrawable", () => {
  const { PMShell3 } = makeEnv();
  const c = PMShell3.consent;
  assert.equal(c.decided(), false);
  for (const k of ["functionality", "analytics", "social"]) assert.equal(c.get(k), false, k + " is off by default");
  const html = PMShell3.renderCookie();
  assert.doesNotMatch(html, /checked/);
  for (const a of ["accept", "reject", "custom"]) assert.ok(html.includes('data-ck="' + a + '"'));
  assert.match(html, /Essential/i);
  c.accept(); assert.ok(c.get("analytics") && c.decided());
  c.reject(); assert.ok(!c.get("analytics") && c.decided());
  c.set({ analytics: true }); assert.ok(c.get("analytics") && !c.get("social"));
});

test("ticker is hidden unless real announcements exist, and has a pause control", () => {
  assert.equal(makeEnv().PMShell3.renderTicker(), "");
  const t = makeEnv("en", { announcements: [{ text: "Notice", href: "#/help" }] }).PMShell3.renderTicker();
  assert.match(t, /data-pm-ticker/);
  assert.match(t, /Pause announcements/);
});

test("static a11y: lang, zoomable viewport, skip link first, single main, hosts, live regions", () => {
  const html = read("index.html");
  assert.match(html, /<html lang="en"/);
  const vp = /name="viewport" content="([^"]+)"/.exec(html)[1];
  assert.doesNotMatch(vp, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/);
  const bodyStart = html.slice(html.indexOf("<body"));
  const other = bodyStart.search(/<(a|button|input|select|textarea)\b(?![^>]*pm-skip-link)/);
  assert.ok(bodyStart.includes("pm-skip-link") && (other === -1 || bodyStart.indexOf("pm-skip-link") < other));
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  for (const id of ["pmSiteHeaderHost", "pmFooterHost", "pmLivePolite", "pmLiveAssertive", "pmCookieHost"]) assert.ok(html.includes('id="' + id + '"'), id);
  const css = read("style.css") + read("dbim-tokens.css") + read("dbim-shell.css");
  assert.match(css, /:focus-visible\{[^}]*outline:3px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /scroll-padding-top/);
});

test("official logo asset: PNG, sane dimensions, never stretched by CSS", () => {
  const p = path.join(root, "assets", "pashu-mitra-logo.png");
  assert.ok(fs.existsSync(p), "official logo must exist at frontend/assets/pashu-mitra-logo.png");
  const b = fs.readFileSync(p);
  assert.equal(b.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "PNG signature");
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  assert.ok(w >= 64 && h >= 64, "at least 64x64");
  assert.ok(b.length < 2 * 1024 * 1024, "under 2 MB");
  const css = read("dbim-shell.css") + read("style.css");
  assert.match(css, /object-fit:contain/, "artwork ratio must be preserved");
  assert.doesNotMatch(css, /\.pm-logo-img[^}]*width:\s*\d+px/, "width must stay auto");
});

test("fonts: self-hosted Noto Sans covers English, Hindi, Marathi and Telugu", () => {
  const css = read("dbim-tokens.css");
  for (const f of ["NotoSans-latin-400.woff2", "NotoSans-devanagari-400.woff2", "NotoSans-telugu-400.woff2", "NotoSans-latin-700.woff2", "NotoSans-devanagari-700.woff2", "NotoSans-telugu-700.woff2"]) {
    assert.match(css, new RegExp(f.replace(/[-.]/g, m => "\\" + m)), f + " declared");
    assert.ok(fs.existsSync(path.join(root, "fonts", f)), f + " exists on disk");
  }
  // Devanagari serves Hindi AND Marathi; Telugu serves Telugu.
  assert.match(css, /U\+0900-097F/);   // Devanagari range
  assert.match(css, /U\+0C00-0C7F/);   // Telugu range
});
