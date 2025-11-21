// YourPhotoAI — frontend script
// UI: style selection, skin effects, expression, greetings, packages, generation.
// Payments: Stripe Checkout via /api/create-checkout-session.
// Extra: back-button handling, multi-language UI (EN/DE/ES/RU), email sending when
// package is finished, simple localStorage persistence.

// =========================
// BASIC SETTINGS
// =========================

// Support email (shown on the site + reply-to in emails)
const SUPPORT_EMAIL = "yourphotoaivip@gmail.com";

// WORK MODE
//
// DEMO_MODE = true  → generation WITHOUT payment, but with email + consent,
//                      fixed DEMO_SESSION_LIMIT generations in one local session.
// DEMO_MODE = false → generation ONLY after payment (Stripe packages 10/20/30).
const DEMO_MODE = true;

// Demo-session size (when DEMO_MODE = true)
const DEMO_SESSION_LIMIT = 5;

// Package sizes (paid mode)
const PACK_SIZES = {
  pack10: 10,
  pack20: 20,
  pack30: 30
};

// Languages for UI (backend still uses only "en" or "ru")
const SUPPORTED_LANGS = ["en", "de", "es", "ru"];

// =========================
// STORAGE KEYS
// =========================

const STORAGE_KEYS = {
  HAS_ACTIVE_PACK: "yourphotoai_hasActivePack",
  USER_EMAIL: "yourphotoai_userEmail",
  USER_AGREED: "yourphotoai_userAgreed",
  CREDITS_TOTAL: "yourphotoai_creditsTotal",
  CREDITS_USED: "yourphotoai_creditsUsed",
  GENERATED_IMAGES: "yourphotoai_generatedImages",
  LANGUAGE: "yourphotoai_language",
  SELECTED_PACK: "yourphotoai_selectedPack"
};

// =========================
// UI TEXTS (EN = default)
// =========================

const UI_TEXT = {
  en: {
    subtitle: "Create your unique AI portrait",
    previewLabel: "PREVIEW",
    previewPlaceholder:
      "Add a photo and choose effects.\nAfter generation your portrait will appear here.",
    generateStatus: "Generating portrait…",

    btnStyle: "PORTRAIT STYLE",
    btnSkin: "SKIN EFFECT",
    btnMimic: "EXPRESSION",
    btnGreetings: "GREETINGS",
    btnGenerate: "GENERATE",
    btnAddPhoto: "ADD PHOTO",
    btnPay: "PACKAGES",

    sheetOptionsTitle: "Options",
    sheetCategoryTitle: "Categories",

    payTitle: "Choose a package",
    paySectionTitle: "Generation packages",
    payNext: "Continue",
    payPack10Title: "10 generations",
    payPack20Title: "20 generations",
    payPack30Title: "30 generations",

    agreementTitle: "Confirmation",
    agreementText:
      "Before payment, please confirm your age and consent.\n\n" +
      "Important: YourPhotoAI creates AI portraits based on your photo. " +
      "After the session ends, the final images will be sent to the email you specify.",
    agreementEmailTitle: "Your email",
    agreementCheckboxHtml:
      'I am 16+ and I agree with the <a href="#">Terms</a>, ' +
      '<a href="#">Privacy</a>, <a href="#">Refunds</a>.',
    agreementSubmitDemo: "Continue",
    agreementSubmitPaid: "Go to payment",
    agreementHint:
      "Payments are processed via Stripe. We do not see or store your card data.",

    download: "Download portrait",
    supportLabel: "Support:",

    alertAddPhoto: "Please add a photo first.",
    alertSelectPack: "Please select a package.",
    alertNoActivePack:
      "Please purchase a package first. After payment you can generate portraits.",
    alertDemoFinished:
      "Your free demo limit has been used. Please reload the page to start a new demo or purchase a package.",
    alertPaidFinished:
      "Your package is finished. Please purchase a new package to continue.",
    alertGenerationFailed:
      "Could not generate the portrait. Please try again.",
    alertPaymentCreateFailed:
      "Error while creating payment. Please try again.",
    alertStripeMissing:
      "Stripe.js not found. Please ensure <script src=\"https://js.stripe.com/v3/\"></script> is present in index.html.",
    alertEmailMissing: "Please enter your email.",
    alertAgreeMissing: "Please confirm age and consent.",

    paymentSuccess:
      "Payment completed! 🎉 You can now generate portraits with your package."
  },

  de: {
    subtitle: "Erstelle dein einzigartiges KI-Porträt",
    previewLabel: "VORSCHAU",
    previewPlaceholder:
      "Füge ein Foto hinzu und wähle Effekte.\nNach der Generierung erscheint dein Porträt hier.",
    generateStatus: "Porträt wird generiert…",

    btnStyle: "PORTRÄTSTIL",
    btnSkin: "HAUTEFFEKT",
    btnMimic: "MIMIK",
    btnGreetings: "GRUßKARTEN",
    btnGenerate: "GENERIEREN",
    btnAddPhoto: "FOTO HINZUFÜGEN",
    btnPay: "PAKETE",

    sheetOptionsTitle: "Optionen",
    sheetCategoryTitle: "Kategorien",

    payTitle: "Paket auswählen",
    paySectionTitle: "Generierungspakete",
    payNext: "Weiter",
    payPack10Title: "10 Generationen",
    payPack20Title: "20 Generationen",
    payPack30Title: "30 Generationen",

    agreementTitle: "Bestätigung",
    agreementText:
      "Bestätige vor der Zahlung bitte dein Alter und dein Einverständnis.\n\n" +
      "Wichtig: YourPhotoAI erstellt KI-Porträts auf Basis deines Fotos. " +
      "Nach dem Ende der Session werden die fertigen Bilder an deine E-Mail gesendet.",
    agreementEmailTitle: "Deine E-Mail",
    agreementCheckboxHtml:
      'Ich bin 16+ und stimme den <a href="#">AGB</a>, ' +
      '<a href="#">Datenschutz</a> und <a href="#">Rückerstattungen</a> zu.',
    agreementSubmitDemo: "Weiter",
    agreementSubmitPaid: "Zur Zahlung",
    agreementHint:
      "Die Zahlung wird über Stripe verarbeitet. Wir sehen oder speichern deine Kartendaten nicht.",

    download: "Porträt herunterladen",
    supportLabel: "Support:"
  },

  es: {
    subtitle: "Crea tu retrato único con IA",
    previewLabel: "VISTA PREVIA",
    previewPlaceholder:
      "Añade una foto y elige efectos.\nDespués de generar, tu retrato aparecerá aquí.",
    generateStatus: "Generando retrato…",

    btnStyle: "ESTILO DE RETRATO",
    btnSkin: "EFECTO DE PIEL",
    btnMimic: "EXPRESIÓN",
    btnGreetings: "FELICITACIONES",
    btnGenerate: "GENERAR",
    btnAddPhoto: "AÑADIR FOTO",
    btnPay: "PAQUETES",

    sheetOptionsTitle: "Opciones",
    sheetCategoryTitle: "Categorías",

    payTitle: "Elige un paquete",
    paySectionTitle: "Paquetes de generación",
    payNext: "Continuar",
    payPack10Title: "10 generaciones",
    payPack20Title: "20 generaciones",
    payPack30Title: "30 generaciones",

    agreementTitle: "Confirmación",
    agreementText:
      "Antes del pago, confirma tu edad y tu consentimiento.\n\n" +
      "Importante: YourPhotoAI crea retratos con IA basados en tu foto. " +
      "Al finalizar la sesión, las imágenes se enviarán al correo que indiques.",
    agreementEmailTitle: "Tu email",
    agreementCheckboxHtml:
      'Tengo 16+ años y acepto los <a href="#">Términos</a>, ' +
      '<a href="#">Privacidad</a> y <a href="#">Reembolsos</a>.',
    agreementSubmitDemo: "Continuar",
    agreementSubmitPaid: "Ir al pago",
    agreementHint:
      "Los pagos se procesan con Stripe. No vemos ni guardamos los datos de tu tarjeta.",

    download: "Descargar retrato",
    supportLabel: "Soporte:"
  },

  ru: {
    subtitle: "Создайте свой уникальный AI-портрет",
    previewLabel: "ПРЕДПРОСМОТР",
    previewPlaceholder:
      "Добавьте фото и выберите эффекты.\nПосле генерации сюда попадёт ваш портрет.",
    generateStatus: "Генерация портрета…",

    btnStyle: "СТИЛЬ ПОРТРЕТА",
    btnSkin: "ЭФФЕКТ КОЖИ",
    btnMimic: "МИМИКА",
    btnGreetings: "ПОЗДРАВЛЕНИЯ",
    btnGenerate: "ГЕНЕРИРОВАТЬ",
    btnAddPhoto: "ДОБАВИТЬ ФОТО",
    btnPay: "ПАКЕТЫ",

    sheetOptionsTitle: "Варианты",
    sheetCategoryTitle: "Категории",

    payTitle: "Выберите пакет",
    paySectionTitle: "Пакеты генераций",
    payNext: "Далее",
    payPack10Title: "10 генераций",
    payPack20Title: "20 генераций",
    payPack30Title: "30 генераций",

    agreementTitle: "Подтверждение",
    agreementText:
      "Перед оплатой подтвердите возраст и согласие с условиями.\n\n" +
      "Важно: YourPhotoAI создаёт AI-портреты по вашему фото. " +
      "После завершения сессии готовые изображения будут отправлены на указанный email.",
    agreementEmailTitle: "Ваш email",
    agreementCheckboxHtml:
      'Мне 16+ и я согласен с <a href="#">Terms</a>, ' +
      '<a href="#">Privacy</a>, <a href="#">Refunds</a>.',
    agreementSubmitDemo: "Продолжить",
    agreementSubmitPaid: "Перейти к оплате",
    agreementHint:
      "Оплата обрабатывается через Stripe. Мы не видим и не храним данные вашей карты.",

    download: "Скачать портрет",
    supportLabel: "Поддержка:"
  }
};

