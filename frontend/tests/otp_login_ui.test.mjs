/**
 * Frontend checks for the mobile-OTP-only login/signup screens.
 *
 *   node --test frontend/tests/
 *
 * loads frontend/app.js inside a sandboxed VM context with a minimal DOM stub,
 * then asserts the OTP UI contract:
 *   - no password field or password route exists anywhere in the app
 *   - every portal (owner / vet / govt / lab) renders the mobile + OTP form
 *   - the mobile input has country-code support defaulting to India (+91)
 *   - the OTP flow calls the role-aware OTP API endpoints
 *   - OTP requests are never queued for offline sync
 *   - the OTP value is never written to localStorage or held in app state
 *   - signup is offered only for roles the server allows to self-register
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appSource = fs.readFileSync(path.join(here, "..", "app.js"), "utf8");
const ROLES = ["owner", "vet", "govt", "lab"];

function makeStorage() {
  const store = new Map();
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

function loadApp() {
  const storage = makeStorage();
  const elements = new Map();
  const element = () => ({
    hidden: false, disabled: false, value: "", textContent: "", innerHTML: "",
    maxLength: 10, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    focus() {}, addEventListener() {}, removeEventListener() {},
    querySelectorAll: () => [],
  });
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    fetch: () => Promise.reject(new Error("fetch not stubbed in this test")),
    localStorage: storage,
    navigator: { onLine: true, serviceWorker: undefined },
    location: { hash: "#/", origin: "http://localhost", host: "localhost" },
    document: {
      documentElement: {},
      body: { classList: { toggle() {}, add() {}, remove() {} } },
      addEventListener() {},
      querySelectorAll: () => [],
      getElementById: (id) => {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
      },
      createElement: element,
    },
    window: { addEventListener() {}, scrollTo() {}, scrollY: 0 },
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(appSource, context, { filename: "app.js" });
  return {
    context,
    storage,
    run: (expression) => vm.runInContext(expression, context),
  };
}

const app = loadApp();
const I18N = app.run("I18N");

// --------------------------------------------------------------------------
// Localisation
// --------------------------------------------------------------------------
const FARMER_KEYS = [
  "farmer.otp_title", "farmer.otp_mobile_label", "farmer.otp_mobile_hint",
  "farmer.otp_mobile_placeholder", "farmer.send_otp", "farmer.sending_otp",
  "farmer.enter_otp", "farmer.otp_placeholder", "farmer.verify_and_login",
  "farmer.verifying_otp", "farmer.resend_otp", "farmer.resending_otp",
  "farmer.resend_in", "farmer.resend_ready", "farmer.change_mobile",
  "farmer.otp_sent", "farmer.otp_resent", "farmer.otp_invalid_mobile",
  "farmer.otp_invalid_code", "farmer.otp_invalid", "farmer.otp_expired",
  "farmer.otp_locked", "farmer.otp_used", "farmer.otp_cooldown",
  "farmer.otp_rate_limited", "farmer.otp_unavailable", "farmer.otp_send_failed",
  "farmer.otp_missing_hint", "farmer.otp_country_code", "farmer.otp_unavailable_hint",
  "farmer.reg_title", "farmer.reg_create_account", "farmer.reg_expired",
  "farmer.reg_not_allowed", "farmer.reg_provisioned_hint",
];

test("localisation: every farmer OTP key exists in en, mr, hi and te", () => {
  for (const lang of ["en", "mr", "hi", "te"]) {
    assert.ok(I18N[lang], `missing language block: ${lang}`);
    for (const key of FARMER_KEYS) {
      assert.equal(typeof I18N[lang][key], "string", `${lang} missing ${key}`);
      assert.ok(I18N[lang][key].length > 0, `${lang}.${key} is empty`);
    }
  }
});

test("localisation: the staff portals have English OTP + signup copy", () => {
  const staffKeys = FARMER_KEYS.map((k) => k.replace(/^farmer\./, ""));
  for (const key of staffKeys) {
    assert.equal(typeof I18N.en[key], "string", `en missing root key ${key}`);
    assert.ok(I18N.en[key].length > 0, `en.${key} is empty`);
  }
  // at() routes farmers to farmer.* and everyone else to the root strings.
  assert.equal(app.run('at("owner", "otp_title")'), I18N.en["farmer.otp_title"]);
  assert.equal(app.run('at("vet", "otp_title")'), I18N.en["otp_title"]);
  assert.equal(app.run('at("lab", "reg_not_allowed")'), I18N.en["reg_not_allowed"]);
});

test("no password string survives in the authentication copy", () => {
  for (const lang of ["en", "mr", "hi", "te"]) {
    for (const [key, value] of Object.entries(I18N[lang])) {
      assert.doesNotMatch(key, /password|confirm_password|email_or_mobile/i,
        `${lang}.${key} is a retired password-auth key`);
      assert.doesNotMatch(String(value), /password/i, `${lang}.${key} mentions a password`);
    }
  }
});

// --------------------------------------------------------------------------
// No password anywhere
// --------------------------------------------------------------------------
test("the app contains no password input, route or API call", () => {
  assert.doesNotMatch(appSource, /type="password"/, "a password input survived");
  assert.doesNotMatch(appSource, /name="password"/, "a password field survived");
  assert.doesNotMatch(appSource, /name="confirm_password"/);
  assert.doesNotMatch(appSource, /"\/auth\/login"/, "the retired login route is still called");
  assert.doesNotMatch(appSource, /"\/auth\/register"/, "the retired signup route is still called");
  assert.doesNotMatch(appSource, /#\/login\/:role\/password/, "the password fallback route survived");
  assert.doesNotMatch(appSource, /password123/, "a demo password survived");
  for (const role of ROLES) {
    const account = app.run(`DEMO_ACCOUNTS["${role}"]`);
    assert.equal(typeof account.mobile, "string", `${role} demo account must show a mobile`);
    assert.equal(account.password, undefined, `${role} demo account must not show a password`);
    assert.equal(account.username, undefined, `${role} demo account must not show a username`);
  }
});

// --------------------------------------------------------------------------
// The OTP form, for every portal
// --------------------------------------------------------------------------
test("every portal renders the mobile + OTP controls", () => {
  for (const role of ROLES) {
    const html = app.run(`mobileOtpForm("${role}")`);
    assert.match(html, /id="otpForm"/, role);
    assert.match(html, /id="otpMobile"/, role);
    assert.match(html, /id="otpSendBtn"/, role);
    assert.match(html, /id="otpCode"/, role);
    assert.match(html, /id="otpVerifyBtn"/, role);
    assert.match(html, /id="otpResendBtn"/, role);
    assert.match(html, /id="otpResendHint"/, role);
    assert.match(html, /id="otpChangeMobile"/, role);
    // A six-digit, one-time-code OTP input.
    assert.match(html, /maxlength="6"/, role);
    assert.match(html, /autocomplete="one-time-code"/, role);
    assert.doesNotMatch(html, /type="password"/, role);
  }
});

test("the mobile input has country-code support defaulting to India (+91)", () => {
  for (const role of ROLES) {
    const html = app.run(`mobileOtpForm("${role}")`);
    assert.match(html, /id="otpCallingCode"/, role);
    assert.match(html, /<option value="91"[^>]*selected>\+91<\/option>/, role);
    // India is the default, so the national number stays 10 digits.
    assert.equal(app.run('currentCallingCode()'), "91");
    assert.equal(app.run('maxMobileDigits()'), 10);
    assert.match(html, /maxlength="10"/, role);
  }
  // Selecting another code widens the field; the server still validates.
  assert.equal(app.run('(otpState.callingCode = "1", maxMobileDigits())'), 15);
  assert.equal(app.run('mobileOtpForm("vet")').match(/maxlength="(\d+)"/)[1], "15");
  // The published list comes from the API when available.
  app.run('authConfig = { supported_calling_codes: [{ calling_code: "91", e164_prefix: "+91" }] }');
  assert.equal(app.run('callingCodes().length'), 1);
  app.run("authConfig = null");
  assert.ok(app.run("callingCodes().length") > 1, "the built-in fallback list is used offline");
  assert.equal(app.run('(otpState.callingCode = "91", currentCallingCode())'), "91");
});

test("the request body carries the mobile number and the selected calling code", () => {
  for (const endpoint of ["/auth/otp/request", "/auth/otp/resend", "/auth/otp/verify"]) {
    const index = appSource.indexOf(`"${endpoint}"`);
    assert.ok(index > -1, `app.js must call ${endpoint}`);
    const callSite = appSource.slice(index, index + 520);
    assert.match(callSite, /method: "POST"/, `${endpoint} must be a POST`);
    assert.match(callSite, /queueOffline: false/, `${endpoint} must never be queued offline`);
    assert.match(callSite, /calling_code/, `${endpoint} must send the calling code`);
  }
  // A wrong OTP must not be treated as an expired session by the 401 handler.
  assert.match(appSource, /path\.startsWith\("\/auth\/"\)/,
    "401 must not force logout during OTP login");
});

test("OTP secrets are never persisted in the browser", () => {
  const storageWrites = appSource.match(/localStorage\.setItem\([^)]*\)/g) || [];
  assert.ok(storageWrites.length > 0, "expected at least the auth token write");
  for (const write of storageWrites) {
    assert.doesNotMatch(write, /otp/i, `unexpected OTP persistence: ${write}`);
  }
  const state = app.run("otpState");
  assert.equal(typeof state.mobile, "string");
  assert.ok(!("code" in state) && !("otp" in state),
    "the OTP value must never be held in app state");
});

test("cooldown countdown formats and restores from an absolute deadline", () => {
  const remaining = app.run("(otpState.cooldownUntil = Date.now() + 45000, remainingOtpCooldown())");
  assert.ok(remaining > 40 && remaining <= 45, `unexpected remaining: ${remaining}`);
  app.run("stopOtpCooldown()");
  assert.equal(app.run("remainingOtpCooldown()"), 0);
  assert.equal(app.run("otpState.sent"), false);
});

// --------------------------------------------------------------------------
// Screens
// --------------------------------------------------------------------------
test("renderAuth mounts the OTP screen for every portal without throwing", () => {
  for (const role of ROLES) {
    app.run(`location.hash = "#/login/${role}"`);
    assert.doesNotThrow(() => app.run(`renderAuth("login", "${role}")`), role);
    const html = app.run('document.getElementById("app").innerHTML');
    assert.match(html, /id="otpForm"/, role);
    assert.match(html, /id="otpSendBtn"/, role);
    assert.match(html, /id="otpCallingCode"/, role);
    assert.doesNotMatch(html, /name="password"/, role);
    assert.doesNotMatch(html, /id="loginForm"/, `${role} must not render a password login form`);
  }
});

test("signup needs a verified token and is only offered to farmers", () => {
  // Without a verified registration token the signup screen is not reachable.
  app.run("otpState.registration = null");
  app.run('location.hash = "#/register/owner"');
  app.run('renderAuth("register", "owner")');
  let html = app.run('document.getElementById("app").innerHTML');
  assert.doesNotMatch(html, /id="registerForm"/);
  assert.match(html, /not open for self-registration/);

  // With one, farmers get the profile form (name + district, no password).
  app.run('otpState.registration = { token: "tok", mobile: "+919700010001", allowed: ["owner"] }');
  app.run('renderAuth("register", "owner")');
  html = app.run('document.getElementById("app").innerHTML');
  assert.match(html, /id="registerForm"/);
  assert.match(html, /name="full_name"/);
  assert.match(html, /name="district"/);
  assert.match(html, /name="preferred_language"/);
  assert.doesNotMatch(html, /type="password"/);
  assert.doesNotMatch(html, /name="email"/, "email is no longer collected at signup");

  // Privileged portals always get the provisioning notice, even with a token.
  for (const role of ["vet", "govt", "lab"]) {
    app.run('location.hash = "#/register/' + role + '"');
    app.run(`renderAuth("register", "${role}")`);
    const staffHtml = app.run('document.getElementById("app").innerHTML');
    assert.doesNotMatch(staffHtml, /id="registerForm"/, role);
    assert.match(staffHtml, /not open for self-registration/, role);
    assert.match(staffHtml, /administrator/, role);
  }
  app.run("otpState.registration = null");
});

test("the signup role list comes from the server, not from the tapped portal", () => {
  // Compared as JSON: the VM context has its own Array prototype.
  assert.equal(JSON.stringify(app.run("SELF_REGISTER_ROLES")), '["owner"]');
  // A server response that only allows farmers is honoured verbatim.
  app.run('otpState.registration = { token: "t", mobile: "+919700010001", allowed: ["owner"] }');
  app.run('renderAuth("register", "govt")');
  assert.doesNotMatch(app.run('document.getElementById("app").innerHTML'), /id="registerForm"/);
  app.run("otpState.registration = null");
});

// --------------------------------------------------------------------------
// Honest delivery wording
// --------------------------------------------------------------------------
test("the OTP screen never claims an SMS was delivered", () => {
  for (const lang of ["en", "mr", "hi", "te"]) {
    for (const key of ["farmer.otp_sent", "farmer.otp_resent"]) {
      assert.doesNotMatch(I18N[lang][key], /OTP sent to \+91/,
        `${lang}.${key} must not state an unconditional delivery`);
    }
  }
  for (const key of ["otp_sent", "otp_resent"]) {
    assert.match(I18N.en[key], /submitted to the SMS gateway/,
      `${key} must describe the handover, not a delivery`);
    assert.doesNotMatch(I18N.en[key], /delivered/i, `${key} must not claim delivery`);
  }
  // The request handler must not fabricate a delivery message either.
  // Comments are stripped so the assertion checks executed code, not prose.
  const handler = appSource.slice(appSource.indexOf("async function requestOtp"),
    appSource.indexOf("async function verifyOtp")).replace(/\/\/[^\n]*/g, "");
  assert.doesNotMatch(handler, /OTP sent to/i);
  assert.match(handler, /at\(role, "otp_sent"/);
  // The backend readiness codes surface the neutral "unavailable" copy.
  const mapping = app.run("OTP_ERROR_KEYS");
  assert.equal(mapping.OTP_PEPPER_UNSTABLE, "otp_unavailable");
  assert.equal(mapping.SMS_GATEWAY_REJECTED, "otp_send_failed");
  assert.equal(mapping.SMS_GATEWAY_UNAVAILABLE, "otp_send_failed");
});

