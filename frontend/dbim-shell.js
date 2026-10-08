/* Pashu Mitra — DBIM Header 3, global navigation, footer, cookie consent.
 * DBIM 5.4.3 (Header 3), 5.6 (footer), Annex A (navigation), 7.5 (language),
 * 7.6 (cookies); GIGW 3.0 5.2 (accessibility); DPDP Act 2023 (consent).
 * Loaded BEFORE shell.js; shell.js calls PMShell3 when present and falls back to
 * its older header/footer otherwise. All markup is built as strings from fixed
 * labels or escaped ORG values; interaction is wired by delegated listeners in
 * bind() (no new inline handlers).
 *
 * MERGE NOTE (2026-10-08): this file implements the DBIM shell contract of the
 * Pashu-Mitra redesign. It renders the OFFICIAL Pashu-Mitra logo
 * (assets/pashu-mitra-logo.png — green veterinary cross + cow head) exactly as
 * supplied; the redesign ZIP's generated shield/horns mark is deliberately NOT
 * used (owner decision, Step 5 of the merge brief). */
(function (root) {
  "use strict";
  var doc = root.document;

  /* ------------------------------------------------------------------ i18n
   * English, Hindi, Marathi and Telugu (the four supported app languages).
   * T() falls back to English for any key a language does not carry, so a
   * missing translation can never render as blank or as a code string. */
  var L = {
    en: {
      home: "Home", about: "About us", services: "Services", documents: "Documents", resources: "Resources", connect: "Connect",
      mylivestock: "My livestock", report: "Report a disease", callvet: "Call a veterinarian", scan: "Scan QR code",
      signinreq: "Sign in is needed for these services.",
      policies: "Policies and statements", privacy: "Privacy policy", terms: "Terms of use", access: "Accessibility statement",
      help: "Help and FAQs", sitemap: "Site map", contact: "Contact us", feedback: "Feedback", grievance: "Grievance redressal",
      search: "Search", searchph: "Search this site", voice: "Search by voice", signin: "Sign in", mydash: "My dashboard",
      farmer: "Farmer", vet: "Veterinary officer", admin: "Administrator", lab: "Laboratory",
      lang: "Language", textsize: "Text size", dec: "Decrease text size", reset: "Reset text size", inc: "Increase text size",
      contrast: "High contrast", motion: "Reduce motion", screenreader: "Screen reader access", menu: "Menu", tools: "Language and display",
      persona: "Sign in as", main: "Main navigation",
      fpolicy: "Website policy", copyright: "Copyright policy", hyper: "Hyperlinking policy", disclaimer: "Disclaimer", allpol: "All policies",
      fsite: "Sitemap", frel: "Related links", fhelp: "Help", faq: "FAQs", fa11y: "Accessibility help", cert: "Site certificates",
      certpending: "Not yet available: audit pending", transerr: "Report a translation error", ffeed: "Feedback",
      updated: "Last updated on", version: "Version", owner: "Content owned by", tech: "Technical contact",
      lineage: "This is an independent initiative and not an official Government of India website.",
      lineageGov: "Official Government of India portal.",
      conform: "Designed to conform to DBIM 3.0 and GIGW 3.0; CQW/STQC certification pending audit.",
      external: "opens in a new tab, external site", cookiesettings: "Cookie settings",
      ck_title: "Cookies on this site",
      ck_text: "We use only essential cookies and your saved choices (language, text size) to run the site. Other cookies stay off unless you allow them.",
      ck_accept: "Accept all", ck_reject: "Reject all", ck_custom: "Customise", ck_save: "Save choices",
      ck_ess: "Essential (always on): sign-in session, language and display choices.",
      ck_func: "Functionality: remember optional settings between visits.",
      ck_ana: "Analytics: privacy-safe counts of pages visited, to improve the site.",
      ck_soc: "Social: show social media content and sharing.",
      ck_saved: "Cookie choices saved.", pause: "Pause announcements", play: "Play announcements", ann: "Announcements"
    },
    hi: {
      home: "होम", about: "हमारे बारे में", services: "सेवाएँ", documents: "दस्तावेज़", resources: "संसाधन", connect: "संपर्क",
      mylivestock: "मेरे पशु", report: "बीमारी की सूचना दें", callvet: "पशु चिकित्सक को कॉल करें", scan: "क्यूआर कोड स्कैन करें",
      signinreq: "इन सेवाओं के लिए साइन इन आवश्यक है।",
      policies: "नीतियाँ और वक्तव्य", privacy: "गोपनीयता नीति", terms: "उपयोग की शर्तें", access: "सुगम्यता वक्तव्य",
      help: "सहायता और अक्सर पूछे जाने वाले प्रश्न", sitemap: "साइट मैप", contact: "संपर्क करें", feedback: "प्रतिक्रिया", grievance: "शिकायत निवारण",
      search: "खोजें", searchph: "इस साइट में खोजें", voice: "बोलकर खोजें", signin: "साइन इन", mydash: "मेरा डैशबोर्ड",
      farmer: "किसान", vet: "पशु चिकित्सा अधिकारी", admin: "प्रशासक", lab: "प्रयोगशाला",
      lang: "भाषा", textsize: "अक्षर आकार", dec: "अक्षर आकार घटाएँ", reset: "अक्षर आकार सामान्य करें", inc: "अक्षर आकार बढ़ाएँ",
      contrast: "उच्च कंट्रास्ट", motion: "गति कम करें", screenreader: "स्क्रीन रीडर सुविधा", menu: "मेन्यू", tools: "भाषा और प्रदर्शन",
      persona: "इस रूप में साइन इन करें", main: "मुख्य नेविगेशन",
      fpolicy: "वेबसाइट नीति", copyright: "कॉपीराइट नीति", hyper: "हाइपरलिंकिंग नीति", disclaimer: "अस्वीकरण", allpol: "सभी नीतियाँ",
      fsite: "साइट मैप", frel: "संबंधित लिंक", fhelp: "सहायता", faq: "अक्सर पूछे जाने वाले प्रश्न", fa11y: "सुगम्यता सहायता", cert: "साइट प्रमाणपत्र",
      certpending: "अभी उपलब्ध नहीं: ऑडिट लंबित", transerr: "अनुवाद की त्रुटि बताएँ", ffeed: "प्रतिक्रिया",
      updated: "अंतिम अद्यतन", version: "संस्करण", owner: "सामग्री स्वामी", tech: "तकनीकी संपर्क",
      lineage: "यह एक स्वतंत्र पहल है और भारत सरकार की आधिकारिक वेबसाइट नहीं है।",
      lineageGov: "भारत सरकार का आधिकारिक पोर्टल।",
      conform: "DBIM 3.0 और GIGW 3.0 के अनुरूप बनाया गया; CQW/STQC प्रमाणन ऑडिट के लिए लंबित है।",
      external: "नए टैब में खुलता है, बाहरी साइट", cookiesettings: "कुकी सेटिंग",
      ck_title: "इस साइट पर कुकीज़",
      ck_text: "साइट चलाने के लिए हम केवल आवश्यक कुकीज़ और आपकी सहेजी गई पसंद (भाषा, अक्षर आकार) का उपयोग करते हैं। अन्य कुकीज़ आपकी अनुमति के बिना बंद रहती हैं।",
      ck_accept: "सभी स्वीकार करें", ck_reject: "सभी अस्वीकार करें", ck_custom: "अनुकूलित करें", ck_save: "चुनाव सहेजें",
      ck_ess: "आवश्यक (हमेशा चालू): साइन-इन सत्र, भाषा और प्रदर्शन की पसंद।",
      ck_func: "कार्यक्षमता: अगली बार के लिए वैकल्पिक सेटिंग याद रखें।",
      ck_ana: "विश्लेषण: साइट सुधारने के लिए देखे गए पृष्ठों की गोपनीयता-सुरक्षित गिनती।",
      ck_soc: "सोशल: सोशल मीडिया सामग्री और साझा करना दिखाएँ।",
      ck_saved: "कुकी चुनाव सहेज लिए गए।", pause: "घोषणाएँ रोकें", play: "घोषणाएँ चलाएँ", ann: "घोषणाएँ"
    },
    mr: {
      home: "मुख्यपृष्ठ", about: "आमच्याबद्दल", services: "सेवा", documents: "दस्तऐवज", resources: "संसाधने", connect: "संपर्क",
      mylivestock: "माझी जनावरे", report: "रोगाची नोंद करा", callvet: "पशुवैद्यकांना कॉल करा", scan: "क्यूआर कोड स्कॅन करा",
      signinreq: "या सेवांसाठी साइन इन आवश्यक आहे.",
      policies: "धोरणे आणि निवेदने", privacy: "गोपनीयता धोरण", terms: "वापराच्या अटी", access: "सुगम्यता निवेदन",
      help: "मदत आणि वारंवार विचारले जाणारे प्रश्न", sitemap: "संकेतस्थळ नकाशा", contact: "संपर्क साधा", feedback: "अभिप्राय", grievance: "तक्रार निवारण",
      search: "शोधा", searchph: "या संकेतस्थळावर शोधा", voice: "बोलून शोधा", signin: "साइन इन", mydash: "माझे डॅशबोर्ड",
      farmer: "शेतकरी", vet: "पशुवैद्यक अधिकारी", admin: "प्रशासक", lab: "प्रयोगशाळा",
      lang: "भाषा", textsize: "अक्षर आकार", dec: "अक्षर आकार कमी करा", reset: "अक्षर आकार पूर्ववत करा", inc: "अक्षर आकार वाढवा",
      contrast: "उच्च कॉन्ट्रास्ट", motion: "हालचाल कमी करा", screenreader: "स्क्रीन रीडर सुविधा", menu: "मेनू", tools: "भाषा आणि प्रदर्शन",
      persona: "या रूपात साइन इन करा", main: "मुख्य नेव्हिगेशन",
      fpolicy: "संकेतस्थळ धोरण", copyright: "सर्वहक्कस्वत्व धोरण", hyper: "हायपरलिंकिंग धोरण", disclaimer: "अस्वीकरण", allpol: "सर्व धोरणे",
      fsite: "संकेतस्थळ नकाशा", frel: "संबंधित दुवे", fhelp: "मदत", faq: "वारंवार विचारले जाणारे प्रश्न", fa11y: "सुगम्यता मदत", cert: "संकेतस्थळ प्रमाणपत्रे",
      certpending: "अद्याप उपलब्ध नाही: ऑडिट प्रलंबित", transerr: "भाषांतरातील त्रुटी कळवा", ffeed: "अभिप्राय",
      updated: "शेवटचे अद्यतन", version: "आवृत्ती", owner: "सामग्री मालकी", tech: "तांत्रिक संपर्क",
      lineage: "ही एक स्वतंत्र उपक्रम आहे आणि भारत सरकारची अधिकृत वेबसाइट नाही.",
      lineageGov: "भारत सरकारचे अधिकृत पोर्टल.",
      conform: "DBIM 3.0 आणि GIGW 3.0 अनुरूप तयार केले; CQW/STQC प्रमाणन ऑडिट प्रलंबित.",
      external: "नवीन टॅबमध्ये उघडते, बाह्य संकेतस्थळ", cookiesettings: "कुकी सेटिंग्ज",
      ck_title: "या संकेतस्थळावरील कुकीज",
      ck_text: "संकेतस्थळ चालवण्यासाठी आम्ही फक्त आवश्यक कुकीज आणि तुमची जतन केलेली पसंती (भाषा, अक्षर आकार) वापरतो. इतर कुकीज तुमच्या परवानगीशिवाय बंद राहतात.",
      ck_accept: "सर्व स्वीकारा", ck_reject: "सर्व नाकारा", ck_custom: "सानुकूलित करा", ck_save: "पसंती जतन करा",
      ck_ess: "आवश्यक (नेहमी चालू): साइन-इन सत्र, भाषा आणि प्रदर्शन पसंती.",
      ck_func: "कार्यक्षमता: पुढील भेटीसाठी ऐच्छिक सेटिंग्ज लक्षात ठेवा.",
      ck_ana: "विश्लेषण: संकेतस्थळ सुधारण्यासाठी पाहिलेल्या पृष्ठांची गोपनीयता-सुरक्षित मोजणी.",
      ck_soc: "सोशल: सोशल मीडिया सामग्री आणि शेअरिंग दाखवा.",
      ck_saved: "कुकी पसंती जतन केली.", pause: "घोषणा थांबवा", play: "घोषणा सुरू करा", ann: "घोषणा"
    },
    te: {
      home: "హోమ్", about: "మా గురించి", services: "సేవలు", documents: "పత్రాలు", resources: "వనరులు", connect: "సంప్రదించండి",
      mylivestock: "నా పశువులు", report: "వ్యాధిని నివేదించండి", callvet: "పశువైద్యునికి కాల్ చేయండి", scan: "క్యూఆర్ కోడ్ స్కాన్ చేయండి",
      signinreq: "ఈ సేవలకు సైన్ ఇన్ అవసరం.",
      policies: "విధానాలు మరియు ప్రకటనలు", privacy: "గోప్యతా విధానం", terms: "వినియోగ నిబంధనలు", access: "యాక్సెసిబిలిటీ ప్రకటన",
      help: "సహాయం మరియు తరచుగా అడిగే ప్రశ్నలు", sitemap: "సైట్ మ్యాప్", contact: "సంప్రదించండి", feedback: "అభిప్రాయం", grievance: "ఫిర్యాదు పరిష్కారం",
      search: "వెతకండి", searchph: "ఈ సైట్‌లో వెతకండి", voice: "మాట్లాడి వెతకండి", signin: "సైన్ ఇన్", mydash: "నా డాష్‌బోర్డ్",
      farmer: "రైతు", vet: "పశువైద్య అధికారి", admin: "నిర్వాహకుడు", lab: "ప్రయోగశాల",
      lang: "భాష", textsize: "అక్షర పరిమాణం", dec: "అక్షర పరిమాణం తగ్గించండి", reset: "అక్షర పరిమాణం రీసెట్ చేయండి", inc: "అక్షర పరిమాణం పెంచండి",
      contrast: "అధిక కాంట్రాస్ట్", motion: "చలనం తగ్గించండి", screenreader: "స్క్రీన్ రీడర్ సౌకర్యం", menu: "మెనూ", tools: "భాష మరియు ప్రదర్శన",
      persona: "ఈ రూపంలో సైన్ ఇన్ చేయండి", main: "ప్రధాన నావిగేషన్",
      fpolicy: "వెబ్‌సైట్ విధానం", copyright: "కాపీరైట్ విధానం", hyper: "హైపర్‌లింకింగ్ విధానం", disclaimer: "నిరాకరణ", allpol: "అన్ని విధానాలు",
      fsite: "సైట్ మ్యాప్", frel: "సంబంధిత లింకులు", fhelp: "సహాయం", faq: "తరచుగా అడిగే ప్రశ్నలు", fa11y: "యాక్సెసిబిలిటీ సహాయం", cert: "సైట్ ధృవపత్రాలు",
      certpending: "ప్రస్తుతం అందుబాటులో లేదు: ఆడిట్ పెండింగ్", transerr: "అనువాద లోపాన్ని తెలియజేయండి", ffeed: "అభిప్రాయం",
      updated: "చివరి నవీకరణ", version: "సంస్కరణ", owner: "కంటెంట్ యాజమాన్యం", tech: "సాంకేతిక సంప్రదింపు",
      lineage: "ఇది ఒక స్వతంత్ర చొరవ మరియు భారత ప్రభుత్వ అధికారిక వెబ్‌సైట్ కాదు.",
      lineageGov: "భారత ప్రభుత్వ అధికారిక పోర్టల్.",
      conform: "DBIM 3.0 మరియు GIGW 3.0 కి అనుగుణంగా రూపొందించబడింది; CQW/STQC ధృవీకరణ ఆడిట్ పెండింగ్‌లో ఉంది.",
      external: "కొత్త ట్యాబ్‌లో తెరుస్తుంది, బాహ్య సైట్", cookiesettings: "కుక్కీ సెట్టింగ్‌లు",
      ck_title: "ఈ సైట్‌లో కుక్కీలు",
      ck_text: "సైట్‌ను నడపడానికి మేము అవసరమైన కుక్కీలు మరియు మీ సేవ్ చేసిన ప్రాధాన్యతలను (భాష, అక్షర పరిమాణం) మాత్రమే ఉపయోగిస్తాము. మీ అనుమతి లేకుండా ఇతర కుక్కీలు ఆఫ్‌లో ఉంటాయి.",
      ck_accept: "అన్నింటినీ అంగీకరించండి", ck_reject: "అన్నింటినీ తిరస్కరించండి", ck_custom: "అనుకూలీకరించండి", ck_save: "ఎంపికలను సేవ్ చేయండి",
      ck_ess: "అవసరమైనవి (ఎల్లప్పుడూ ఆన్): సైన్-ఇన్ సెషన్, భాష మరియు ప్రదర్శన ఎంపికలు.",
      ck_func: "ఫంక్షనాలిటీ: తదుపరి సందర్శనల కోసం ఐచ్ఛిక సెట్టింగ్‌లను గుర్తుంచుకోండి.",
      ck_ana: "విశ్లేషణలు: సైట్‌ను మెరుగుపరచడానికి సందర్శించిన పేజీల గోప్యత-సురక్షిత లెక్కలు.",
      ck_soc: "సోషల్: సోషల్ మీడియా కంటెంట్ మరియు షేరింగ్‌ను చూపించండి.",
      ck_saved: "కుక్కీ ఎంపికలు సేవ్ చేయబడ్డాయి.", pause: "ప్రకటనలను పాజ్ చేయండి", play: "ప్రకటనలను ప్లే చేయండి", ann: "ప్రకటనలు"
    }
  };

  function lang() {
    try {
      var s = root.localStorage.getItem("pm_lang");
      if (s && L[s]) return s;
    } catch (_) {}
    var a = doc.documentElement && doc.documentElement.getAttribute("lang");
    return L[a] ? a : "en";
  }
  function T(k) { var t = L[lang()]; return (t && t[k]) || L.en[k] || k; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
  function org() { return root.ORG || {}; }
  function $(sel) { return doc.querySelector(sel); }

  /* Official Pashu-Mitra logo (green veterinary cross + cow head). The artwork
   * is embedded byte-for-byte: only its height is constrained by CSS and the
   * intrinsic aspect ratio is preserved, so it is never stretched or cropped. */
  var LOGO_SRC = "assets/pashu-mitra-logo.png";
  var LOGO_ALT = "Pashu-Mitra";
  function logoHtml(cls) {
    return '<img class="pm-logo-img' + (cls ? " " + cls : "") + '" src="' + LOGO_SRC + '" alt="' + LOGO_ALT + '" width="44" height="44" />';
  }

  function ddmmyyyy(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
  }
  function lastUpdatedFor(hash) {
    var o = org(), h = String(hash || "").split("?")[0];
    var iso = (o.pageUpdated && o.pageUpdated[h]) || o.lastReviewed || "";
    return ddmmyyyy(iso);
  }

  /* ------------------------------------------------------- navigation model
   * At most 3 levels (DBIM Annex A). Every internal href must be a route the
   * application registers (see frontend/tests/shell_official_logo.test.mjs). */
  function navModel() {
    return [
      { href: "#/", label: "home" },
      { href: "#/about", label: "about" },
      { label: "services", items: [
        { href: "#/owner/livestock", label: "mylivestock" },
        { href: "#/owner/report", label: "report" },
        { href: "#/owner/webcall", label: "callvet" }
      ] },
      { label: "documents", items: [
        { href: "#/policies", label: "policies" },
        { href: "#/policies/accessibility", label: "access" },
        { href: "#/sitemap", label: "sitemap" }
      ] },
      { label: "resources", items: [
        { href: "#/help", label: "help" },
        { href: "#/search", label: "search" },
        { href: "#/scan", label: "scan" }
      ] },
      { label: "connect", items: [
        { href: "#/contact", label: "contact" },
        { href: "#/feedback", label: "feedback" },
        { href: "#/policies/grievance", label: "grievance" }
      ] }
    ];
  }

  var ICON = {
    caret: '<svg class="pm-ico" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true" focusable="false"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    pause: '<svg class="pm-ico" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M3 1h3v12H3zM8 1h3v12H8z" fill="currentColor"/></svg>',
    mic: '<svg class="pm-ico" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-5 0v-4A2.5 2.5 0 0 1 8 1zM4 7a4 4 0 0 0 8 0h1.5a5.5 5.5 0 0 1-4.75 5.45V15h-1.5v-2.55A5.5 5.5 0 0 1 2.5 7H4z" fill="currentColor"/></svg>'
  };

  /* ------------------------------------------------------------- engagement */
  function renderEngagement() {
    return '<div class="pm-eng" id="pmEng">' +
      '<div class="pm-eng-in">' +
        '<form class="pm-hsearch" id="pmHSearch" role="search" action="#/search">' +
          '<label class="sr-only" for="pmHQ">' + esc(T("searchph")) + "</label>" +
          '<input id="pmHQ" name="q" type="search" placeholder="' + esc(T("searchph")) + '" autocomplete="off" />' +
          '<button type="button" class="pm-ibtn" id="pmVoice" hidden aria-pressed="false" aria-label="' + esc(T("voice")) + '">' + ICON.mic + "</button>" +
          '<button type="submit" class="pm-ibtn" aria-label="' + esc(T("search")) + '">' + esc(T("search")) + "</button>" +
        "</form>" +
        '<div class="pm-uctl">' +
          '<span class="pm-langsel"><span class="pm-langicon" aria-hidden="true">अ | A</span>' +
            '<label class="sr-only" for="pmLang">' + esc(T("lang")) + "</label>" +
            '<select id="pmLang" aria-label="' + esc(T("lang")) + '">' +
              '<option value="en">English</option><option value="hi">हिन्दी</option>' +
              '<option value="mr">मराठी</option><option value="te">తెలుగు</option>' +
            "</select></span>" +
          '<span class="pm-tsz" role="group" aria-label="' + esc(T("textsize")) + '">' +
            '<button type="button" class="pm-ibtn-text" data-pm-size="dec" aria-label="' + esc(T("dec")) + '">A-</button>' +
            '<button type="button" class="pm-ibtn-text" data-pm-size="reset" aria-label="' + esc(T("reset")) + '">A</button>' +
            '<button type="button" class="pm-ibtn-text" data-pm-size="inc" aria-label="' + esc(T("inc")) + '">A+</button>' +
          "</span>" +
          '<button type="button" class="pm-ibtn-text" data-pm-pref="highContrast" aria-pressed="false">' + esc(T("contrast")) + "</button>" +
          '<button type="button" class="pm-ibtn-text" data-pm-pref="reducedMotion" aria-pressed="false">' + esc(T("motion")) + "</button>" +
          '<a class="pm-sr-link" href="#main-content">' + esc(T("screenreader")) + "</a>" +
        "</div>" +
      "</div></div>";
  }

  /* ----------------------------------------------------------------- header */
  function renderNav() {
    var out = '<ul class="pm-gnav-list">', i = 0;
    navModel().forEach(function (n) {
      if (!n.items) {
        out += '<li><a class="pm-navlink" href="' + n.href + '">' + esc(T(n.label)) + "</a></li>";
        return;
      }
      var pid = "pmNavP" + (i++);
      out += '<li class="pm-has-sub"><button type="button" class="pm-disc" data-pm-disc aria-expanded="false" aria-controls="' + pid + '">' +
        esc(T(n.label)) + ICON.caret + "</button>" +
        '<div class="pm-panel" id="' + pid + '" hidden><ul class="pm-sub">' +
        n.items.map(function (s) { return '<li><a href="' + s.href + '">' + esc(T(s.label)) + "</a></li>"; }).join("") +
        "</ul></div></li>";
    });
    return out + "</ul>";
  }

  function renderHeader() {
    var signId = "pmSignP";
    return '<header class="pm-h3" role="banner">' +
      renderEngagement() +
      '<div class="pm-mainbar"><div class="pm-mainbar-in">' +
        '<a class="pm-brand" href="#/" aria-label="' + LOGO_ALT + ' – Home">' + logoHtml() +
          '<span class="sr-only">' + LOGO_ALT + "</span></a>" +
        '<div class="pm-mbtns">' +
          '<button type="button" class="pm-ibtn-text" id="pmMenuBtn" aria-expanded="false" aria-controls="pmNavWrap">' + esc(T("menu")) + ICON.caret + "</button>" +
        "</div>" +
        '<nav class="pm-navwrap" id="pmNavWrap" aria-label="' + esc(T("main")) + '">' + renderNav() +
          '<div class="pm-signin"><button type="button" class="pm-disc" data-pm-disc aria-expanded="false" aria-controls="' + signId + '">' +
            esc(T("signin")) + ICON.caret + "</button>" +
            '<div class="pm-panel" id="' + signId + '" hidden>' +
              '<p class="pm-subnote">' + esc(T("persona")) + "</p>" +
              '<ul class="pm-sub">' +
                '<li><a href="#/login/owner">' + esc(T("farmer")) + "</a></li>" +
                '<li><a href="#/login/vet">' + esc(T("vet")) + "</a></li>" +
                '<li><a href="#/login/govt">' + esc(T("admin")) + "</a></li>" +
                '<li><a href="#/login/lab">' + esc(T("lab")) + "</a></li>" +
              "</ul>" +
              '<p class="pm-subnote">' + esc(T("signinreq")) + "</p>" +
              '<ul class="pm-sub"><li><a href="#/owner/dashboard">' + esc(T("mydash")) + "</a></li></ul>" +
            "</div></div>" +
        "</nav>" +
      "</div></div></header>";
  }

  /* ----------------------------------------------------------------- footer */
  function renderFooter() {
    var o = org(), owner = o.owner || {}, wim = o.wim || {}, gov = !!o.officialGovPortal;
    function pol(id, label) {
      return '<li><a href="#/policies/' + id + '">' + esc(label) + "</a></li>";
    }
    return '<footer class="pm-f3" role="contentinfo">' +
      '<div class="pm-f3-top"><span class="pm-logo-chip">' + logoHtml() + "</span>" +
        "<div><strong>" + esc(o.appName || LOGO_ALT) + "</strong>" +
        (owner.name ? '<div class="pm-f3-note">' + esc(T("owner")) + ": " + esc(owner.name) + "</div>" : "") + "</div></div>" +
      '<div class="pm-f3-grid">' +
        '<nav aria-label="' + esc(T("fpolicy")) + '"><h2>' + esc(T("fpolicy")) + "</h2><ul>" +
          pol("privacy", T("privacy")) + pol("terms", T("terms")) + pol("copyright", T("copyright")) +
          pol("hyperlinking", T("hyper")) + pol("disclaimer", T("disclaimer")) + pol("accessibility", T("access")) +
          '<li><a href="#/policies">' + esc(T("allpol")) + "</a></li></ul></nav>" +
        '<nav aria-label="' + esc(T("fsite")) + '"><h2>' + esc(T("fsite")) + "</h2><ul>" +
          '<li><a href="#/sitemap">' + esc(T("sitemap")) + "</a></li>" +
          '<li><a href="#/search">' + esc(T("search")) + "</a></li>" +
          '<li><a href="#/about">' + esc(T("about")) + "</a></li>" +
          '<li><a href="#/contact">' + esc(T("contact")) + "</a></li></ul></nav>" +
        '<nav aria-label="' + esc(T("frel")) + '"><h2>' + esc(T("frel")) + "</h2><ul>" +
          '<li><a href="#/help">' + esc(T("fhelp")) + "</a></li>" +
          '<li><a href="#/help">' + esc(T("faq")) + "</a></li>" +
          '<li><a href="#/policies/accessibility">' + esc(T("fa11y")) + "</a></li>" +
          '<li><a href="#/policies/grievance">' + esc(T("grievance")) + "</a></li></ul></nav>" +
        '<nav aria-label="' + esc(T("fhelp")) + '"><h2>' + esc(T("fhelp")) + "</h2><ul>" +
          '<li><a href="#/help">' + esc(T("help")) + "</a></li>" +
          '<li><a href="#/feedback">' + esc(T("feedback")) + "</a></li>" +
          '<li><a href="#/contact">' + esc(T("contact")) + "</a></li>" +
          '<li><a href="#/scan">' + esc(T("scan")) + "</a></li></ul></nav>" +
        '<div><h2>' + esc(T("connect")) + "</h2><ul>" +
          '<li><a href="#/feedback">' + esc(T("ffeed")) + "</a></li>" +
          '<li><a href="#/contact">' + esc(T("contact")) + "</a></li>" +
          '<li><span class="pm-f3-note">' + esc(T("transerr")) + "</span></li>" +
          '<li><span class="pm-f3-note">' + esc(T("cert")) + ": " + esc(T("certpending")) + "</span></li></ul></div>" +
      "</div>" +
      '<div class="pm-f3-bar">' +
        "<p>" + esc(T("owner")) + ": " + esc(owner.name || "") + ". " + esc(T("tech")) + ": " + esc(wim.name || "") + (wim.email ? ", " + esc(wim.email) : "") + ".</p>" +
        '<p>' + esc(T("updated")) + ' <time id="pmLastUpdated">' + esc(lastUpdatedFor(root.location && root.location.hash)) + "</time>" +
          (o.version ? " · " + esc(T("version")) + " " + esc(o.version) : "") + "</p>" +
        "<p>" + esc(gov ? T("lineageGov") : T("lineage")) + "</p>" +
        "<p>" + esc(T("conform")) + "</p>" +
        '<p><button type="button" class="pm-linkbtn" data-pm-cookie-open>' + esc(T("cookiesettings")) + "</button></p>" +
      "</div></footer>";
  }

  /* ------------------------------------------------ announcements ticker */
  function renderTicker() {
    var a = org().announcements || [];
    if (!a.length) return "";
    var items = a.map(function (x) { return "<li>" + (x.href ? '<a href="' + esc(x.href) + '">' + esc(x.text) + "</a>" : esc(x.text)) + "</li>"; }).join("");
    return '<section class="pm-ticker" aria-label="' + esc(T("ann")) + '"><button type="button" class="pm-ibtn-text" data-pm-ticker aria-pressed="false" aria-label="' + esc(T("pause")) + '">' +
      ICON.pause + '</button><ul class="pm-ticker-list">' + items + "</ul></section>";
  }

  /* ----------------------------------------------------- cookie consent */
  var KEY = "pm_consent";
  var CATS = ["functionality", "analytics", "social"];
  var listeners = [];
  function readConsent() {
    try { var v = JSON.parse(root.localStorage.getItem(KEY) || "null"); return v && v.v === 1 ? v : null; } catch (_) { return null; }
  }
  function saveConsent(map) {
    var v = { v: 1, ts: new Date().toISOString() };
    CATS.forEach(function (c) { v[c] = !!map[c]; });
    try { root.localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) {}
    listeners.forEach(function (f) { try { f(v); } catch (_) {} });
    return v;
  }
  var consent = {
    get: function (cat) { var v = readConsent(); return !!(v && v[cat]); },   // unknown -> false (opt-in)
    decided: function () { return !!readConsent(); },
    accept: function () { return saveConsent({ functionality: 1, analytics: 1, social: 1 }); },
    reject: function () { return saveConsent({}); },
    set: saveConsent,
    onChange: function (f) { listeners.push(f); }
  };
  function renderCookie() {
    var boxes = [["functionality", "ck_func"], ["analytics", "ck_ana"], ["social", "ck_soc"]].map(function (c) {
      return '<label class="pm-ck-opt"><input type="checkbox" name="' + c[0] + '"> <span>' + esc(T(c[1])) + "</span></label>"; }).join("");
    return '<section class="pm-cookie" id="pmCookie" role="region" aria-labelledby="pmCkT" hidden>' +
      '<h2 id="pmCkT">' + esc(T("ck_title")) + "</h2><p>" + esc(T("ck_text")) + "</p>" +
      '<p class="pm-f3-note">' + esc(T("ck_ess")) + "</p>" +
      '<form class="pm-ck-panel" id="pmCkForm" hidden><p>' + boxes + "</p>" +
        '<div class="pm-ck-actions"><button type="submit" class="btn btn-primary" data-ck="save">' + esc(T("ck_save")) + "</button></div></form>" +
      '<div class="pm-ck-actions">' +
        '<button type="button" class="btn btn-primary" data-ck="accept">' + esc(T("ck_accept")) + "</button>" +
        '<button type="button" class="btn" data-ck="reject">' + esc(T("ck_reject")) + "</button>" +
        '<button type="button" class="btn" data-ck="custom">' + esc(T("ck_custom")) + "</button>" +
      "</div></section>";
  }

  /* -------------------------------------------------------------- announce */
  function announce(msg, assertive) {
    var el = doc.getElementById(assertive ? "pmLiveAssertive" : "pmLivePolite");
    if (el) { el.textContent = ""; root.setTimeout(function () { el.textContent = String(msg == null ? "" : msg); }, 30); }
  }

  /* ------------------------------------------------------------------ bind */
  function closeAll() {
    var list = doc.querySelectorAll("[data-pm-disc][aria-expanded='true']");
    for (var i = 0; i < list.length; i++) {
      list[i].setAttribute("aria-expanded", "false");
      var p = doc.getElementById(list[i].getAttribute("aria-controls"));
      if (p) p.hidden = true;
    }
  }
  function setScale(delta) {
    var S = root.PashuShell;
    if (!S || !S.setScaleIndex) return;
    if (delta === 0) S.setScaleIndex(1); else S.setScaleIndex(S.getScaleIndex() + delta);
  }
  function applyLang(l) {
    try { root.localStorage.setItem("pm_lang", l); } catch (_) {}
    doc.documentElement.lang = l;
    if (typeof root.setLang === "function") { try { root.setLang(l); } catch (_) {} }
    root.dispatchEvent(new root.Event("pm:langchange"));
  }
  function bind() {
    doc.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-pm-disc],[data-pm-size],[data-pm-pref],[data-ck],[data-pm-cookie-open],[data-pm-ticker],#pmMenuBtn") : null;
      if (!t) { if (!e.target.closest || !e.target.closest(".pm-panel")) closeAll(); return; }
      if (t.id === "pmMenuBtn") {
        var w = $("#pmNavWrap"), open = t.getAttribute("aria-expanded") === "true";
        t.setAttribute("aria-expanded", open ? "false" : "true");
        if (w) w.classList.toggle("is-open", !open);
        return;
      }
      if (t.hasAttribute("data-pm-disc")) {
        var open2 = t.getAttribute("aria-expanded") === "true";
        closeAll();
        t.setAttribute("aria-expanded", open2 ? "false" : "true");
        var p = doc.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = open2;
        e.preventDefault(); return;
      }
      if (t.hasAttribute("data-pm-size")) { setScale(t.getAttribute("data-pm-size") === "inc" ? 1 : t.getAttribute("data-pm-size") === "dec" ? -1 : 0); return; }
      if (t.hasAttribute("data-pm-pref")) {
        var S = root.PashuShell; if (S && S.togglePref) S.togglePref(t.getAttribute("data-pm-pref"));
        var on = S && S.prefs && S.prefs[t.getAttribute("data-pm-pref")];
        t.setAttribute("aria-pressed", on ? "true" : "false");
        return;
      }
      if (t.hasAttribute("data-pm-cookie-open")) { showCookie(true); return; }
      if (t.hasAttribute("data-pm-ticker")) {
        var ul = $(".pm-ticker-list"); if (ul) ul.classList.toggle("is-paused");
        var paused = ul && ul.classList.contains("is-paused");
        t.setAttribute("aria-pressed", paused ? "true" : "false");
        t.setAttribute("aria-label", paused ? T("play") : T("pause"));
        return;
      }
      var ck = t.getAttribute("data-ck");
      if (ck) {
        if (ck === "accept") { consent.accept(); hideCookie(); announce(T("ck_saved")); }
        else if (ck === "reject") { consent.reject(); hideCookie(); announce(T("ck_saved")); }
        else if (ck === "custom") { var f = $("#pmCkForm"); if (f) f.hidden = !f.hidden; }
        else if (ck === "save") { /* handled by submit listener */ }
      }
    });
    doc.addEventListener("change", function (e) {
      if (e.target && e.target.id === "pmLang") applyLang(e.target.value);
    });
    doc.addEventListener("submit", function (e) {
      var f = e.target;
      if (f && f.id === "pmHSearch") {
        e.preventDefault();
        var q = ($("#pmHQ") || {}).value || "";
        root.location.hash = "#/search" + (q ? "?q=" + encodeURIComponent(q) : "");
      }
      if (f && f.id === "pmCkForm") {
        e.preventDefault(); var m = {};
        CATS.forEach(function (c) { var i = f.elements[c]; m[c] = i ? i.checked : false; });
        consent.set(m); hideCookie(); announce(T("ck_saved"));
      }
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
    root.addEventListener("hashchange", function () {
      closeAll();
      var w = $("#pmNavWrap"), b = $("#pmMenuBtn");
      if (w) w.classList.remove("is-open");
      if (b) b.setAttribute("aria-expanded", "false");
      var lu = $("#pmLastUpdated"); if (lu) lu.textContent = lastUpdatedFor(root.location.hash);
      // WCAG 2.4.3 / GIGW: after a route change move focus to the content so
      // keyboard and screen-reader users start at the new page.
      var m = doc.getElementById("main-content");
      root.setTimeout(function () { if (m) { try { m.focus({ preventScroll: true }); } catch (_) {} } announce(doc.title); }, 60);
    });
    root.addEventListener("pm:langchange", function () { mount(); });
    voiceInit();
  }

  /* Voice search: browser speech recognition when available (feature-detected). */
  function voiceInit() {
    var SR = root.SpeechRecognition || root.webkitSpeechRecognition, btn = $("#pmVoice");
    if (!SR || !btn) return;
    btn.hidden = false;
    btn.onclick = function () {
      var r = new SR();
      r.lang = { en: "en-IN", hi: "hi-IN", mr: "mr-IN", te: "te-IN" }[lang()] || "en-IN";
      r.interimResults = false; r.maxAlternatives = 1;
      btn.setAttribute("aria-pressed", "true");
      r.onresult = function (ev) {
        var i = $("#pmHQ"); if (i) i.value = ev.results[0][0].transcript;
        var f = $("#pmHSearch"); if (f) f.dispatchEvent(new root.Event("submit", { cancelable: true, bubbles: true }));
      };
      r.onend = r.onerror = function () { btn.setAttribute("aria-pressed", "false"); };
      try { r.start(); } catch (_) { btn.setAttribute("aria-pressed", "false"); }
    };
  }

  function showCookie(force) {
    var c = $("#pmCookie"); if (!c) return;
    if (!force && consent.decided()) return;
    var v = readConsent() || {};
    CATS.forEach(function (k) { var i = c.querySelector('input[name="' + k + '"]'); if (i) i.checked = !!v[k]; });  // never pre-ticked unless the user chose it
    c.hidden = false;
  }
  function hideCookie() { var c = $("#pmCookie"); if (c) c.hidden = true; }

  function mount() {
    var hh = doc.getElementById("pmSiteHeaderHost"), fh = doc.getElementById("pmFooterHost"), ch = doc.getElementById("pmCookieHost");
    var bar = doc.getElementById("pmA11yBarHost"); if (bar) bar.innerHTML = "";
    if (hh) hh.innerHTML = renderHeader() + renderTicker();
    if (fh) fh.innerHTML = renderFooter();
    if (ch) { var was = !$("#pmCookie") || $("#pmCookie").hidden; ch.innerHTML = renderCookie(); if (!consent.decided()) showCookie(); else if (!was) showCookie(true); }
    var sel = $("#pmLang"); if (sel) sel.value = lang();
    if (root.PashuShell && root.PashuShell.applyPrefs) root.PashuShell.applyPrefs();
    voiceInit();
  }

  root.PMShell3 = {
    T: T, renderHeader: renderHeader, renderNav: renderNav, renderFooter: renderFooter, renderTicker: renderTicker,
    renderCookie: renderCookie, renderEngagement: renderEngagement, lastUpdatedFor: lastUpdatedFor, ddmmyyyy: ddmmyyyy,
    consent: consent, navModel: navModel, mount: mount, bind: bind, labels: L, logo: { src: LOGO_SRC, alt: LOGO_ALT }
  };
})(typeof window !== "undefined" ? window : globalThis);