// Greeting labels per language (for list in sheet)
// Text ON THE CARD itself is always in English (GREETING_TEXT below).
const GREETING_LABELS = {
  en: {
    "new-year": "New Year 🎄",
    birthday: "Birthday 🎂",
    funny: "Funny 😜",
    scary: "Scary 👻"
  },
  de: {
    "new-year": "Neujahr 🎄",
    birthday: "Geburtstag 🎂",
    funny: "Witzig 😜",
    scary: "Gruselig 👻"
  },
  es: {
    "new-year": "Año Nuevo 🎄",
    birthday: "Cumpleaños 🎂",
    funny: "Divertido 😜",
    scary: "Terrorífico 👻"
  },
  ru: {
    "new-year": "Новый год 🎄",
    birthday: "День рождения 🎂",
    funny: "Смешное 😜",
    scary: "Страшное 👻"
  }
};

// English text that we show ON TOP OF THE PORTRAIT as greeting
const GREETING_TEXT = {
  "new-year": "Happy New Year!",
  birthday: "Happy Birthday!",
  funny: "You are AI-level awesome!",
  scary: "Your AI twin is watching you..."
};

// Labels for style and effects (for chips, always in English)
const STYLE_LABELS_EN = {
  beauty: "Beauty",
  oil: "Oil painting",
  anime: "Anime",
  poster: "Poster",
  classic: "Classic portrait"
};

const EFFECT_CHIP_LABELS_EN = {
  "no-wrinkles": "Effect: no wrinkles",
  younger: "Effect: younger",
  "smooth-skin": "Effect: smooth skin",
  "glow-golden": "Effect: golden glow",
  "cinematic-light": "Effect: cinematic light",
  "smile-soft": "Expression: soft smile",
  "smile-big": "Expression: big smile",
  "smile-hollywood": "Expression: Hollywood smile",
  laugh: "Expression: laugh",
  "surprised-wow": "Expression: wow-surprised",
  neutral: "Expression: neutral",
  serious: "Expression: serious look",
  "eyes-bigger": "Expression: bigger eyes",
  "eyes-brighter": "Expression: brighter eyes"
};

