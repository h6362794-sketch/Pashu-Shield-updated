/**
 * Welcome video popup tests — Pashu-Mitra.
 *
 *   node --test frontend/tests/welcome_video.test.mjs
 *
 * The feature brief (centred YouTube welcome popup) is verified at two levels:
 *
 *  1. STATIC — index.html loads the module, the module uses the exact
 *     privacy-enhanced embed URL / video id and the direct YouTube URL, the
 *     iframe carries the required attributes, dismissal is sessionStorage
 *     scoped, and the CSS centres the dialog above the page chrome while
 *     keeping a responsive 16:9 player.
 *
 *  2. BEHAVIOUR — the module is actually executed inside a small DOM stub:
 *     the dialog is created once, it is a real dialog (role/aria-modal/label),
 *     Close removes the overlay AND tears the player down, the dismissal is
 *     remembered for the session, Escape only closes this dialog, a live
 *     WebRTC call screen is never covered, and nothing touches the session
 *     token / route.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

const moduleSource = read("welcome-video.js");
const indexHtml = read("index.html");
const styleCss = read("style.css");
const swSource = read("sw.js");

const VIDEO_ID = "QJILXRbxcts";
const EMBED_SRC =
  "https://www.youtube-nocookie.com/embed/QJILXRbxcts?autoplay=1&playsinline=1&rel=0";
const WATCH_URL = "https://www.youtube.com/watch?v=QJILXRbxcts";

// ===========================================================================
// 1. STATIC SOURCE CHECKS
// ===========================================================================

test("index.html loads the welcome-video module after the a11y helpers", () => {
  const a11yAt = indexHtml.indexOf('<script src="a11y.js"></script>');
  const welcomeAt = indexHtml.indexOf('<script src="welcome-video.js"></script>');
  assert.ok(a11yAt > -1, "a11y.js must still be loaded");
  assert.ok(welcomeAt > -1, "welcome-video.js must be loaded");
  assert.ok(welcomeAt > a11yAt, "the popup reuses PMA11y, so it loads after a11y.js");
  // Existing scripts must all still be present (no feature was dropped).
  for (const script of ["org-config.js", "shell.js", "captcha.js", "app.js", "info-pages.js", "call.js"]) {
    assert.ok(indexHtml.includes(script), `${script} must still be loaded`);
  }
});

test("the popup markup is created in JavaScript, so the skip link stays first", () => {
  // Deliberately NOT in index.html: the skip link must remain the first
  // focusable element of <body> (test_60 in backend/test_compliance.py).
  assert.doesNotMatch(indexHtml, /id="pmWelcomeVideo"/);
  const body = indexHtml.match(/<body>([\s\S]*?)<\/body>/)[1];
  const firstAnchor = body.match(/<a\s[^>]*>/)[0];
  assert.match(firstAnchor, /pm-skip-link/);
  // ...and the dialog is appended to <body>, outside the SPA mount point.
  assert.match(moduleSource, /document\.body/);
  assert.doesNotMatch(moduleSource, /getElementById\("app"\)[\s\S]{0,80}appendChild/);
});

test("the exact privacy-enhanced video is embedded (video id QJILXRbxcts)", () => {
  assert.ok(moduleSource.includes('const VIDEO_ID = "QJILXRbxcts"'));
  assert.ok(
    moduleSource.includes("https://www.youtube-nocookie.com/embed/"),
    "the privacy-enhanced embed host must be used"
  );
  assert.ok(
    moduleSource.includes('"?autoplay=1&playsinline=1&rel=0"'),
    "autoplay/playsinline/rel must be configured"
  );
  // The short link must never be used as the iframe source.
  assert.doesNotMatch(moduleSource, /youtu\.be/);
  assert.doesNotMatch(moduleSource, /youtube-nocookie\.com\/watch/);
  assert.doesNotMatch(moduleSource, /youtube\.com\/embed/);
});

test("the iframe carries the required accessibility and playback attributes", () => {
  assert.match(
    moduleSource,
    /allow",\s*"autoplay; encrypted-media; picture-in-picture; fullscreen"/
  );
  assert.match(moduleSource, /setAttribute\("allowfullscreen", ""\)/);
  assert.match(moduleSource, /setAttribute\("title", t\("player"\)\)/);
  // A referrer policy that still sends the origin (never "no-referrer").
  assert.match(moduleSource, /referrerpolicy",\s*"strict-origin-when-cross-origin"/);
  assert.doesNotMatch(moduleSource, /no-referrer/);
  assert.match(moduleSource, /setAttribute\("src", EMBED_SRC\)/);
});

test("Watch on YouTube points at the exact watch URL and opens safely", () => {
  assert.ok(moduleSource.includes('"https://www.youtube.com/watch?v=" + VIDEO_ID'));
  assert.ok(moduleSource.includes("https://www.youtube.com/watch?v="));
  assert.match(moduleSource, /setAttribute\("target", "_blank"\)/);
  assert.match(moduleSource, /setAttribute\("rel", "noopener noreferrer"\)/);
});

test("dismissal is session-scoped, not permanent", () => {
  assert.match(moduleSource, /sessionStorage\.getItem\(SESSION_KEY\)/);
  assert.match(moduleSource, /sessionStorage\.setItem\(SESSION_KEY, "1"\)/);
  assert.match(moduleSource, /const SESSION_KEY = "pm_welcome_video_dismissed"/);
  // A dismissal must never be written to localStorage (it would outlive the
  // browser session, and localStorage is owned by auth state).
  assert.doesNotMatch(moduleSource, /localStorage\.setItem/);
  assert.doesNotMatch(moduleSource, /localStorage\.removeItem/);
});

test("the module never interferes with auth, routing or existing modals", () => {
  assert.doesNotMatch(moduleSource, /localStorage\.setItem/);
  assert.doesNotMatch(moduleSource, /token/);
  assert.doesNotMatch(moduleSource, /location\.hash\s*=/);
  assert.doesNotMatch(moduleSource, /router\(/);
  assert.doesNotMatch(moduleSource, /document\.write/);
  // Only one instance of the popup can ever exist.
  assert.match(moduleSource, /if \(document\.getElementById\(MODAL_ID\)\) return false;/);
  assert.match(moduleSource, /const MODAL_ID = "pmWelcomeVideo"/);
});

test("the modal is centred, above the page chrome and responsive 16:9", () => {
  const css = styleCss.slice(styleCss.indexOf(".pm-welcome-overlay"));
  assert.ok(css.length > 0, "welcome popup styles must exist");
  assert.match(css, /\.pm-welcome-overlay\s*\{[^}]*position:\s*fixed/);
  assert.match(css, /\.pm-welcome-overlay\s*\{[^}]*inset:\s*0/);
  assert.match(css, /\.pm-welcome-overlay\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.pm-welcome-overlay\s*\{[^}]*align-items:\s*center/);
  assert.match(css, /\.pm-welcome-overlay\s*\{[^}]*justify-content:\s*center/);
  const zIndex = Number(css.match(/\.pm-welcome-overlay\s*\{[^}]*z-index:\s*(\d+)/)[1]);
  assert.ok(zIndex > 900, `z-index ${zIndex} must sit above the header/footer/nav`);
  assert.ok(zIndex > 1000, `z-index ${zIndex} must sit above the other modals`);
  // 16:9 with a padding-top fallback for browsers without aspect-ratio.
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(css, /@supports not \(aspect-ratio: 16 \/ 9\)/);
  assert.match(css, /padding-top:\s*56\.25%/);
  // Responsive: the dialog/player can never force horizontal scrolling.
  assert.match(css, /\.pm-welcome-dialog\s*\{[^}]*max-width:\s*min\(880px, 100%\)/);
  assert.match(css, /\.pm-welcome-video-frame\s*\{[^}]*max-width:\s*100%/);
  assert.match(css, /@media \(max-width: 640px\)/);
  // Touch target for the close button.
  assert.match(css, /\.pm-welcome-close\s*\{[^}]*min-width:\s*44px/);
  assert.match(css, /\.pm-welcome-close\s*\{[^}]*min-height:\s*44px/);
  // Existing design system only: no new palette, no new font, no animation.
  assert.match(css, /var\(--pm-primary-dark/);
  assert.match(css, /var\(--pm-focus/);
  assert.doesNotMatch(css, /@font-face/);
  assert.doesNotMatch(css, /animation:/);
});

test("the popup text is localised in all four shipped languages", () => {
  const keys = [
    "title", "note", "player", "watch", "watchHint",
    "close", "closeLabel", "fallback", "offline", "announce",
  ];
  for (const lang of ["en", "hi", "mr", "te"]) {
    const block = moduleSource.match(new RegExp(`\\n    ${lang}: \\{([\\s\\S]*?)\\n    \\},`));
    assert.ok(block, `${lang} translations must exist`);
    const body = block[1];
    for (const key of keys) {
      const value = body.match(new RegExp(`\\n\\s+${key}: "([^"]*)"`));
      assert.ok(value, `${lang}.${key} must be defined`);
      assert.ok(value[1].length > 0, `${lang}.${key} must not be empty`);
    }
  }
  assert.match(moduleSource, /const LANGS = \["en", "mr", "hi", "te"\]/);
});

test("an enforced Content-Security-Policy would still allow the player frame", () => {
  // The backend CSP is report-only today, but frame-src must name the embed
  // origin or an operator enabling SIH_CSP_ENFORCE=1 would silently break it.
  const cspPath = path.join(root, "..", "backend", "compliance_security.py");
  if (!fs.existsSync(cspPath)) return; // frontend-only checkout
  const csp = fs.readFileSync(cspPath, "utf8");
  const frameSrc = csp.match(/frame-src ([^;"]+)/);
  assert.ok(frameSrc, "frame-src must be declared");
  assert.match(frameSrc[1], /https:\/\/www\.youtube-nocookie\.com/);
});

test("the service worker precaches the new script with a bumped cache name", () => {
  assert.match(swSource, /"\/welcome-video\.js"/);
  const cacheName = swSource.match(/const CACHE_NAME = "([^"]+)"/)[1];
  assert.notEqual(cacheName, "pashu-mitra-v10", "the cache must be bumped for the new asset");
  assert.match(cacheName, /^pashu-mitra-v\d+$/);
});

test("the video is embedded, never downloaded or rehosted", () => {
  // No proxying/copying of media: the player is the only way the video loads.
  // (localStorage is read once, for the language, and never written.)
  assert.doesNotMatch(moduleSource, /fetch\(|XMLHttpRequest|\.mp4/);
  assert.doesNotMatch(moduleSource, /localStorage\.(setItem|removeItem|clear)/);
  // ...and the offline cache must never pick up third-party video assets.
  const staticAssets = swSource.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/)[1];
  assert.doesNotMatch(staticAssets, /youtube|ytimg|googlevideo|\.mp4/i);
  assert.doesNotMatch(staticAssets, /http/i, "only same-origin assets are precached");
});

// ===========================================================================
// 2. BEHAVIOUR (module executed in a DOM stub)
// ===========================================================================

function makeStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

/** Minimal DOM stub: enough for the welcome-video module to run for real. */
function makeDom() {
  const registry = [];

  // Only elements still attached to the document body are findable, exactly
  // like a real DOM (a removed node must not be returned by getElementById).
  function isInTree(el) {
    let node = el;
    while (node) {
      if (node === document.body) return true;
      node = node.parentNode;
    }
    return false;
  }

  function matches(el, selector) {
    const parts = selector.trim().split(/\s+/);
    return parts.every((part) => {
      let ok = true;
      const attrRe = /\[([a-zA-Z0-9-]+)(?:="([^"]*)")?\]/g;
      let m;
      let matchedAttr = false;
      while ((m = attrRe.exec(part))) {
        matchedAttr = true;
        const [, name, value] = m;
        if (!el.hasAttribute(name)) return false;
        if (value !== undefined && el.getAttribute(name) !== value) return false;
      }
      const tag = matchedAttr ? null : part.replace(/[:#].*$/, "");
      if (tag) ok = el.tagName === tag.toUpperCase();
      return ok;
    });
  }

  function queryAll(scope, selector) {
    const pool = (scope === document.body ? registry : registry.filter((el) => isDescendant(el, scope)))
      .filter((el) => isInTree(el));
    const selectors = selector.split(",").map((s) => s.trim());
    const out = [];
    for (const el of pool) {
      if (el === scope) continue;
      if (selectors.some((sel) => matches(el, sel)) && !out.includes(el)) out.push(el);
    }
    return out;
  }

  function isDescendant(el, scope) {
    let node = el.parentNode;
    while (node) {
      if (node === scope) return true;
      node = node.parentNode;
    }
    return false;
  }

  function makeElement(tag) {
    const listeners = new Map();
    const node = {
      tagName: String(tag).toUpperCase(),
      nodeType: 1,
      children: [],
      parentNode: null,
      attributes: {},
      dataset: {},
      className: "",
      ownText: "",
      // textContent must aggregate descendants, like the real DOM.
      get textContent() {
        return node.ownText + node.children.map((child) => child.textContent || "").join("");
      },
      set textContent(value) {
        node.ownText = value == null ? "" : String(value);
        for (const child of node.children.slice()) node.removeChild(child);
      },
      innerHTML: "",
      hidden: false,
      type: "",
      focused: false,
      isConnected: true,
      classList: { add() {}, remove() {}, toggle() {} },
      // Zero-sized by default: a rendered-but-empty dialog host is not visible.
      getBoundingClientRect() { return this.rect || { width: 0, height: 0, top: 0, left: 0 }; },
      // `el.id = "x"` must set the attribute, exactly like a real DOM element.
      get id() { return node.attributes.id || ""; },
      set id(value) { node.attributes.id = String(value); },
      setAttribute(name, value) { node.attributes[name] = String(value); },
      getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(node.attributes, name) ? node.attributes[name] : null;
      },
      hasAttribute(name) { return Object.prototype.hasOwnProperty.call(node.attributes, name); },
      removeAttribute(name) { delete node.attributes[name]; },
      appendChild(child) {
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = node;
        node.children.push(child);
        return child;
      },
      removeChild(child) {
        const at = node.children.indexOf(child);
        if (at >= 0) node.children.splice(at, 1);
        child.parentNode = null;
        child.isConnected = false;
        return child;
      },
      remove() { if (node.parentNode) node.parentNode.removeChild(node); },
      addEventListener(type, handler) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(handler);
      },
      removeEventListener(type, handler) {
        if (!listeners.has(type)) return;
        listeners.set(type, listeners.get(type).filter((h) => h !== handler));
      },
      dispatch(type, event) {
        const ev = Object.assign({ type, preventDefault() {}, stopPropagation() {} }, event || {});
        for (const handler of listeners.get(type) || []) handler(ev);
        // Bubbling to the document (dialogs rely on it for Escape).
        if (node !== document && type === "keydown") document.dispatch("keydown", ev);
      },
      click() { node.dispatch("click", {}); },
      focus() {
        node.focused = true;
        document.activeElement = node;
      },
      querySelectorAll: (selector) => queryAll(node, selector),
      querySelector: (selector) => queryAll(node, selector)[0] || null,
      get textContentAll() { return node.textContent; },
    };
    registry.push(node);
    return node;
  }

  const document = {
    readyState: "loading",
    documentElement: { lang: "en" },
    activeElement: null,
    listeners: new Map(),
    body: null,
    addEventListener(type, handler) {
      if (!document.listeners.has(type)) document.listeners.set(type, []);
      document.listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      if (!document.listeners.has(type)) return;
      document.listeners.set(type, document.listeners.get(type).filter((h) => h !== handler));
    },
    dispatch(type, event) {
      const ev = Object.assign({ type, preventDefault() {} }, event || {});
      for (const handler of document.listeners.get(type) || []) handler(ev);
    },
    createElement: (tag) => makeElement(tag),
    createTextNode: (text) => ({ nodeType: 3, textContent: text, parentNode: null }),
    getElementById(id) {
      return registry.find((el) => el.getAttribute("id") === id && isInTree(el)) || null;
    },
    querySelectorAll: (selector) => queryAll(document.body, selector),
    querySelector(selector) {
      if (selector === "main") return document.getElementById("main-content");
      return queryAll(document.body, selector)[0] || null;
    },
  };

  document.body = makeElement("body");
  document.activeElement = document.body;
  return { document, registry, makeElement };
}

