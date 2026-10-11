/* ==========================================================================
   Pashu-Mitra — Welcome video popup (additive feature)
   --------------------------------------------------------------------------
   Shows the official Pashu-Mitra introduction video (video id QJILXRbxcts) in
   a centred, accessible dialog when the website is opened. The player is the
   privacy-enhanced YouTube embed; the only non-embed URL in this file is the
   direct watch link below.

   Zero-regression rules honoured here:
     * Additive only. It never touches routing, the router's own views, the
       authentication flow or the existing modals (QR tag / camp / medication
       photo / WebRTC call overlay). The dialog is appended to <body>, i.e.
       OUTSIDE #app, so an SPA re-render can never duplicate or destroy it.
     * The markup is created in JavaScript, deliberately NOT in index.html, so
       the "Skip to main content" link stays the first focusable element of the
       document body (GIGW A27 / WCAG 2.4.1) and the popup can never end up in
       normal document flow at the bottom of the page.
     * Session-scoped dismissal (sessionStorage): a dismissal survives route
       changes and same-session reloads, while a brand-new browser session may
       show the welcome video again.
     * No autoplay bypassing: autoplay=1 is requested, and when the browser
       blocks it YouTube's own Play control stays visible. We never force muted
       playback and never fake a "loading" screen.
     * Embedding is not assumed to work: if the player cannot load (offline,
       embedding disabled, network failure) the direct YouTube link remains.
   ========================================================================== */