// Texts for sheets (titles/descriptions) per language
const SHEET_TEXT = {
  en: {
    styleTitle: "Portrait style",
    styleDescription: "Choose the main artistic style.",
    skinTitle: "Skin effect",
    skinDescription: "Choose an effect that gives a wow feeling.",
    mimicTitle: "Expression",
    mimicDescription: "Choose the facial expression.",
    greetingTitle: "Greetings",
    greetingDescription: "We will gently add festive atmosphere to the portrait."
  },
  de: {
    styleTitle: "Porträtstil",
    styleDescription: "Wähle den künstlerischen Stil.",
    skinTitle: "Hauteffekt",
    skinDescription: "Wähle einen Effekt mit Wow-Effekt.",
    mimicTitle: "Mimik",
    mimicDescription: "Wähle den Gesichtsausdruck.",
    greetingTitle: "Grußkarten",
    greetingDescription:
      "Wir fügen dem Porträt vorsichtig eine festliche Atmosphäre hinzu."
  },
  es: {
    styleTitle: "Estilo de retrato",
    styleDescription: "Elige el estilo artístico principal.",
    skinTitle: "Efecto de piel",
    skinDescription: "Elige un efecto con efecto wow.",
    mimicTitle: "Expresión",
    mimicDescription: "Elige la expresión facial.",
    greetingTitle: "Felicitaciones",
    greetingDescription:
      "Añadiremos suavemente un ambiente festivo al retrato."
  },
  ru: {
    styleTitle: "Стиль портрета",
    styleDescription: "Выберите основной художественный стиль.",
    skinTitle: "Эффект кожи",
    skinDescription: "Выберите эффект, который даст вау-ощущение.",
    mimicTitle: "Мимика",
    mimicDescription: "Выберите выражение лица.",
    greetingTitle: "Поздравления",
    greetingDescription:
      "Мы аккуратно добавим праздничный антураж к портрету."
  }
};

// =========================
// GLOBAL APP STATE
// =========================

const appState = {
  // generation
  selectedStyle: null,
  selectedEffects: [],
  selectedGreeting: null,

  // UI language (en/de/es/ru) – default EN
  language: "en",

  // photo
  originalFile: null,
  photoBase64: null,

  // Stripe package (paid mode)
  selectedPack: null, // 'pack10' | 'pack20' | 'pack30'

  // status
  isGenerating: false,
  isPaying: false,

  // payment (paid mode)
  hasActivePack: false,

  // credits (both demo and paid)
  creditsTotal: 0,
  creditsUsed: 0,
  generatedImages: [],

  // consent + email
  userEmail: "",
  userAgreed: false,

  // UI layer for back button
  layer: "home" // 'home' | 'sheet' | 'pay' | 'agree' | 'result'
};

// =========================
// DOM ELEMENTS
// =========================

const els = {};

function bindElements() {
  // main layout
  els.appTitle = document.querySelector(".app-title");
  els.appSubtitle = document.querySelector(".app-subtitle");

  els.previewLabel = document.querySelector(".preview-label");
  els.previewImage = document.getElementById("previewImage");
  els.previewPlaceholder = document.getElementById("previewPlaceholder");
  els.greetingOverlay = document.getElementById("greetingOverlay");
  els.generateStatus = document.getElementById("generateStatus");
  els.generateStatusText = document.querySelector(".generate-status-text");
  els.selectionRow = document.getElementById("selectionRow");

  // buttons
  els.btnStyle = document.getElementById("btnStyle");
  els.btnSkin = document.getElementById("btnSkin");
  els.btnMimic = document.getElementById("btnMimic");
  els.btnGreetings = document.getElementById("btnGreetings");
  els.btnGenerate = document.getElementById("btnGenerate");
  els.btnAddPhoto = document.getElementById("btnAddPhoto");
  els.btnPay = document.getElementById("btnPay");

  // language buttons (may be missing for some languages, that's okay)
  els.btnLangEn = document.getElementById("langEn");
  els.btnLangDe = document.getElementById("langDe");
  els.btnLangEs = document.getElementById("langEs");
  els.btnLangRu = document.getElementById("langRu");

  // support email
  els.supportEmail = document.getElementById("supportEmail");

  // file input
  els.fileInput = document.getElementById("fileInput");

  // sheet
  els.sheetBackdrop = document.getElementById("sheetBackdrop");
  els.sheetTitle = document.getElementById("sheetTitle");
  els.sheetDescription = document.getElementById("sheetDescription");
  els.sheetCategoryTitle = document.getElementById("sheetCategoryTitle");
  els.sheetCategoryRow = document.getElementById("sheetCategoryRow");
  els.sheetOptionsTitle = document.getElementById("sheetOptionsTitle");
  els.sheetOptionsRow = document.getElementById("sheetOptionsRow");
  els.sheetCloseBtn = document.getElementById("sheetCloseBtn");

  // payment modal
  els.payBackdrop = document.getElementById("payBackdrop");
  els.payCloseBtn = document.getElementById("payCloseBtn");
  els.pkg10 = document.getElementById("pkg10");
  els.pkg20 = document.getElementById("pkg20");
  els.pkg30 = document.getElementById("pkg30");
  els.payError = document.getElementById("payError");
  els.payNextBtn = document.getElementById("payNextBtn");
  els.payTitle = document.querySelector(".pay-title");
  els.paySectionTitle = document.querySelector(".pay-section-title");

  // agreement modal
  els.agreementBackdrop = document.getElementById("agreementBackdrop");
  els.agreementCloseBtn = document.getElementById("agreementCloseBtn");
  els.agreeEmail = document.getElementById("agreeEmail");
  els.agreeCheckbox = document.getElementById("agreeCheckbox");
  els.agreeError = document.getElementById("agreeError");
  els.agreePayBtn = document.getElementById("agreePayBtn");
  els.agreementTitle = document.querySelector(".agreement-title");
  els.agreementText = document.querySelector(".agreement-text");
  els.agreementEmailTitle = document.querySelector(
    ".agreement-section-title"
  );
  els.agreementCheckboxLabel = document.querySelector(
    ".agreement-checkbox-row span"
  );
  els.agreementHint = document.querySelector(".agreement-hint");

  // download
  els.downloadLink = document.getElementById("downloadLink");
}

