// Same vectors as backend/tests/test_validators.py (GuDApps: identical client/server rules).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sb = {}; sb.globalThis = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, "validators.js"), "utf8"), sb);
const R = sb.PMValidators.rules;
const vec = JSON.parse(fs.readFileSync(path.join(root, "tests", "validator-vectors.json"), "utf8"));

for (const k of ["mobile", "pin", "ifsc", "aadhaar"]) {
  test(k + " validator accepts valid and rejects invalid vectors", () => {
    for (const v of vec[k].valid) assert.ok(R[k](v), `${k} should accept ${v}`);
    for (const v of vec[k].invalid) assert.ok(!R[k](v), `${k} should reject "${v}"`);
  });
}
test("Aadhaar is masked on display", () => {
  for (const [input, out] of vec.maskAadhaar) assert.equal(R.maskAadhaar(input), out);
});
test("error summary links to fields and is announced; incomplete message lists what is missing", () => {
  const errs = sb.PMValidators.validate({ phone: "123", pin: "" }, { phone: { label: "Mobile number", required: true, type: "mobile" }, pin: { label: "PIN code", required: true, type: "pin" } });
  assert.equal(errs.length, 2);
  const html = sb.PMValidators.summaryHtml(errs);
  assert.match(html, /role="alert"/); assert.match(html, /href="#phone"/); assert.match(html, /2 problems/);
  assert.match(sb.PMValidators.incompleteHtml(["Mobile number"]), /role="status"[^>]*>To continue, complete: Mobile number/);
  assert.equal(sb.PMValidators.summaryHtml([]), "");
});
test("no frontend source logs or puts an Aadhaar number in a URL", () => {
  for (const f of ["app.js", "info-pages.js", "validators.js"]) {
    const s = fs.readFileSync(path.join(root, f), "utf8");
    assert.doesNotMatch(s, /console\.\w+\([^)]*aadhaar/i, f);
    assert.doesNotMatch(s, /[?&]aadhaar=/i, f);
  }
});