(function () {
  "use strict";

  // ------------------------------------------------------------- constants --
  const VIDEO_ID = "QJILXRbxcts";
  // Privacy-enhanced embed URL — the only source used for the <iframe>.
  const EMBED_SRC = "https://www.youtube-nocookie.com/embed/" + VIDEO_ID +
    "?autoplay=1&playsinline=1&rel=0";
  // Direct link for the "Watch on YouTube" action.
  const WATCH_URL = "https://www.youtube.com/watch?v=" + VIDEO_ID;
  const MODAL_ID = "pmWelcomeVideo";
  const TITLE_ID = "pmWelcomeVideoTitle";
  const NOTE_ID = "pmWelcomeVideoNote";
  const SESSION_KEY = "pm_welcome_video_dismissed";
  // Rural/low-bandwidth patience: if the player has not reported a load after
  // this long, the direct YouTube link is offered instead of a silent spinner.
  const PLAYER_FALLBACK_MS = 12000;
  const LANGS = ["en", "mr", "hi", "te"];

  // Localised UI text for the four languages the application already ships
  // (en/mr/hi/te). Static strings only — nothing user-supplied is rendered.
  const TEXT = {
    en: {
      title: "Welcome to Pashu-Mitra",
      note: "Watch a short introduction to animal disease reporting, veterinary care and laboratory services.",
      player: "Pashu-Mitra welcome video",
      watch: "Watch on YouTube",
      watchHint: " (external site, opens in a new window)",
      close: "Close",
      closeLabel: "Close welcome video",
      fallback: "The video player could not load. Use “Watch on YouTube” to open the video in a new tab.",
      offline: "You appear to be offline. Reconnect to play the video here, or use “Watch on YouTube”.",
      announce: "Welcome video opened. Press Escape or choose Close to continue to the website.",
    },
    hi: {
      title: "पशु-मित्र में आपका स्वागत है",
      note: "पशु रोग रिपोर्टिंग, पशु चिकित्सा और प्रयोगशाला सेवाओं का संक्षिप्त परिचय देखें।",
      player: "पशु-मित्र स्वागत वीडियो",
      watch: "YouTube पर देखें",
      watchHint: " (बाहरी साइट, नई विंडो में खुलती है)",
      close: "बंद करें",
      closeLabel: "स्वागत वीडियो बंद करें",
      fallback: "वीडियो प्लेयर लोड नहीं हो सका। कृपया “YouTube पर देखें” से वीडियो खोलें।",
      offline: "आप ऑफ़लाइन लगते हैं। वीडियो यहाँ चलाने के लिए इंटरनेट से जुड़ें।",
      announce: "स्वागत वीडियो खुला है। वेबसाइट पर जाने के लिए Esc दबाएँ या बंद करें चुनें।",
    },
    mr: {
      title: "पशु-मित्र मध्ये आपले स्वागत आहे",
      note: "पशु रोग नोंदणी, पशुवैद्यकीय सेवा आणि प्रयोगशाळा सेवांची थोडक्यात ओळख पहा.",
      player: "पशु-मित्र स्वागत व्हिडिओ",
      watch: "YouTube वर पहा",
      watchHint: " (बाह्य साइट, नवीन विंडोमध्ये उघडते)",
      close: "बंद करा",
      closeLabel: "स्वागत व्हिडिओ बंद करा",
      fallback: "व्हिडिओ प्लेअर लोड झाला नाही. कृपया “YouTube वर पहा” वापरा.",
      offline: "तुम्ही ऑफलाइन आहात. व्हिडिओ येथे चालवण्यासाठी इंटरनेटशी कनेक्ट व्हा.",
      announce: "स्वागत व्हिडिओ उघडला आहे. वेबसाइटवर जाण्यासाठी Esc दाबा किंवा बंद करा निवडा.",
    },
    te: {
      title: "పశు-మిత్రకు స్వాగతం",
      note: "పశు వ్యాధి నివేదన, పశువైద్య సేవలు మరియు ప్రయోగశాల సేవల పరిచయాన్ని చూడండి.",
      player: "పశు-మిత్ర స్వాగత వీడియో",
      watch: "YouTubeలో చూడండి",
      watchHint: " (బాహ్య సైట్, కొత్త విండోలో తెరుచుకుంటుంది)",
      close: "మూసివేయి",
      closeLabel: "స్వాగత వీడియోను మూసివేయి",
      fallback: "వీడియో ప్లేయర్ లోడ్ కాలేదు. దయచేసి “YouTubeలో చూడండి” ఉపయోగించండి.",
      offline: "మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. వీడియో ఇక్కడ చూడటానికి ఇంటర్నెట్‌కు కనెక్ట్ అవ్వండి.",
      announce: "స్వాగత వీడియో తెరిచారు. వెబ్‌సైట్‌కు వెళ్లడానికి Esc నొక్కండి లేదా మూసివేయి ఎంచుకోండి.",
    },
  };

  // ------------------------------------------------------------- module state --
  let dismissed = readSession();
  let modalEl = null;
  let iframeEl = null;
  let fallbackEl = null;
  let loadTimer = null;
  let observer = null;
  let focusTarget = null;

  // ------------------------------------------------------------- small helpers --
  function readSession() {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (_) {
      // Storage unavailable (private mode / blocked cookies): fall back to an
      // in-memory flag, so the popup still only ever opens once per page.
      return false;
    }
  }

  function writeSession() {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch (_) {}
  }

  function currentLang() {
    let lang = "";
    // app.js declares `state` as a top-level const; reading it before app.js has
    // run throws (TDZ), hence the guard. window.state is checked as well for
    // deployments that expose it.
    try {
      if (typeof state !== "undefined" && state && state.lang) lang = String(state.lang);
    } catch (_) {}
    if (!lang && typeof window !== "undefined" && window.state && window.state.lang) {
      lang = String(window.state.lang);
    }
    if (!lang) {
      try { lang = window.localStorage.getItem("pm_lang") || ""; } catch (_) {}
    }
    if (!lang && typeof document !== "undefined" && document.documentElement) {
      lang = String(document.documentElement.lang || "");
    }
    lang = String(lang || "en").slice(0, 2).toLowerCase();
    return LANGS.indexOf(lang) >= 0 ? lang : "en";
  }

  function t(key) {
    const dict = TEXT[currentLang()] || TEXT.en;
    return dict[key] || TEXT.en[key] || key;
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function removeNode(node) {
    if (!node) return;
    try {
      if (node.parentNode) node.parentNode.removeChild(node);
      else if (node.remove) node.remove();
    } catch (_) {}
  }

  function callOverlayOpen() {
    // call.js removes #pmCallOverlay when the call screen is hidden, so its
    // presence means a live web call is on screen — never cover that.
    return typeof document !== "undefined" && !!document.getElementById("pmCallOverlay");
  }

  // ------------------------------------------------------------- markup --
  function build() {
    const overlay = make("div", "pm-modal-overlay pm-welcome-overlay");
    overlay.id = MODAL_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", TITLE_ID);
    overlay.setAttribute("aria-describedby", NOTE_ID);
    overlay.setAttribute("tabindex", "-1");

    const dialog = make("div", "pm-modal-content pm-welcome-dialog");

    const head = make("div", "pm-welcome-head");
    const title = make("h2", "pm-welcome-title", t("title"));
    title.id = TITLE_ID;
    const closeIcon = make("button", "pm-welcome-close", "✕");
    closeIcon.type = "button";
    closeIcon.setAttribute("data-close-modal", "");
    closeIcon.setAttribute("aria-label", t("closeLabel"));
    closeIcon.setAttribute("data-autofocus", "");
    head.appendChild(title);
    head.appendChild(closeIcon);

    const note = make("p", "pm-welcome-note", t("note"));
    note.id = NOTE_ID;

    // Responsive 16:9 box — the iframe is absolutely positioned inside it.
    const frameWrap = make("div", "pm-welcome-video-frame");
    const iframe = document.createElement("iframe");
    iframe.className = "pm-welcome-video-iframe";
    // src is set by startPlayer() so an offline visitor never gets a broken
    // player frame; until then the fallback text is shown.
    iframe.setAttribute("title", t("player"));
    iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.setAttribute("loading", "eager");
    iframe.setAttribute("frameborder", "0");
    frameWrap.appendChild(iframe);

    const fallback = make("p", "pm-welcome-fallback", "");
    fallback.hidden = true;
    fallback.setAttribute("role", "status");

    const actions = make("div", "pm-welcome-actions");
    const watch = document.createElement("a");
    watch.className = "btn btn-primary btn-sm pm-welcome-watch pm-ext-link";
    watch.setAttribute("href", WATCH_URL);
    watch.setAttribute("target", "_blank");
    watch.setAttribute("rel", "noopener noreferrer");
    watch.appendChild(document.createTextNode("▶ " + t("watch")));
    const extIcon = make("span", "pm-ext-icon", "↗");
    extIcon.setAttribute("aria-hidden", "true");
    watch.appendChild(extIcon);
    watch.appendChild(make("span", "sr-only", t("watchHint")));

    const closeBtn = make("button", "btn btn-outline btn-sm pm-welcome-close-text", t("close"));
    closeBtn.type = "button";
    closeBtn.setAttribute("data-close-modal", "");

    actions.appendChild(watch);
    actions.appendChild(closeBtn);

    dialog.appendChild(head);
    dialog.appendChild(note);
    dialog.appendChild(frameWrap);
    dialog.appendChild(fallback);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);

    return { overlay: overlay, iframe: iframe, fallback: fallback, watch: watch, closeIcon: closeIcon };
  }

  // ------------------------------------------------------------- player --
  function showFallback(message) {
    if (!fallbackEl) return;
    fallbackEl.textContent = message;
    fallbackEl.hidden = false;
  }

  function hideFallback() {
    if (!fallbackEl) return;
    fallbackEl.hidden = true;
    fallbackEl.textContent = "";
  }

  function startPlayer() {
    if (!iframeEl) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      // No connection: keep the frame idle (never a broken player) and say so.
      showFallback(t("offline"));
      return;
    }
    hideFallback();
    iframeEl.setAttribute("src", EMBED_SRC);
    clearTimeout(loadTimer);
    loadTimer = setTimeout(function () {
      // The player never reported a load — embedding may be disabled or the
      // network may have dropped. The YouTube link above stays available.
      showFallback(t("fallback"));
    }, PLAYER_FALLBACK_MS);
  }

  // ------------------------------------------------------------- show / close --
  // A dialog that has been rendered but emptied (e.g. the campaign modal
  // host) is not really on screen — it must not steal the Escape key.
  function isVisible(node) {
    if (!node || node.isConnected === false) return false;
    if (typeof node.getBoundingClientRect === "function") {
      const rect = node.getBoundingClientRect();
      if (rect && rect.width === 0 && rect.height === 0) return false;
    }
    return true;
  }

  function isTopmostDialog() {
    if (!modalEl) return false;
    if (callOverlayOpen()) return false;
    let dialogs = [];
    try {
      dialogs = Array.prototype.slice.call(document.querySelectorAll('[role="dialog"][aria-modal="true"]'));
    } catch (_) {
      dialogs = [];
    }
    // Any *visible* other dialog (a call screen, the QR card, …) owns Escape.
    return dialogs.filter(function (node) {
      return node !== modalEl && isVisible(node);
    }).length === 0;
  }

  function close(options) {
    const opts = options || {};
    if (!modalEl && !(typeof document !== "undefined" && document.getElementById(MODAL_ID))) {
      return false;
    }
    clearTimeout(loadTimer);
    loadTimer = null;
    // Stop playback: the player is torn down (and pointed away first) so the
    // video cannot keep playing behind the page after the dialog is dismissed.
    try {
      if (iframeEl && iframeEl.setAttribute) iframeEl.setAttribute("src", "about:blank");
    } catch (_) {}
    removeNode(iframeEl);
    iframeEl = null;
    fallbackEl = null;

    if (observer && observer.disconnect) {
      try { observer.disconnect(); } catch (_) {}
    }
    observer = null;

    document.removeEventListener("keydown", onKeydown, false);

    const node = modalEl || document.getElementById(MODAL_ID);
    // Releases the focus trap and restores the previously focused element.
    if (window.PMA11y && typeof window.PMA11y.hideAccessibleDialog === "function") {
      try { window.PMA11y.hideAccessibleDialog(node); } catch (_) {}
    }
    removeNode(node);
    modalEl = null;

    dismissed = true;
    if (opts.persist !== false) writeSession();

    // A web call that took over the screen owns the focus now.
    if (!opts.keepFocus) restoreFocus();
    return true;
  }

  function restoreFocus() {
    let target = focusTarget;
    if (!target || target === document.body || target === document.documentElement ||
        (target.isConnected === false)) {
      // Nothing meaningful to return to (the popup opens on a fresh page load):
      // hand focus back to the top of the page content instead of <body>.
      target = document.getElementById("main-content") || document.querySelector("main");
    }
    if (target && typeof target.focus === "function") {
      try { target.focus(); } catch (_) {}
    }
  }

  function onKeydown(event) {
    const key = event && event.key;
    if (key !== "Escape" && key !== "Esc") return;
    if (!modalEl) return;
    // Escape closes ONLY this welcome dialog. It never touches an active
    // WebRTC call screen or another application dialog.
    if (!isTopmostDialog()) return;
    if (event.preventDefault) event.preventDefault();
    close();
  }

  function watchForCalls() {
    if (typeof MutationObserver === "undefined" || !document.body) return;
    observer = new MutationObserver(function (mutations) {
      if (!modalEl) return;
      if (callOverlayOpen()) {
        // A farmer/vet web call is more important than the welcome video:
        // step aside without stealing focus from the call screen.
        close({ persist: true, keepFocus: true });
      }
    });
    try {
      observer.observe(document.body, { childList: true, subtree: false });
    } catch (_) {
      observer = null;
    }
  }

  function wire(built) {
    const closers = modalEl.querySelectorAll("[data-close-modal]");
    for (let i = 0; i < closers.length; i++) {
      closers[i].addEventListener("click", function () { close(); });
    }
    // Backdrop click dismisses, matching the existing QR/photo modal behaviour.
    modalEl.addEventListener("click", function (event) {
      if (event && event.target === modalEl) close();
    });
    if (built.iframe && built.iframe.addEventListener) {
      built.iframe.addEventListener("load", function () {
        clearTimeout(loadTimer);
        loadTimer = null;
        if (typeof navigator === "undefined" || navigator.onLine !== false) hideFallback();
      });
      built.iframe.addEventListener("error", function () {
        clearTimeout(loadTimer);
        loadTimer = null;
        showFallback(t("fallback"));
      });
    }
    document.addEventListener("keydown", onKeydown, false);
    window.addEventListener("online", startPlayer);
    watchForCalls();
  }

  function show() {
    if (typeof document === "undefined" || !document.body) return false;
    if (dismissed) return false;                       // already dismissed this session
    if (document.getElementById(MODAL_ID)) return false; // only one instance, ever
    if (callOverlayOpen()) return false;               // never cover a live call

    const built = build();
    modalEl = built.overlay;
    iframeEl = built.iframe;
    fallbackEl = built.fallback;
    focusTarget = document.activeElement || null;

    const host = document.getElementById("app");
    // Always a direct child of <body>: outside #app so route re-renders can
    // neither duplicate nor remove it, and never in the normal page flow.
    (document.body || (host && host.parentNode)).appendChild(modalEl);

    wire(built);
    startPlayer();

    if (window.PMA11y && typeof window.PMA11y.showAccessibleDialog === "function") {
      // Existing dialog helper: role/aria-modal, focus trap with Escape,
      // focus into the dialog and restoration on release.
      window.PMA11y.showAccessibleDialog(modalEl, {
        announce: t("announce"),
        onClose: function () { close(); },
      });
    } else if (built.closeIcon && built.closeIcon.focus) {
      try { built.closeIcon.focus(); } catch (_) {}
    }
    return true;
  }

  // ------------------------------------------------------------- boot --
  function init() {
    show();
  }

  function scheduleInit() {
    const run = function () { init(); };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () { setTimeout(run, 0); });
    } else {
      setTimeout(run, 0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleInit);
  } else {
    scheduleInit();
  }

  // Small public surface (used by the frontend tests and for manual QA).
  window.PMWelcomeVideo = {
    show: show,
    close: close,
    videoId: VIDEO_ID,
    embedSrc: EMBED_SRC,
    watchUrl: WATCH_URL,
    sessionKey: SESSION_KEY,
    isOpen: function () { return !!modalEl; },
    isDismissed: function () { return dismissed; },
  };
})();