// =========================
// INIT
// =========================

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  setupSupportEmail();

  // read state from localStorage
  try {
    // language
    const storedLang = window.localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (storedLang && SUPPORTED_LANGS.includes(storedLang)) {
      appState.language = storedLang;
    }

    const storedPaid = window.localStorage.getItem(
      STORAGE_KEYS.HAS_ACTIVE_PACK
    );
    if (storedPaid === "1") {
      appState.hasActivePack = true;
    }

    const storedEmail = window.localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    if (storedEmail) {
      appState.userEmail = storedEmail;
    }

    const storedAgreed = window.localStorage.getItem(
      STORAGE_KEYS.USER_AGREED
    );
    if (storedAgreed === "1") {
      appState.userAgreed = true;
    }

    const storedTotal = parseInt(
      window.localStorage.getItem(STORAGE_KEYS.CREDITS_TOTAL) || "0",
      10
    );
    const storedUsed = parseInt(
      window.localStorage.getItem(STORAGE_KEYS.CREDITS_USED) || "0",
      10
    );
    if (!Number.isNaN(storedTotal)) appState.creditsTotal = storedTotal;
    if (!Number.isNaN(storedUsed)) appState.creditsUsed = storedUsed;

    const storedImages = window.localStorage.getItem(
      STORAGE_KEYS.GENERATED_IMAGES
    );
    if (storedImages) {
      try {
        const arr = JSON.parse(storedImages);
        if (Array.isArray(arr)) {
          appState.generatedImages = arr;
        }
      } catch (e) {
        console.warn("Cannot parse GENERATED_IMAGES", e);
      }
    }

    const storedPack = window.localStorage.getItem(
      STORAGE_KEYS.SELECTED_PACK
    );
    if (storedPack && PACK_SIZES[storedPack]) {
      appState.selectedPack = storedPack;
    }
  } catch (e) {
    console.warn("Cannot read localStorage", e);
  }

  attachMainHandlers();
  setupBackButtonLogic();
  refreshSelectionChips();
  hideOverlaysOnStart();
  handleStripeStatusFromUrl();
  setLanguage(appState.language, false);
});

function hideOverlaysOnStart() {
  if (els.sheetBackdrop) els.sheetBackdrop.style.display = "none";
  if (els.payBackdrop) els.payBackdrop.style.display = "none";
  if (els.agreementBackdrop) els.agreementBackdrop.style.display = "none";
  if (els.greetingOverlay) els.greetingOverlay.style.display = "none";
}

function setupSupportEmail() {
  if (!els.supportEmail) return;
  els.supportEmail.href = `mailto:${SUPPORT_EMAIL}`;
  els.supportEmail.textContent = SUPPORT_EMAIL;
}

// =========================
// LANGUAGE SWITCHING
// =========================

function setLanguage(lang, saveToStorage = true) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    lang = "en";
  }
  appState.language = lang;

  if (saveToStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch (e) {
      console.warn("Cannot store language", e);
    }
  }

  const t = UI_TEXT[lang] || UI_TEXT.en;

  // buttons highlight
  const mapping = {
    en: els.btnLangEn,
    de: els.btnLangDe,
    es: els.btnLangEs,
    ru: els.btnLangRu
  };
  const allButtons = [
    els.btnLangEn,
    els.btnLangDe,
    els.btnLangEs,
    els.btnLangRu
  ];
  allButtons.forEach((b) => {
    if (!b) return;
    b.classList.remove("lang-selected");
  });
  if (mapping[lang]) {
    mapping[lang].classList.add("lang-selected");
  }

  // header
  if (els.appSubtitle) {
    els.appSubtitle.textContent = t.subtitle;
  }

  // preview label & placeholder
  if (els.previewLabel) {
    els.previewLabel.textContent = t.previewLabel;
  }
  if (els.previewPlaceholder) {
    els.previewPlaceholder.innerHTML = t.previewPlaceholder
      .split("\n")
      .join("<br>");
  }

  // generating status
  if (els.generateStatusText) {
    els.generateStatusText.textContent = t.generateStatus;
  }

  // main buttons (second span)
  function setButtonLabel(btn, text) {
    if (!btn) return;
    const spans = btn.querySelectorAll("span");
    if (spans.length >= 2) {
      spans[1].textContent = text;
    }
  }
  setButtonLabel(els.btnStyle, t.btnStyle);
  setButtonLabel(els.btnSkin, t.btnSkin);
  setButtonLabel(els.btnMimic, t.btnMimic);
  setButtonLabel(els.btnGreetings, t.btnGreetings);
  setButtonLabel(els.btnGenerate, t.btnGenerate);
  setButtonLabel(els.btnAddPhoto, t.btnAddPhoto);
  setButtonLabel(els.btnPay, t.btnPay);

  // sheet titles
  if (els.sheetOptionsTitle) {
    els.sheetOptionsTitle.textContent = t.sheetOptionsTitle;
  }
  if (els.sheetCategoryTitle) {
    els.sheetCategoryTitle.textContent = t.sheetCategoryTitle;
  }

  // payment modal
  if (els.payTitle) els.payTitle.textContent = t.payTitle;
  if (els.paySectionTitle) els.paySectionTitle.textContent = t.paySectionTitle;
  if (els.pkg10) {
    const titleEl = els.pkg10.querySelector(".pay-package-title");
    if (titleEl) titleEl.textContent = t.payPack10Title;
  }
  if (els.pkg20) {
    const titleEl = els.pkg20.querySelector(".pay-package-title");
    if (titleEl) titleEl.textContent = t.payPack20Title;
  }
  if (els.pkg30) {
    const titleEl = els.pkg30.querySelector(".pay-package-title");
    if (titleEl) titleEl.textContent = t.payPack30Title;
  }
  if (els.payNextBtn) els.payNextBtn.textContent = t.payNext;

  // agreement modal
  if (els.agreementTitle) els.agreementTitle.textContent = t.agreementTitle;
  if (els.agreementText) {
    els.agreementText.innerHTML = t.agreementText
      .split("\n")
      .join("<br><br>");
  }
  if (els.agreementEmailTitle) {
    els.agreementEmailTitle.textContent = t.agreementEmailTitle;
  }
  if (els.agreementCheckboxLabel) {
    els.agreementCheckboxLabel.innerHTML = t.agreementCheckboxHtml;
  }
  if (els.agreementHint) {
    els.agreementHint.textContent = t.agreementHint;
  }
  if (els.agreePayBtn) {
    els.agreePayBtn.textContent = DEMO_MODE
      ? t.agreementSubmitDemo
      : t.agreementSubmitPaid;
  }

  // download link
  if (els.downloadLink) {
    els.downloadLink.textContent = t.download;
  }

  // support label (rebuild block to keep link)
  const supportBlock = els.supportEmail && els.supportEmail.parentElement;
  if (supportBlock) {
    supportBlock.innerHTML = `${t.supportLabel} <a id="supportEmail"></a>`;
    els.supportEmail = document.getElementById("supportEmail");
    setupSupportEmail();
  }

  // if sheet is open, we may want updated titles (style/skin/etc.)
  // but they will refresh on next open; этого достаточно.
}

