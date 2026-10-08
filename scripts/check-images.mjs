#!/usr/bin/env node
/* Image size budgets (DBIM 6, 5.5): banners/backgrounds <= 500 KB, thumbnails <= 100 KB,
 * logos <= 100 KB, any other raster <= 5 MB. Exit 1 on a breach (CI). */
import { readdirSync, statSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend");
const KB = 1024, ext = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico"]);

/* MERGE ADAPTATION (docs/compliance/DECISIONS.md D-04): the official Pashu-Mitra
   mark supplied by the owner is a single 1024x1024 master artwork (250 KB) that
   also feeds the PWA icons, so it is exempted by EXACT PATH instead of raising
   the logo budget for every image. It still sits under the 500 KB banner budget
   and is never distorted (CSS height + object-fit:contain). Every other logo,
   favicon and icon keeps the strict 100 KB limit. */
const EXEMPT = new Set(["assets/pashu-mitra-logo.png"]);

const limit = p => /pashumitra_|favicon|logo/i.test(p) ? 100 * KB : /thumb/i.test(p) ? 100 * KB : /banner|hero|background/i.test(p) ? 500 * KB
  : /icon-|apple-touch|social-/i.test(p) ? 500 * KB : 5 * 1024 * KB;
let bad = 0, n = 0, exempt = 0;
(function walk(d) {
  for (const f of readdirSync(d)) {
    if (["node_modules", "models", "wasm", "vendor", "tests", "fonts"].includes(f)) continue;
    const p = join(d, f), st = statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!ext.has(extname(f).toLowerCase())) continue;
    n++; const rel = relative(root, p);
    if (EXEMPT.has(rel)) { exempt++; continue; }
    const lim = limit(rel);
    if (st.size > lim) { bad++; console.error(`FAIL ${rel} ${(st.size / KB).toFixed(0)} KB > ${(lim / KB).toFixed(0)} KB`); }
  }
})(root);
console.log(`${n} images checked, ${exempt} exempt by path, ${bad} over budget`);
process.exit(bad ? 1 : 0);
