// assets/js/state.js
// Состояние приложения, демо-лимит, языки и тексты UI.

export const SUPPORT_EMAIL = "yourphotoaivip@gmail.com";

// Сейчас оставим демо включённым, чтобы было удобно тестировать.
// Когда включим реальные оплаты — поменяем DEMO_MODE на false.
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
  SELECTED_PACK: "yourphotoai_selectedPack",
  MODE: "yourphotoai_mode"
};

// Основные тексты интерфейса (чтобы не лезть в JS каждый раз)
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
      'Stripe.js not found. Please ensure <script src="https://js.stripe.com/v3/"></script> is present in index.html.',
    alertEmailMissing: "Please enter your email.",
    alertAgreeMissing: "Please confirm age and consent.",

    paymentSuccess:
      "Payment completed! 🎉 You can now generate portraits with your package.",

    // ✅ Restore guide (EN only, but used for all languages too)
    restoreGuideTitle: "Old Photo Restoration – Tips",
    restoreGuideText:
      "To get the best restoration result:\n\n" +
      "1) Place the photo flat (table).\n" +
      "2) Use bright soft light (near window). Avoid glare / reflections.\n" +
      "3) Hold the phone straight above the photo (no angle).\n" +
      "4) Keep the whole photo visible, do not cut the corners.\n" +
      "5) Make sure it is in focus (tap on the photo).\n\n" +
      "Press OK to enable Restoration mode. Then click GENERATE."
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
    supportLabel: "Support:",

    // reuse EN guide
    restoreGuideTitle: "Old Photo Restoration – Tips",
    restoreGuideText:
      UI_TEXT?.en?.restoreGuideText || ""
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
    supportLabel: "Soporte:",

    // reuse EN guide
    restoreGuideTitle: "Old Photo Restoration – Tips",
    restoreGuideText:
      UI_TEXT?.en?.restoreGuideText || ""
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
    supportLabel: "Поддержка:",

    // reuse EN guide
    restoreGuideTitle: "Old Photo Restoration – Tips",
    restoreGuideText:
      UI_TEXT?.en?.restoreGuideText || ""
  }
};

export const GREETING_LABELS = {
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

export const SHEET_TEXT = {
  en: {
    styleTitle: "Portrait style",
    styleDescription: "Choose the main artistic style.",
    skinTitle: "Skin effect",
    skinDescription: "Choose an effect that gives a wow feeling.",
    mimicTitle: "Expression",
    mimicDescription: "Choose the facial expression.",
    greetingTitle: "Greetings",
    greetingDescription:
      "We will gently add festive atmosphere to the portrait."
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

// Глобальное состояние
export const appState = {
  // ✅ mode: "portrait" | "restore"
  mode: "portrait",

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

    const storedMode = window.localStorage.getItem(STORAGE_KEYS.MODE);
    if (storedMode === "restore" || storedMode === "portrait") {
      appState.mode = storedMode;
    }

    const storedPaid = window.localStorage.getItem(STORAGE_KEYS.HAS_ACTIVE_PACK);
    if (storedPaid === "1") {
      appState.hasActivePack = true;
    }

    const storedEmail = window.localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    if (storedEmail) {
      appState.userEmail = storedEmail;
    }

    const storedAgreed = window.localStorage.getItem(STORAGE_KEYS.USER_AGREED);
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

    const storedPack = window.localStorage.getItem(STORAGE_KEYS.SELECTED_PACK);
    if (storedPack && PACK_SIZES[storedPack]) {
      appState.selectedPack = storedPack;
    }
  } catch (e) {
    console.warn("Cannot read localStorage", e);
  }
}