// =========================
// BACK BUTTON LOGIC
// =========================

function setLayer(newLayer, pushToHistory = true) {
  appState.layer = newLayer;
  if (pushToHistory && window.history && window.history.pushState) {
    window.history.pushState({ layer: newLayer }, "", window.location.href);
  }
}

function setupBackButtonLogic() {
  if (window.history && window.history.replaceState) {
    window.history.replaceState({ layer: "home" }, "", window.location.href);
  }

  window.addEventListener("popstate", () => {
    switch (appState.layer) {
      case "sheet":
        closeSheet(false);
        break;
      case "pay":
        closePayModal(false);
        break;
      case "agree":
        closeAgreementModal(false);
        break;
      case "result":
        exitResultView(false);
        break;
      default:
        return;
    }
    appState.layer = "home";
  });
}

// =========================
// MAIN BUTTON HANDLERS
// =========================

function attachMainHandlers() {
  // style/skin/mimic/greetings
  if (els.btnStyle) {
    els.btnStyle.addEventListener("click", () => openStyleSheet());
  }
  if (els.btnSkin) {
    els.btnSkin.addEventListener("click", () => openSkinSheet());
  }
  if (els.btnMimic) {
    els.btnMimic.addEventListener("click", () => openMimicSheet());
  }
  if (els.btnGreetings) {
    els.btnGreetings.addEventListener("click", () => openGreetingSheet());
  }

  // generate
  if (els.btnGenerate) {
    els.btnGenerate.addEventListener("click", () => handleGenerateClick());
  }

  // add photo
  if (els.btnAddPhoto) {
    els.btnAddPhoto.addEventListener("click", () => {
      if (els.fileInput) els.fileInput.click();
    });
  }
  if (els.fileInput) {
    els.fileInput.addEventListener("change", handleFileSelected);
  }

  // payment
  if (els.btnPay) {
    els.btnPay.addEventListener("click", () => openPayModal());
  }
  if (els.payCloseBtn) {
    els.payCloseBtn.addEventListener("click", () => closePayModal());
  }
  if (els.pkg10) {
    els.pkg10.addEventListener("click", () => selectPack("pack10"));
  }
  if (els.pkg20) {
    els.pkg20.addEventListener("click", () => selectPack("pack20"));
  }
  if (els.pkg30) {
    els.pkg30.addEventListener("click", () => selectPack("pack30"));
  }
  if (els.payNextBtn) {
    els.payNextBtn.addEventListener("click", () => handlePayNext());
  }

  // agreement modal
  if (els.agreementCloseBtn) {
    els.agreementCloseBtn.addEventListener("click", () =>
      closeAgreementModal()
    );
  }
  if (els.agreePayBtn) {
    els.agreePayBtn.addEventListener("click", () => handleAgreeConfirm());
  }

  // sheet close
  if (els.sheetCloseBtn) {
    els.sheetCloseBtn.addEventListener("click", () => closeSheet());
  }

  // download
  if (els.downloadLink) {
    els.downloadLink.addEventListener("click", (e) => {
      if (!els.previewImage || !els.previewImage.src) {
        e.preventDefault();
      }
    });
  }

  // language buttons
  if (els.btnLangEn) {
    els.btnLangEn.addEventListener("click", () => setLanguage("en"));
  }
  if (els.btnLangDe) {
    els.btnLangDe.addEventListener("click", () => setLanguage("de"));
  }
  if (els.btnLangEs) {
    els.btnLangEs.addEventListener("click", () => setLanguage("es"));
  }
  if (els.btnLangRu) {
    els.btnLangRu.addEventListener("click", () => setLanguage("ru"));
  }
}

// =========================
// FILE HANDLING
// =========================

function handleFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  appState.originalFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const resizedDataUrl = resizeImageToMax(img, 1024);
      appState.photoBase64 = resizedDataUrl;

      if (els.previewImage) {
        els.previewImage.src = resizedDataUrl;
        els.previewImage.style.display = "block";
      }
      if (els.previewPlaceholder) {
        els.previewPlaceholder.style.display = "none";
      }
      if (els.downloadLink) {
        els.downloadLink.style.display = "none";
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function resizeImageToMax(img, maxSize) {
  const canvas = document.createElement("canvas");
  let { width, height } = img;

  if (width > height && width > maxSize) {
    height = Math.round((height * maxSize) / width);
    width = maxSize;
  } else if (height >= width && height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

// =========================
// BOTTOM SHEET (OPTIONS)
// =========================

function openSheet({ title, description, categories, options }) {
  if (!els.sheetBackdrop) return;

  els.sheetTitle.textContent = title || "";
  els.sheetDescription.textContent = description || "";

  if (categories && categories.length > 0) {
    els.sheetCategoryTitle.style.display = "block";
    els.sheetCategoryRow.style.display = "flex";
    els.sheetCategoryRow.innerHTML = "";

    categories.forEach((cat) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = cat.label;
      chip.dataset.value = cat.value;
      chip.addEventListener("click", () => {
        if (typeof cat.onClick === "function") cat.onClick(cat.value);
      });
      els.sheetCategoryRow.appendChild(chip);
    });
  } else {
    els.sheetCategoryTitle.style.display = "none";
    els.sheetCategoryRow.style.display = "none";
    els.sheetCategoryRow.innerHTML = "";
  }

  els.sheetOptionsRow.innerHTML = "";
  (options || []).forEach((opt) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = opt.label;
    chip.dataset.value = opt.value;

    if (opt.selected) {
      chip.classList.add("chip-selected");
    }

    chip.addEventListener("click", () => {
      if (typeof opt.onClick === "function") {
        opt.onClick(opt.value);
      }
    });

    els.sheetOptionsRow.appendChild(chip);
  });

  els.sheetBackdrop.style.display = "flex";
  setLayer("sheet", true);
}

function closeSheet(pushHistory = true) {
  if (!els.sheetBackdrop) return;
  els.sheetBackdrop.style.display = "none";
  if (pushHistory) setLayer("home", true);
}

// =========================
// SHEETS: STYLE, SKIN, MIMIC, GREETINGS
// =========================

function openStyleSheet() {
  const lang = appState.language;
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;

  const optionsConfig = [
    "beauty",
    "oil",
    "anime",
    "poster",
    "classic"
  ];

  const options = optionsConfig.map((value) => ({
    value,
    label: STYLE_LABELS_EN[value] || value,
    selected: appState.selectedStyle === value,
    onClick: (val) => {
      appState.selectedStyle = val;
      refreshSelectionChips();
      closeSheet();
    }
  }));

  openSheet({
    title: sheet.styleTitle,
    description: sheet.styleDescription,
    options
  });
}

function openSkinSheet() {
  const lang = appState.language;
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;

  const optionsConfig = [
    { value: "no-wrinkles", label: "No wrinkles" },
    { value: "younger", label: "Younger by 10–20 years" },
    { value: "smooth-skin", label: "Smooth skin" },
    { value: "glow-golden", label: "Golden glow ✨" },
    { value: "cinematic-light", label: "Cinematic light 🎬" }
  ];

  openSheet({
    title: sheet.skinTitle,
    description: sheet.skinDescription,
    options: optionsConfig.map((opt) => ({
      ...opt,
      selected: appState.selectedEffects.includes(opt.value),
      onClick: (value) => {
        removeSkinEffects();
        toggleEffect(value);
        refreshSelectionChips();
        closeSheet();
      }
    }))
  });
}

function openMimicSheet() {
  const lang = appState.language;
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;

  const optionsConfig = [
    { value: "smile-soft", label: "Soft smile 🙂" },
    { value: "smile-big", label: "Big smile 😄" },
    { value: "smile-hollywood", label: "Hollywood smile 😁" },
    { value: "laugh", label: "Laugh 😂" },
    { value: "surprised-wow", label: "Wow surprise 😲" },
    { value: "eyes-bigger", label: "Slightly bigger eyes 👁" },
    { value: "eyes-brighter", label: "Brighter eyes ✨" },
    { value: "neutral", label: "Neutral face" },
    { value: "serious", label: "Serious look" }
  ];

  openSheet({
    title: sheet.mimicTitle,
    description: sheet.mimicDescription,
    options: optionsConfig.map((opt) => ({
      ...opt,
      selected: appState.selectedEffects.includes(opt.value),
      onClick: (value) => {
        removeAllMimicEffects();
        toggleEffect(value);
        refreshSelectionChips();
        closeSheet();
      }
    }))
  });
}

function openGreetingSheet() {
  const lang = appState.language;
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;
  const labels = GREETING_LABELS[lang] || GREETING_LABELS.en;

  const optionsConfig = ["new-year", "birthday", "funny", "scary"];

  const options = optionsConfig.map((value) => ({
    value,
    label: labels[value],
    selected: appState.selectedGreeting === value,
    onClick: (val) => {
      appState.selectedGreeting =
        appState.selectedGreeting === val ? null : val;
      refreshSelectionChips();
      updateGreetingOverlay();
      closeSheet();
    }
  }));

  openSheet({
    title: sheet.greetingTitle,
    description: sheet.greetingDescription,
    options
  });
}

// =========================
// EFFECTS HELPERS
// =========================

function toggleEffect(value) {
  const idx = appState.selectedEffects.indexOf(value);
  if (idx >= 0) {
    appState.selectedEffects.splice(idx, 1);
  } else {
    appState.selectedEffects.push(value);
  }
}

function removeSkinEffects() {
  const skinKeys = [
    "no-wrinkles",
    "younger",
    "smooth-skin",
    "glow-golden",
    "cinematic-light"
  ];
  appState.selectedEffects = appState.selectedEffects.filter(
    (e) => !skinKeys.includes(e)
  );
}

function removeAllMimicEffects() {
  const mimicKeys = [
    "smile-soft",
    "smile-big",
    "smile-hollywood",
    "laugh",
    "surprised-wow",
    "neutral",
    "serious",
    "eyes-bigger",
    "eyes-brighter"
  ];
  appState.selectedEffects = appState.selectedEffects.filter(
    (e) => !mimicKeys.includes(e)
  );
}

// =========================
// GREETING OVERLAY
// =========================

function updateGreetingOverlay() {
  if (!els.greetingOverlay) return;

  const key = appState.selectedGreeting;
  if (!key) {
    els.greetingOverlay.textContent = "";
    els.greetingOverlay.style.display = "none";
    return;
  }

  const text = GREETING_TEXT[key] || "";
  els.greetingOverlay.textContent = text;
  els.greetingOverlay.style.display = "block";
}

// =========================
// PACKAGES & STRIPE (PAID MODE)
// =========================

function openPayModal() {
  if (DEMO_MODE) {
    // In demo mode we don't really need packages – redirect to agreement for email.
    openAgreementModal();
    return;
  }

  if (!els.payBackdrop) return;
  els.payBackdrop.style.display = "flex";
  if (els.payError) els.payError.textContent = "";
  setLayer("pay", true);
}

function closePayModal(pushHistory = true) {
  if (!els.payBackdrop) return;
  els.payBackdrop.style.display = "none";
  if (pushHistory) setLayer("home", true);
}

function selectPack(packKey) {
  appState.selectedPack = packKey;
  try {
    window.localStorage.setItem(STORAGE_KEYS.SELECTED_PACK, packKey);
  } catch (e) {
    console.warn("Cannot store selected pack", e);
  }

  if (els.payError) els.payError.textContent = "";

  const all = [els.pkg10, els.pkg20, els.pkg30];
  all.forEach((btn) => {
    if (!btn) return;
    if (btn.dataset.package === packKey) {
      btn.classList.add("pay-package--selected");
    } else {
      btn.classList.remove("pay-package--selected");
    }
  });

  refreshSelectionChips();
}

function handlePayNext() {
  if (DEMO_MODE) {
    openAgreementModal();
    return;
  }

  if (!appState.selectedPack) {
    const t = UI_TEXT[appState.language] || UI_TEXT.en;
    if (els.payError) {
      els.payError.textContent = t.alertSelectPack || "Please select a package.";
    } else {
      alert(t.alertSelectPack || "Please select a package.");
    }
    return;
  }
  closePayModal(false);
  openAgreementModal();
}

function openAgreementModal() {
  if (!els.agreementBackdrop) return;

  if (els.agreeError) els.agreeError.textContent = "";

  // pre-fill email if we already saved it
  if (els.agreeEmail && appState.userEmail) {
    els.agreeEmail.value = appState.userEmail;
  }

  if (els.agreeCheckbox) {
    els.agreeCheckbox.checked = appState.userAgreed || false;
  }

  els.agreementBackdrop.style.display = "flex";
  setLayer("agree", true);
}

function closeAgreementModal(pushHistory = true) {
  if (!els.agreementBackdrop) return;
  els.agreementBackdrop.style.display = "none";
  if (pushHistory) setLayer("home", true);
}

// =========================
// CONSENT BEFORE GENERATION / PAYMENT
// =========================

function handleAgreeConfirm() {
  const t = UI_TEXT[appState.language] || UI_TEXT.en;

  const email = (els.agreeEmail && els.agreeEmail.value.trim()) || "";
  const checked = els.agreeCheckbox && els.agreeCheckbox.checked;

  if (!email) {
    if (els.agreeError) els.agreeError.textContent = t.alertEmailMissing;
    return;
  }
  if (!checked) {
    if (els.agreeError) els.agreeError.textContent = t.alertAgreeMissing;
    return;
  }

  const confirmText =
    "By continuing, you agree that:\n\n" +
    "• your photo and generated portraits will be sent to an external AI service for processing;\n" +
    "• processing is automatic, without manual moderation;\n" +
    "• you have the rights to the uploaded images and allow this processing.\n\n" +
    'Press "OK", if you agree.';
  const ok = window.confirm(confirmText);
  if (!ok) {
    return;
  }

  if (els.agreeError) els.agreeError.textContent = "";

  // save email & consent
  appState.userEmail = email;
  appState.userAgreed = true;

  try {
    window.localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
    window.localStorage.setItem(STORAGE_KEYS.USER_AGREED, "1");
  } catch (e) {
    console.warn("Cannot store email/agreement", e);
  }

  if (DEMO_MODE) {
    closeAgreementModal(false);

    // init demo package if not set
    if (appState.creditsTotal <= 0) {
      appState.creditsTotal = DEMO_SESSION_LIMIT;
      appState.creditsUsed = 0;
      try {
        window.localStorage.setItem(
          STORAGE_KEYS.CREDITS_TOTAL,
          String(appState.creditsTotal)
        );
        window.localStorage.setItem(
          STORAGE_KEYS.CREDITS_USED,
          String(appState.creditsUsed)
        );
      } catch (e) {
        console.warn("Cannot store demo credits", e);
      }
    }

    refreshSelectionChips();
  } else {
    startStripeCheckout(email);
  }
}

async function startStripeCheckout(email) {
  const t = UI_TEXT[appState.language] || UI_TEXT.en;

  if (!appState.selectedPack) {
    alert(t.alertSelectPack || "Please select a package.");
    return;
  }

  if (appState.isPaying) return;
  appState.isPaying = true;

  try {
    const resp = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pack: appState.selectedPack,
        email
      })
    });

    if (!resp.ok) {
      throw new Error("Server returned error.");
    }

    const data = await resp.json();
    if (!data || !data.sessionId || !data.publishableKey) {
      throw new Error("Invalid response from payment server.");
    }

    closeAgreementModal(false);

    const stripe = window.Stripe
      ? window.Stripe(data.publishableKey)
      : null;

    if (!stripe) {
      alert(t.alertStripeMissing || UI_TEXT.en.alertStripeMissing);
      return;
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId: data.sessionId
    });

    if (error) {
      console.error("Stripe redirect error:", error);
      alert(
        "Could not open payment page: " + (error.message || String(error))
      );
    }
  } catch (err) {
    console.error("PAY ERROR:", err);
    alert(t.alertPaymentCreateFailed || UI_TEXT.en.alertPaymentCreateFailed);
  } finally {
    appState.isPaying = false;
  }
}

