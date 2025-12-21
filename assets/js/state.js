// assets/js/state.js
// App state + UI texts

export const SUPPORT_EMAIL = "yourphotoaivip@gmail.com";

export const DEMO_MODE = false;
export const DEMO_SESSION_LIMIT = 5;

export const PACK_SIZES = {
  pack10: 10,
  pack20: 20,
  pack30: 30
};

export const SUPPORTED_LANGS = ["en", "de", "es", "ru"];

export const STORAGE_KEYS = {
  HAS_ACTIVE_PACK: "yourphotoai_hasActivePack",
  USER_EMAIL: "yourphotoai_userEmail",
  USER_AGREED: "yourphotoai_userAgreed",
  CREDITS_TOTAL: "yourphotoai_creditsTotal",
  CREDITS_USED: "yourphotoai_creditsUsed",
  GENERATED_IMAGES: "yourphotoai_generatedImages",
  LANGUAGE: "yourphotoai_language",
  SELECTED_PACK: "yourphotoai_selectedPack"
};

export const UI_TEXT = {
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
    btnHollywoodPro: "HOLLYWOOD PRO",
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

    alertEmailMissing: "Please enter your email.",
    alertAgreeMissing: "Please confirm the checkbox.",
    alertStripeMissing: "Stripe is not loaded. Please refresh the page and try again.",
    alertPaymentCreateFailed: "Could not create a payment. Please try again.",

    paymentSuccess:
      "Payment completed! 🎉 You can now generate portraits with your package."
  },

  de: {
    subtitle: "Erstelle dein einzigartiges KI-Porträt",
    btnHollywoodPro: "HOLLYWOOD PRO",
    alertEmailMissing: "Bitte gib deine E-Mail ein.",
    alertAgreeMissing: "Bitte bestätige das Kästchen.",
    alertStripeMissing: "Stripe ist nicht geladen. Bitte Seite neu laden.",
    alertPaymentCreateFailed: "Zahlung konnte nicht erstellt werden. Bitte erneut versuchen."
  },
  es: {
    subtitle: "Crea tu retrato único con IA",
    btnHollywoodPro: "HOLLYWOOD PRO",
    alertEmailMissing: "Introduce tu correo electrónico.",
    alertAgreeMissing: "Confirma la casilla, por favor.",
    alertStripeMissing: "Stripe no está cargado. Recarga la página.",
    alertPaymentCreateFailed: "No se pudo crear el pago. Inténtalo de nuevo."
  },
  ru: {
    subtitle: "Создайте свой уникальный AI-портрет",
    btnHollywoodPro: "ГОЛЛИВУД PRO",
    alertEmailMissing: "Введите email.",
    alertAgreeMissing: "Подтвердите галочку согласия.",
    alertStripeMissing: "Stripe не загрузился. Обновите страницу и попробуйте снова.",
    alertPaymentCreateFailed: "Не удалось создать оплату. Попробуйте ещё раз."
  }
};

export const GREETING_LABELS = {
  en: { "new-year": "New Year 🎄", birthday: "Birthday 🎂", funny: "Funny 😜", scary: "Scary 👻" },
  de: { "new-year": "Neujahr 🎄", birthday: "Geburtstag 🎂", funny: "Witzig 😜", scary: "Gruselig 👻" },
  es: { "new-year": "Año Nuevo 🎄", birthday: "Cumpleaños 🎂", funny: "Divertido 😜", scary: "Terrorífico 👻" },
  ru: { "new-year": "Новый год 🎄", birthday: "День рождения 🎂", funny: "Смешное 😜", scary: "Страшное 👻" }
};

export const GREETING_TEXT = {
  "new-year": "Happy New Year!",
  birthday: "Happy Birthday!",
  funny: "You are AI-level awesome!",
  scary: "Your AI twin is watching you..."
};

export const STYLE_LABELS_EN = {
  beauty: "Beauty",
  oil: "Oil painting",
  anime: "Anime",
  poster: "Poster",
  classic: "Classic portrait"
};

export const EFFECT_CHIP_LABELS_EN = {
  "hollywood-pro": "Skin: Hollywood Pro",

  "no-wrinkles": "Effect: no wrinkles",
  younger: "Effect: younger",
  "smooth-skin": "Effect: smooth skin",
  "glow-golden": "Effect: golden glow",
  "cinematic-light": "Effect: cinematic light",
  "beauty-one-touch": "Effect: beauty one-touch",

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

export const SHEET_TEXT = {
  en: {
    styleTitle: "Portrait style",
    styleDescription: "Choose the main artistic style.",
    skinTitle: "Skin effect",
    skinDescription: "Choose an effect that gives a wow feeling.",
    mimicTitle: "Expression",
    mimicDescription: "Choose the facial expression.",
    greetingTitle: "Greetings",
    greetingDescription: "We will gently add festive atmosphere to the portrait."
  }
};

// Global app state
export const appState = {
  mode: "generate", // "generate" | "restore"

  selectedStyle: null,
  selectedEffects: [],
  selectedGreeting: null,

  language: "en",

  originalFile: null,
  photoBase64: null,

  selectedPack: null,

  isGenerating: false,
  isPaying: false,

  hasActivePack: false,

  creditsTotal: 0,
  creditsUsed: 0,
  generatedImages: [],

  userEmail: "",
  userAgreed: false,

  layer: "home"
};

export function loadStateFromStorage() {
  try {
    const storedLang = window.localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (storedLang && SUPPORTED_LANGS.includes(storedLang)) {
      appState.language = storedLang;
    }

    const storedPaid = window.localStorage.getItem(STORAGE_KEYS.HAS_ACTIVE_PACK);
    if (storedPaid === "1") appState.hasActivePack = true;

    const storedEmail = window.localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    if (storedEmail) appState.userEmail = storedEmail;

    const storedAgreed = window.localStorage.getItem(STORAGE_KEYS.USER_AGREED);
    if (storedAgreed === "1") appState.userAgreed = true;

    const storedTotal = parseInt(window.localStorage.getItem(STORAGE_KEYS.CREDITS_TOTAL) || "0", 10);
    const storedUsed = parseInt(window.localStorage.getItem(STORAGE_KEYS.CREDITS_USED) || "0", 10);
    if (!Number.isNaN(storedTotal)) appState.creditsTotal = storedTotal;
    if (!Number.isNaN(storedUsed)) appState.creditsUsed = storedUsed;

    const storedImages = window.localStorage.getItem(STORAGE_KEYS.GENERATED_IMAGES);
    if (storedImages) {
      try {
        const arr = JSON.parse(storedImages);
        if (Array.isArray(arr)) appState.generatedImages = arr;
      } catch (e) {
        console.warn("Cannot parse GENERATED_IMAGES", e);
      }
    }

    const storedPack = window.localStorage.getItem(STORAGE_KEYS.SELECTED_PACK);
    if (storedPack && PACK_SIZES[storedPack]) {
      appState.selectedPack = storedPack;
    }
  } catch (e) {
    console.warn("Cannot read localStorage", e);
  }
}