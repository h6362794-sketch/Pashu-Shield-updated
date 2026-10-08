#!/usr/bin/env node
/* External link checker (GIGW L07, DBIM 6.x). Needs network: run in CI on a schedule.
 * Checks every https URL in org-config.js and the info pages answers < 400, and that
 * external links are https. Internal route links are covered by
 * frontend/tests/shell_official_logo.test.mjs. */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend");
const urls = new Set();
for (const f of ["org-config.js", "info-pages.js", "dbim-shell.js", "index.html"])
  for (const m of readFileSync(join(root, f), "utf8").matchAll(/https?:\/\/[A-Za-z0-9.\-_/%?=&#:+~]+/g)) urls.add(m[0].replace(/[).,;]+$/, ""));
let bad = 0;
for (const u of urls) {
  if (/example\.|localhost|\[OWNER|\{s\}|\{z\}|w3\.org|openapi|leaflet@/.test(u)) continue;
  if (u.startsWith("http://")) { console.error("FAIL not https: " + u); bad++; continue; }
  try { const r = await fetch(u, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (r.status >= 400) { console.error(`FAIL ${r.status} ${u}`); bad++; } else console.log(`ok ${r.status} ${u}`);
  } catch (e) { console.error(`FAIL ${u} (${e.message})`); bad++; }
}
process.exit(bad ? 1 : 0);