function handleStripeStatusFromUrl() {
  try {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
    if (!status) return;

    if (status === "success") {
      appState.hasActivePack = true;
      try {
        window.localStorage.setItem(STORAGE_KEYS.HAS_ACTIVE_PACK, "1");
      } catch (e) {
        console.warn("Cannot write localStorage", e);
      }

      // set credits according to selected pack
      const storedPack = window.localStorage.getItem(
        STORAGE_KEYS.SELECTED_PACK
      );
      const packKey = storedPack || appState.selectedPack;
      const size = PACK_SIZES[packKey] || 0;
      if (size > 0) {
        appState.creditsTotal = size;
        appState.creditsUsed = 0;
        try {
          window.localStorage.setItem(
            STORAGE_KEYS.CREDITS_TOTAL,
            String(size)
          );
          window.localStorage.setItem(STORAGE_KEYS.CREDITS_USED, "0");
        } catch (e) {
          console.warn("Cannot store credits after payment", e);
        }
      }

      const t = UI_TEXT[appState.language] || UI_TEXT.en;
      alert(t.paymentSuccess || UI_TEXT.en.paymentSuccess);
    } else if (status === "cancel") {
      console.log("Stripe checkout cancelled");
    }

    // clean URL
    url.searchParams.delete("status");
    url.searchParams.delete("session_id");
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "", url.toString());
    }

    refreshSelectionChips();
  } catch (e) {
    console.warn("Cannot parse URL for Stripe status", e);
  }
}

// =========================
// SELECTION CHIPS
// =========================

function refreshSelectionChips() {
  if (!els.selectionRow) return;

  els.selectionRow.innerHTML = "";

  function addChip(label) {
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = label;
    els.selectionRow.appendChild(chip);
  }

  if (appState.selectedStyle) {
    const name =
      STYLE_LABELS_EN[appState.selectedStyle] || appState.selectedStyle;
    addChip(`Style: ${name}`);
  }

  appState.selectedEffects.forEach((e) => {
    const label = EFFECT_CHIP_LABELS_EN[e] || e;
    addChip(label);
  });

  if (appState.selectedGreeting) {
    const labels = GREETING_LABELS[appState.language] || GREETING_LABELS.en;
    const name = labels[appState.selectedGreeting] || "Greeting selected";
    addChip(`Greeting: ${name}`);
  }

  if (appState.selectedPack) {
    const map = {
      pack10: "Package: 10 generations",
      pack20: "Package: 20 generations",
      pack30: "Package: 30 generations"
    };
    addChip(map[appState.selectedPack] || "Package selected");
  }

  if (appState.creditsTotal > 0) {
    addChip(`Used ${appState.creditsUsed} of ${appState.creditsTotal}`);
  }

  if (DEMO_MODE) {
    addChip("Demo: 5 generations with email");
  } else if (appState.hasActivePack) {
    addChip("Paid: package active");
  } else {
    addChip("No paid package yet");
  }
}

