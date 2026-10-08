#!/usr/bin/env node
/* Contrast gate (WCAG 1.4.3 / 1.4.11, GIGW 3.0 5.2.14, DBIM 2.3).
 * 1) Palette matrix: every DBIM text/background pair we rely on, plus the
 *    documented traps that must stay out of text use.
 * 2) Stylesheet scan: every rule in frontend/style.css, dbim-tokens.css and
 *    dbim-shell.css that sets BOTH a colour and a solid background is resolved
 *    through the :root variables and must reach 4.5:1 (text). A rule can opt
 *    out with a `contrast-ok: <reason>` comment inside it (e.g. disabled
 *    controls).
 * Limits: only same-rule pairs are checked; inherited backgrounds, images and
 * state-dependent variables need axe in a browser (Phase 7).
 * Exit code 1 on any failure so CI can block the merge. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend");
const files = ["style.css", "dbim-tokens.css", "dbim-shell.css"];
const css = files.map(f => readFileSync(join(root, f), "utf8")).join("\n");

const lum = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---- variable map from :root blocks (default theme, later wins) ----
const vars = {};
for (const m of css.matchAll(/(?:^|\n)\s*:root\s*\{([^{}]*)\}/g))
  for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
const resolve = (v, depth = 0) => {
  v = (v || "").trim().replace(/\s*!important/, "");
  if (depth > 8) return null;
  const m = v.match(/^var\((--[\w-]+)(?:,([^)]*))?\)$/);
  if (m) return resolve(vars[m[1]] ?? m[2], depth + 1);
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return ("#" + [...v.slice(1)].map(c => c + c).join("")).toUpperCase();
  return null;
};

let failures = 0;
const fail = msg => { failures++; console.error("FAIL  " + msg); };

// ---- 1. palette matrix ----
const P = { key: "#0F5757", mid: "#2D8686", light: "#A6D9D9", tint: "#D9F2F2", linen: "#EBEAEA", white: "#FFFFFF",
  brown: "#150202", black: "#000000", ok: "#198754", warn: "#FFC107", err: "#DC3545", info: "#0D6EFD", g3: "#606060", g2: "#8E8E8E" };
const must = [ // [fg, bg, min, why]
  ["brown", "white", 4.5, "body text"], ["brown", "linen", 4.5, "text on cards"], ["brown", "tint", 4.5, "text on tint"],
  ["brown", "warn", 4.5, "Mustard is background only"], ["key", "white", 4.5, "links/buttons"], ["key", "linen", 4.5, "links on cards"],
  ["white", "key", 4.5, "footer / primary button"], ["g3", "white", 4.5, "secondary text"], ["g3", "linen", 4.5, "secondary text on cards"],
  ["white", "ok", 4.5, "success badge"], ["white", "err", 4.5, "error badge"], ["info", "white", 4.5, "info links on white"],
  ["g3", "white", 3, "input border"], ["mid", "white", 3, "non-text UI (icons, borders)"], ["key", "tint", 4.5, "key on tint"],
];
for (const [f, b, min, why] of must) { const r = ratio(P[f], P[b]); if (r < min) fail(`${f} on ${b} = ${r.toFixed(2)} < ${min} (${why})`); }
const traps = [["mid", "white", "#2D8686 text on white"], ["mid", "linen", "#2D8686 text on Linen"], ["white", "mid", "white text on #2D8686"],
  ["g2", "white", "#8E8E8E text"], ["warn", "white", "Mustard text on white"], ["info", "linen", "Blue link on Linen"]];
for (const [f, b, label] of traps) console.log(`NOTE  trap (never as body text): ${label} = ${ratio(P[f], P[b]).toFixed(2)}:1`);

// ---- 2. stylesheet scan ----
const body = css.replace(/\/\*(?![^*]*contrast-ok)[\s\S]*?\*\//g, "");
let checked = 0, skipped = 0;
for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].trim().replace(/\s+/g, " ");
  if (sel.startsWith(":root") || /pm-high-contrast|forced-colors|\[data-dbim-theme/.test(sel)) continue;
  const decl = m[2];
  if (/contrast-ok/.test(decl)) { skipped++; continue; }
  const fg = decl.match(/(?:^|[;\s])color\s*:\s*([^;]+)/);
  const bg = decl.match(/background(?:-color)?\s*:\s*([^;]+)/);
  if (!fg || !bg) continue;
  const f = resolve(fg[1]), b = resolve(bg[1].split(/\s+(?=(?:url|linear|radial))/)[0]);
  if (!f || !b) { skipped++; continue; }
  checked++;
  const r = ratio(f, b);
  if (r < 4.5) fail(`${sel}  color ${f} on ${b} = ${r.toFixed(2)}:1`);
}
console.log(`\nStylesheet pairs checked: ${checked}; skipped (unresolved or exempt): ${skipped}`);
if (failures) { console.error(`\n${failures} contrast failure(s).`); process.exit(1); }
console.log("Contrast OK.");