function loadModule(options = {}) {
  const dom = makeDom();
  const sessionStorage = makeStorage(options.session || {});
  const localStorage = makeStorage(options.local || {});
  const windowListeners = new Map();
  const timers = [];
  const observers = [];
  const clock = { now: () => 0, clearTimeout: (id) => { id.__cleared = true; } };

  const windowStub = {
    sessionStorage,
    localStorage,
    state: options.state,
    PMA11y: options.pma11y,
    addEventListener(type, handler) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(handler);
    },
    removeEventListener() {},
    dispatch(type, event) {
      for (const handler of windowListeners.get(type) || []) handler(event || { type });
    },
    scrollTo() {},
  };

  function MutationObserverStub(callback) {
    this.callback = callback;
    this.disconnected = false;
    observers.push(this);
  }
  MutationObserverStub.prototype.observe = function () {};
  MutationObserverStub.prototype.disconnect = function () { this.disconnected = true; };

  const sandbox = {
    console,
    document: dom.document,
    window: windowStub,
    navigator: { onLine: options.onLine !== false },
    localStorage,
    sessionStorage,
    MutationObserver: MutationObserverStub,
    setTimeout: (fn, ms) => {
      const id = { fn, ms, cleared: false, __cleared: false };
      timers.push(id);
      if (!ms) setTimeout(() => { if (!id.cleared) fn(); }, 0);
      return id;
    },
    clearTimeout: (id) => { if (id) { id.cleared = true; id.__cleared = true; } },
    requestAnimationFrame: undefined,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    JSON,
  };
  // A #main-content region, like the real index.html, plus the SPA mount point.
  if (options.mainContent !== false) {
    const main = dom.makeElement("main");
    main.setAttribute("id", "main-content");
    dom.document.body.appendChild(main);
  }
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(moduleSource, context, { filename: "welcome-video.js" });
  return {
    dom,
    sandbox,
    window: windowStub,
    timers,
    observers,
    sessionStorage,
    localStorage,
    module: () => vm.runInContext("window.PMWelcomeVideo", context),
    run: (expr) => vm.runInContext(expr, context),
    boot() { dom.document.readyState = "complete"; dom.document.dispatch("DOMContentLoaded", {}); },
    el: (id) => dom.document.getElementById(id),
    modal: () => dom.document.getElementById("pmWelcomeVideo"),
    escape() { dom.document.dispatch("keydown", { key: "Escape" }); },
    addCallOverlay() {
      const overlay = dom.makeElement("div");
      overlay.setAttribute("id", "pmCallOverlay");
      dom.document.body.appendChild(overlay);
      for (const observer of observers) observer.callback([], observer);
      return overlay;
    },
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

// ---------------------------------------------------------------- behaviour --

test("the popup opens on the root route with the exact embedded video", async () => {
  const app = loadModule();
  app.boot();
  await tick();

  const modal = app.modal();
  assert.ok(modal, "the welcome popup must be created when the site opens");
  assert.equal(modal.parentNode, app.dom.document.body, "mounted on <body>, not inside #app");
  assert.equal(modal.getAttribute("role"), "dialog");
  assert.equal(modal.getAttribute("aria-modal"), "true");
  assert.equal(modal.getAttribute("tabindex"), "-1");

  const labelId = modal.getAttribute("aria-labelledby");
  const title = app.el(labelId);
  assert.ok(title, "aria-labelledby must point at a real element");
  assert.equal(title.textContent, "Welcome to Pashu-Mitra");
  assert.ok(app.el(modal.getAttribute("aria-describedby")), "aria-describedby must resolve");

  const iframe = modal.querySelector("iframe");
  assert.ok(iframe, "the player must be embedded");
  assert.equal(iframe.getAttribute("src"), EMBED_SRC);
  assert.equal(iframe.getAttribute("title"), "Pashu-Mitra welcome video");
  assert.equal(
    iframe.getAttribute("allow"),
    "autoplay; encrypted-media; picture-in-picture; fullscreen"
  );
  assert.ok(iframe.hasAttribute("allowfullscreen"));
  assert.equal(iframe.getAttribute("referrerpolicy"), "strict-origin-when-cross-origin");
});

test("a Watch on YouTube link and an accessible Close button are visible", async () => {
  const app = loadModule();
  app.boot();
  await tick();
  const modal = app.modal();

  const watch = modal.querySelector("a");
  assert.equal(watch.getAttribute("href"), WATCH_URL);
  assert.equal(watch.getAttribute("target"), "_blank");
  assert.equal(watch.getAttribute("rel"), "noopener noreferrer");
  assert.match(watch.textContent, /Watch on YouTube/);

  const closeBtn = modal.querySelector("[data-close-modal]");
  assert.equal(closeBtn.tagName, "BUTTON");
  assert.equal(closeBtn.getAttribute("aria-label"), "Close welcome video");

  const closeText = modal.querySelectorAll("[data-close-modal]");
  assert.ok(closeText.length >= 2, "both the ✕ and the labelled Close action dismiss");
});

test("the existing dialog helper is used for focus trap, label and Escape", async () => {
  const calls = [];
  const pma11y = {
    showAccessibleDialog(el, opts) {
      calls.push({ el, opts });
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      return () => {};
    },
    hideAccessibleDialog(el) { if (el && el.remove) el.remove(); },
  };
  const app = loadModule({ pma11y });
  app.boot();
  await tick();

  assert.equal(calls.length, 1, "showAccessibleDialog must be used exactly once");
  assert.equal(calls[0].el, app.modal());
  assert.equal(typeof calls[0].opts.onClose, "function");
  assert.match(calls[0].opts.announce, /Welcome video/);
  // The Escape branch of the a11y helper must close our dialog.
  calls[0].opts.onClose();
  assert.equal(app.modal(), null, "closing through the helper must remove the overlay");
});

test("Close removes the overlay, stops playback and remembers the dismissal", async () => {
  const app = loadModule();
  app.boot();
  await tick();
  const modal = app.modal();
  const iframe = modal.querySelector("iframe");

  modal.querySelector("[data-close-modal]").click();

  assert.equal(app.modal(), null, "the overlay must be removed");
  assert.equal(iframe.parentNode, null, "the iframe must be removed from the DOM");
  assert.equal(iframe.getAttribute("src"), "about:blank", "playback must be stopped");
  assert.equal(app.sessionStorage.getItem("pm_welcome_video_dismissed"), "1");
  assert.equal(app.localStorage.getItem("pm_welcome_video_dismissed"), null);
  // Keyboard focus returns to the page content, not to <body>.
  assert.equal(app.dom.document.activeElement.getAttribute("id"), "main-content");
  // No keydown listener is left behind.
  assert.equal(app.escape(), undefined);
  assert.equal(app.modal(), null);
});

test("Escape closes the popup, and only once it is topmost", async () => {
  const app = loadModule();
  app.boot();
  await tick();
  assert.ok(app.modal());
  app.escape();
  assert.equal(app.modal(), null, "Escape must dismiss the welcome popup");
  assert.equal(app.sessionStorage.getItem("pm_welcome_video_dismissed"), "1");

  // A second instance must not come back after a re-render/route change.
  app.run("window.PMWelcomeVideo.show()");
  assert.equal(app.modal(), null, "show() must refuse to reopen a dismissed popup");
  assert.equal(app.window.dispatch("hashchange"), undefined);
  assert.equal(app.modal(), null, "route changes must not reopen the popup");
});

test("a live web call screen is never covered by the welcome popup", async () => {
  const app = loadModule();
  app.addCallOverlay();
  app.boot();
  await tick();
  assert.equal(app.modal(), null, "a live call must win over the welcome video");

  // Same rule while the popup is already open: when a call screen appears,
  // the popup steps aside instead of blocking the call.
  const app2 = loadModule();
  app2.boot();
  await tick();
  assert.ok(app2.modal());
  app2.addCallOverlay();
  assert.equal(app2.modal(), null, "the popup must step aside for an incoming call");

  // ...and Escape must not be hijacked while a call overlay is on screen.
  const app3 = loadModule();
  app3.boot();
  await tick();
  assert.ok(app3.modal());
  const call = app3.dom.makeElement("div");
  call.setAttribute("id", "pmCallOverlay");
  app3.dom.document.body.appendChild(call);
  app3.escape();
  assert.ok(app3.modal(), "Escape belongs to the call screen, not to the welcome video");
});

test("Escape is left to any other visible dialog (but not to an empty host)", async () => {
  const app = loadModule();
  app.boot();
  await tick();
  assert.ok(app.modal());

  // An empty dialog host (e.g. the campaign modal container) is on screen but
  // has no size: our popup still owns Escape.
  const empty = app.dom.makeElement("div");
  empty.setAttribute("role", "dialog");
  empty.setAttribute("aria-modal", "true");
  app.dom.document.body.appendChild(empty);
  app.escape();
  assert.equal(app.modal(), null, "a zero-sized dialog host must not block Escape");

  // A genuinely visible dialog on top does own Escape.
  const other = loadModule();
  other.boot();
  await tick();
  const visible = other.dom.makeElement("div");
  visible.setAttribute("role", "dialog");
  visible.setAttribute("aria-modal", "true");
  visible.rect = { width: 320, height: 240, top: 10, left: 10 };
  other.dom.document.body.appendChild(visible);
  other.escape();
  assert.ok(other.modal(), "another visible dialog keeps the Escape key");
});

test("a player that never loads offers the YouTube link instead of a spinner", async () => {
  const app = loadModule();
  app.boot();
  await tick();
  const modal = app.modal();
  const fallback = modal.querySelector('[role="status"]');
  assert.equal(fallback.hidden, true, "nothing is shown while the player is loading");

  // Simulate the load timeout elapsing before the player reports anything.
  const timer = app.timers.find((entry) => entry.ms >= 8000 && !entry.cleared);
  assert.ok(timer, "the player load guard must be scheduled");
  timer.fn();
  assert.equal(fallback.hidden, false);
  assert.match(fallback.textContent, /Watch on YouTube/);

  // When the player does load, the notice disappears again.
  const iframe = modal.querySelector("iframe");
  iframe.dispatch("load", {});
  assert.equal(fallback.hidden, true);
});

test("only one instance of the popup can exist", async () => {
  const app = loadModule();
  app.boot();
  await tick();
  assert.equal(app.module().show(), false, "a second show() is refused");
  assert.equal(app.dom.registry.filter((el) => el.getAttribute("id") === "pmWelcomeVideo").length, 1);
  assert.equal(app.dom.document.querySelectorAll('[role="dialog"][aria-modal="true"]').length, 1);
});

test("a dismissed session does not show the popup again; a new session does", async () => {
  const returning = loadModule({ session: { pm_welcome_video_dismissed: "1" } });
  returning.boot();
  await tick();
  assert.equal(returning.modal(), null, "a dismissed popup must not reopen in the same session");

  const fresh = loadModule();
  fresh.boot();
  await tick();
  assert.ok(fresh.modal(), "a new browser session may show the welcome video again");
});

test("login/route state is untouched by showing and closing the popup", async () => {
  const app = loadModule({ local: { token: "secret-token", user: '{"role":"owner"}' } });
  app.boot();
  await tick();
  assert.ok(app.modal());
  app.escape();
  assert.equal(app.localStorage.getItem("token"), "secret-token");
  assert.equal(app.localStorage.getItem("user"), '{"role":"owner"}');
  // The module never writes routes or auth state.
  assert.doesNotMatch(moduleSource, /state\.token\s*=/);
  assert.doesNotMatch(moduleSource, /localStorage\.setItem|localStorage\.removeItem/);
});

test("autoplay is requested through the embed, without muted playback tricks", async () => {
  const app = loadModule();
  app.boot();
  await tick();
  const iframe = app.modal().querySelector("iframe");
  assert.match(iframe.getAttribute("src"), /autoplay=1/);
  assert.match(iframe.getAttribute("src"), /playsinline=1/);
  assert.match(iframe.getAttribute("src"), /rel=0/);
  // Forcing muted autoplay (or injecting the JS API) would be a bypass attempt.
  assert.doesNotMatch(moduleSource, /mute=1|enablejsapi|YT\.Player/);
  assert.doesNotMatch(iframe.getAttribute("src"), /mute=1/);
});

test("offline visitors get the fallback message, not a broken player", async () => {
  const app = loadModule({ onLine: false });
  app.boot();
  await tick();
  const modal = app.modal();
  assert.ok(modal, "the dialog is still shown so the YouTube link stays reachable");
  const iframe = modal.querySelector("iframe");
  assert.equal(iframe.getAttribute("src"), null, "no dead request while offline");
  const fallback = modal.querySelector('[role="status"]');
  assert.equal(fallback.hidden, false);
  assert.match(fallback.textContent, /offline/i);

  // Reconnecting starts the player in place.
  app.sandbox.navigator.onLine = true;
  app.window.dispatch("online", {});
  assert.equal(iframe.getAttribute("src"), EMBED_SRC);
  assert.equal(fallback.hidden, true);
});

test("the player is announced in the active language (en/hi/mr/te)", async () => {
  for (const [lang, sample] of [["hi", /[\u0900-\u097F]/], ["mr", /[\u0900-\u097F]/], ["te", /[\u0C00-\u0C7F]/]]) {
    const app = loadModule({ state: { lang } });
    app.boot();
    await tick();
    const modal = app.modal();
    const title = modal.querySelector("h2");
    if (lang === "hi" || lang === "mr") assert.match(title.textContent, sample);
    if (lang === "te") assert.match(title.textContent, sample);
    assert.doesNotMatch(title.textContent, /Welcome to Pashu-Mitra/, `${lang} must not fall back to English`);
  }
  const en = loadModule({ state: { lang: "en" } });
  en.boot();
  await tick();
  assert.equal(en.modal().querySelector("h2").textContent, "Welcome to Pashu-Mitra");
  // An unknown language falls back to English rather than breaking.
  const xx = loadModule({ state: { lang: "xx" } });
  xx.boot();
  await tick();
  assert.equal(xx.modal().querySelector("h2").textContent, "Welcome to Pashu-Mitra");
});