test("the OTP code step explains what to do when the SMS does not arrive", () => {
  for (const role of ROLES) {
    const html = app.run(`mobileOtpForm("${role}")`);
    assert.match(html, /id="otpMissingHint"/, role);
  }
  assert.match(I18N.en["farmer.otp_missing_hint"], /Resend OTP/);
  assert.match(I18N.en["otp_missing_hint"], /Resend OTP/);
});

test("an unusable SMS gateway is reported without offering a password", () => {
  const html = app.run('(renderOtpFallback("vet", true), document.getElementById("otpFallback").innerHTML)');
  assert.match(html, /otp-unavailable/);
  assert.doesNotMatch(html, /password/i);
  assert.doesNotMatch(html, /#\/login\/vet\/password/);
  const cleared = app.run('(renderOtpFallback("vet", false), document.getElementById("otpFallback").innerHTML)');
  assert.equal(cleared.trim(), "");
});

test("error codes map to localised messages for both audiences", () => {
  const mapping = app.run("OTP_ERROR_KEYS");
  for (const code of ["INVALID_MOBILE", "OTP_INVALID", "OTP_EXPIRED", "OTP_LOCKED",
    "OTP_ALREADY_USED", "COOLDOWN_ACTIVE", "RATE_LIMITED", "SMS_GATEWAY_NOT_CONFIGURED",
    "SMS_GATEWAY_UNAVAILABLE", "REGISTRATION_TOKEN_INVALID", "ROLE_NOT_SELF_REGISTERABLE"]) {
    assert.ok(mapping[code], `no UI message mapped for ${code}`);
    assert.equal(typeof I18N.en[`farmer.${mapping[code]}`], "string",
      `farmer.${mapping[code]} missing`);
    assert.equal(typeof I18N.en[mapping[code]], "string", `root ${mapping[code]} missing`);
  }
  const err = { data: { code: "OTP_EXPIRED" }, message: "x" };
  app.run("otpState.role = 'owner'");
  assert.equal(app.run("otpErrorMessage(" + JSON.stringify(err) + ", 'owner')"),
    I18N.en["farmer.otp_expired"]);
  assert.equal(app.run("otpErrorMessage(" + JSON.stringify(err) + ", 'govt')"),
    I18N.en["otp_expired"]);
});