// =========================
// PORTRAIT GENERATION
// =========================

async function handleGenerateClick() {
  const t = UI_TEXT[appState.language] || UI_TEXT.en;

  if (appState.isGenerating) return;

  if (!appState.photoBase64) {
    alert(t.alertAddPhoto || UI_TEXT.en.alertAddPhoto);
    return;
  }

  if (DEMO_MODE) {
    if (!appState.userEmail || !appState.userAgreed) {
      openAgreementModal();
      return;
    }
    if (appState.creditsTotal > 0 && appState.creditsUsed >= appState.creditsTotal) {
      alert(t.alertDemoFinished || UI_TEXT.en.alertDemoFinished);
      return;
    }
  } else {
    if (!appState.hasActivePack) {
      alert(t.alertNoActivePack || UI_TEXT.en.alertNoActivePack);
      openPayModal();
      return;
    }
    if (appState.creditsTotal > 0 && appState.creditsUsed >= appState.creditsTotal) {
      alert(t.alertPaidFinished || UI_TEXT.en.alertPaidFinished);
      return;
    }
  }

  appState.isGenerating = true;
  showGenerating(true);

  try {
    // Backend only supports "en" or "ru" for now
    const backendLanguage = appState.language === "ru" ? "ru" : "en";

    const payload = {
      style: appState.selectedStyle || "beauty",
      text: "",
      photo: appState.photoBase64,
      effects: appState.selectedEffects,
      greeting: appState.selectedGreeting || null,
      language: backendLanguage
    };

    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error("Generation server returned error.");
    }

    const data = await resp.json();
    if (!data || !data.image) {
      throw new Error("Server did not return image URL.");
    }

    showResultPortrait(data.image);
    registerGeneration(data.image);
    resetEffectsAfterGeneration();
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    alert(t.alertGenerationFailed || UI_TEXT.en.alertGenerationFailed);
  } finally {
    showGenerating(false);
    appState.isGenerating = false;
  }
}

function registerGeneration(imageUrl) {
  if (appState.creditsTotal <= 0) {
    if (DEMO_MODE) {
      appState.creditsTotal = DEMO_SESSION_LIMIT;
    } else if (appState.hasActivePack) {
      const size = PACK_SIZES[appState.selectedPack] || 0;
      if (size > 0) appState.creditsTotal = size;
    }
  }

  appState.creditsUsed += 1;

  if (!appState.generatedImages.includes(imageUrl)) {
    appState.generatedImages.push(imageUrl);
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEYS.CREDITS_TOTAL,
      String(appState.creditsTotal)
    );
    window.localStorage.setItem(
      STORAGE_KEYS.CREDITS_USED,
      String(appState.creditsUsed)
    );
    window.localStorage.setItem(
      STORAGE_KEYS.GENERATED_IMAGES,
      JSON.stringify(appState.generatedImages)
    );
  } catch (e) {
    console.warn("Cannot store credits/images", e);
  }

  refreshSelectionChips();

  if (appState.creditsTotal > 0 && appState.creditsUsed >= appState.creditsTotal) {
    finishSessionAndSendEmail();
  }
}

function resetEffectsAfterGeneration() {
  appState.selectedStyle = null;
  appState.selectedEffects = [];
  appState.selectedGreeting = null;
  updateGreetingOverlay();
  refreshSelectionChips();
}

function showGenerating(isOn) {
  if (!els.generateStatus) return;
  els.generateStatus.style.display = isOn ? "flex" : "none";
}

// =========================
// RESULT / DOWNLOAD
// =========================

function showResultPortrait(url) {
  if (els.previewImage) {
    els.previewImage.src = url;
    els.previewImage.style.display = "block";
  }
  if (els.previewPlaceholder) {
    els.previewPlaceholder.style.display = "none";
  }

  if (els.downloadLink) {
    els.downloadLink.href = url;
    els.downloadLink.style.display = "inline-flex";
  }

  document.body.classList.add("result-mode");
  setLayer("result", true);
}

function exitResultView(pushHistory = true) {
  document.body.classList.remove("result-mode");
  if (pushHistory) setLayer("home", true);
}

// =========================
// SESSION FINISH & EMAIL
// =========================

async function finishSessionAndSendEmail() {
  const email = appState.userEmail;

  if (!email) {
    alert("Email not found. Cannot send portraits.");
    return;
  }

  if (!appState.generatedImages || appState.generatedImages.length === 0) {
    alert("No generated portraits to send.");
    return;
  }

  try {
    // Backend supports only 'en' / 'ru'; map other languages to 'en'
    const backendLanguage = appState.language === "ru" ? "ru" : "en";

    const resp = await fetch("/api/send-portraits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        images: appState.generatedImages,
        total: appState.creditsTotal,
        used: appState.creditsUsed,
        language: backendLanguage
      })
    });

    if (!resp.ok) {
      throw new Error("Email server returned error.");
    }

    const data = await resp.json();
    if (!data || !data.ok) {
      throw new Error("Email service did not confirm sending.");
    }

    alert(
      `Session finished. We have sent ${appState.generatedImages.length} portrait(s) to ${email}.`
    );

    resetSessionCredits();
  } catch (err) {
    console.error("SEND EMAIL ERROR:", err);
    alert(
      "Portraits were generated, but we could not send the email. Please try again later or contact support."
    );
  }
}

function resetSessionCredits() {
  appState.creditsTotal = 0;
  appState.creditsUsed = 0;
  appState.generatedImages = [];
  appState.hasActivePack = false;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.CREDITS_TOTAL);
    window.localStorage.removeItem(STORAGE_KEYS.CREDITS_USED);
    window.localStorage.removeItem(STORAGE_KEYS.GENERATED_IMAGES);
    window.localStorage.removeItem(STORAGE_KEYS.HAS_ACTIVE_PACK);
  } catch (e) {
    console.warn("Cannot clear session storage", e);
  }

  refreshSelectionChips();
}