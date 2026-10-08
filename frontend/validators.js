/* Shared field validators (GuDApps data quality; DBIM Annexure B).
 * SAME rules run on the server: backend/validators.py. Both are tested against
 * frontend/tests/validator-vectors.json so they cannot drift apart.
 * Aadhaar: only with explicit consent and purpose; mask on display; NEVER log it
 * or put it in a URL (see docs/compliance/SECURITY_CHECKLIST.md). */
(function (root) {
  "use strict";
  var D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
           [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  var P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
           [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  function verhoeff(num) {                      // true when the check digit is valid
    var c = 0, d = String(num).split("").reverse();
    for (var i = 0; i < d.length; i++) c = D[c][P[i % 8][Number(d[i])]];
    return c === 0;
  }
  function digits(v) { return String(v == null ? "" : v).replace(/[\s-]/g, ""); }

  var V = {
    required: function (v) { return String(v == null ? "" : v).trim() !== ""; },
    mobile: function (v) {                      // 10 digits starting 6-9; +91 / 91 / 0 prefix tolerated
      var d = digits(v).replace(/^(\+91|91|0)(?=\d{10}$)/, "");
      return /^[6-9]\d{9}$/.test(d);
    },
    pin: function (v) { return /^[1-9]\d{5}$/.test(digits(v)); },
    ifsc: function (v) { return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(v || "").trim().toUpperCase()); },
    aadhaar: function (v) { var d = digits(v); return /^[2-9]\d{11}$/.test(d) && verhoeff(d); },
    verhoeff: verhoeff,
    maskAadhaar: function (v) { var d = digits(v); return d.length === 12 ? "XXXX XXXX " + d.slice(8) : ""; },
    maskMobile: function (v) { var d = digits(v).replace(/^(\+91|91|0)(?=\d{10}$)/, ""); return d.length === 10 ? "XXXXXX" + d.slice(6) : ""; }
  };
  var MESSAGES = {
    required: "This field is required.", mobile: "Enter a 10-digit mobile number starting with 6, 7, 8 or 9.",
    pin: "Enter a 6-digit PIN code.", ifsc: "Enter a valid IFSC code, for example SBIN0001234.", aadhaar: "Enter a valid 12-digit Aadhaar number."
  };

  /* Error summary: links to each field, announced via aria-live (GuDApps, WCAG 3.3.1). */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
  function summaryHtml(errors) {
    if (!errors.length) return "";
    return '<div class="pm-errsum" role="alert" aria-live="assertive" tabindex="-1"><h2>There ' + (errors.length === 1 ? "is 1 problem" : "are " + errors.length + " problems") + ' with this form</h2><ul>' +
      errors.map(function (e) { return '<li><a href="#' + esc(e.id) + '">' + esc(e.label) + ": " + esc(e.message) + "</a></li>"; }).join("") + "</ul></div>";
  }
  /* DBIM asks for a disabled primary button until data is complete. We use
   * aria-disabled="true" plus a visible, announced list of what is missing. */
  function incompleteHtml(missing) {
    return missing.length ? '<p class="pm-incomplete" role="status">To continue, complete: ' + missing.map(esc).join(", ") + ".</p>" : "";
  }
  /* rules: { fieldId: { label, required, type: "mobile|pin|ifsc|aadhaar" } } -> [{id,label,message}] */
  function validate(values, rules) {
    var errors = [];
    Object.keys(rules).forEach(function (id) {
      var r = rules[id], v = values[id];
      if (!V.required(v)) { if (r.required) errors.push({ id: id, label: r.label, message: MESSAGES.required }); return; }
      if (r.type && V[r.type] && !V[r.type](v)) errors.push({ id: id, label: r.label, message: MESSAGES[r.type] });
    });
    return errors;
  }
  root.PMValidators = { rules: V, messages: MESSAGES, summaryHtml: summaryHtml, incompleteHtml: incompleteHtml, validate: validate };
})(typeof window !== "undefined" ? window : globalThis);
