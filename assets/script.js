// YourPhotoAI — основной фронтенд-скрипт
// UI: выбор стиля, эффектов кожи, мимики, поздравлений, пакетов и генерации.
// Оплата: Stripe Checkout через /api/create-checkout-session (в боевом режиме).
// Дополнительно: обработка кнопки "Назад" на телефоне.

// =========================
// РЕЖИМ РАБОТЫ
// =========================
//
// DEMO_MODE = true  → генерация БЕЗ оплаты, но с email + согласием и пакетом на 5 генераций
// DEMO_MODE = false → генерация ТОЛЬКО после оплаты (Stripe)

const DEMO_MODE = true;

// Сколько генераций в одном "пакете" в демо-режиме
const DEMO_SESSION_LIMIT = 5;

// Endpoint серверной сессии
const API_SESSION = "/api/session";

// Почта поддержки
const SUPPORT_EMAIL = "support@yourphotoai.vip";

// =========================
// КОНСТАНТЫ ДЛЯ ХРАНЕНИЯ СОСТОЯНИЯ
// =========================

const STORAGE_KEYS = {
  HAS_ACTIVE_PACK: "yourphotoai_hasActivePack", // боевой режим (Stripe)
  USER_EMAIL: "yourphotoai_userEmail",
  USER_AGREED: "yourphotoai_userAgreed",
  CREDITS_TOTAL: "yourphotoai_creditsTotal",
  CREDITS_USED: "yourphotoai_creditsUsed",
  GENERATED_IMAGES: "yourphotoai_generatedImages",
  SESSION_ID: "yourphotoai_sessionId"
};

// =========================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// =========================

const appState = {
  // генерация
  selectedStyle: null,
  selectedEffects: [], // кожа + мимика + прочие эффекты
  selectedGreeting: null,

  // язык интерфейса / поздравлений
  language: "ru", // "ru" | "en"

  // фото
  originalFile: null,
  photoBase64: null,

  // Stripe-пакет (боевой сценарий)
  selectedPack: null, // 'pack10' | 'pack20' | 'pack30'

  // статус
  isGenerating: false,
  isPaying: false,

  // оплата (боевой режим)
  hasActivePack: false,

  // демо-пакет/кредиты
  creditsTotal: 0,
  creditsUsed: 0,
  generatedImages: [],

  // согласие и email
  userEmail: "",
  userAgreed: false,

  // серверная сессия
  serverSessionId: null,

  // UI-слой для кнопки "Назад"
  layer: "home" // 'home' | 'sheet' | 'pay' | 'agree' | 'result'
};

// =========================
// DOM-ЭЛЕМЕНТЫ
// =========================

const els = {};

function bindElements() {
  els.previewImage = document.getElementById("previewImage");
  els.previewPlaceholder = document.getElementById("previewPlaceholder");
  els.greetingOverlay = document.getElementById("greetingOverlay");
  els.generateStatus = document.getElementById("generateStatus");
  els.selectionRow = document.getElementById("selectionRow");

  // Кнопки главного экрана
  els.btnStyle = document.getElementById("btnStyle");
  els.btnSkin = document.getElementById("btnSkin");
  els.btnMimic = document.getElementById("btnMimic");
  els.btnGreetings = document.getElementById("btnGreetings");
  els.btnGenerate = document.getElementById("btnGenerate");
  els.btnAddPhoto = document.getElementById("btnAddPhoto");
  els.btnPay = document.getElementById("btnPay");

  // Язык
  els.btnLangRu = document.getElementById("langRu");
  els.btnLangEn = document.getElementById("langEn");

  // Почта поддержки
  els.supportEmail = document.getElementById("supportEmail");

  // input файла
  els.fileInput = document.getElementById("fileInput");

  // Нижний sheet
  els.sheetBackdrop = document.getElementById("sheetBackdrop");
  els.sheetTitle = document.getElementById("sheetTitle");
  els.sheetDescription = document.getElementById("sheetDescription");
  els.sheetCategoryTitle = document.getElementById("sheetCategoryTitle");
  els.sheetCategoryRow = document.getElementById("sheetCategoryRow");
  els.sheetOptionsTitle = document.getElementById("sheetOptionsTitle");
  els.sheetOptionsRow = document.getElementById("sheetOptionsRow");
  els.sheetCloseBtn = document.getElementById("sheetCloseBtn");

  // Модалка оплаты
  els.payBackdrop = document.getElementById("payBackdrop");
  els.payCloseBtn = document.getElementById("payCloseBtn");
  els.pkg10 = document.getElementById("pkg10");
  els.pkg20 = document.getElementById("pkg20");
  els.pkg30 = document.getElementById("pkg30");
  els.payError = document.getElementById("payError");
  els.payNextBtn = document.getElementById("payNextBtn");

  // Модалка согласия (используем и в демо, и в бою)
  els.agreementBackdrop = document.getElementById("agreementBackdrop");
  els.agreementCloseBtn = document.getElementById("agreementCloseBtn");
  els.agreeEmail = document.getElementById("agreeEmail");
  els.agreeCheckbox = document.getElementById("agreeCheckbox");
  els.agreeError = document.getElementById("agreeError");
  els.agreePayBtn = document.getElementById("agreePayBtn"); // кнопка "Продолжить"

  // Кнопка скачивания результата
  els.downloadLink = document.getElementById("downloadLink");
}

// =========================
// ИНИЦИАЛИЗАЦИЯ
// =========================

document.addEventListener("DOMContentLoaded", () => {
  bindElements();

  // почта поддержки
  if (els.supportEmail) {
    els.supportEmail.href = `mailto:${SUPPORT_EMAIL}`;
    els.supportEmail.textContent = SUPPORT_EMAIL;
  }

  // подхватываем состояние из localStorage
  try {
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

    const storedImages = window.localStorage.getItem(STORAGE_KEYS.GENERATED_IMAGES);
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

    const storedSessionId = window.localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (storedSessionId) {
      appState.serverSessionId = storedSessionId;
    }
  } catch (e) {
    console.warn("Cannot read localStorage", e);
  }

  attachMainHandlers();
  setupBackButtonLogic();
  applyLanguageUI();
  refreshSelectionChips();
  hideOverlaysOnStart();
  handleStripeStatusFromUrl();
});

function hideOverlaysOnStart() {
  if (els.sheetBackdrop) els.sheetBackdrop.style.display = "none";
  if (els.payBackdrop) els.payBackdrop.style.display = "none";
  if (els.agreementBackdrop) els.agreementBackdrop.style.display = "none";
}

// =========================
// ЛОГИКА КНОПКИ НАЗАД
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
// ОБРАБОТЧИКИ ОСНОВНЫХ КНОПОК
// =========================

function attachMainHandlers() {
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
  if (els.btnGenerate) {
    els.btnGenerate.addEventListener("click", () => handleGenerateClick());
  }
  if (els.btnAddPhoto) {
    els.btnAddPhoto.addEventListener("click", () => {
      if (els.fileInput) els.fileInput.click();
    });
  }
  if (els.fileInput) {
    els.fileInput.addEventListener("change", handleFileSelected);
  }

  // Оплата (боевой режим)
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

  // Модалка согласия
  if (els.agreementCloseBtn) {
    els.agreementCloseBtn.addEventListener("click", () =>
      closeAgreementModal()
    );
  }
  if (els.agreePayBtn) {
    els.agreePayBtn.addEventListener("click", () => handleAgreeConfirm());
  }

  if (els.sheetCloseBtn) {
    els.sheetCloseBtn.addEventListener("click", () => closeSheet());
  }

  if (els.downloadLink) {
    els.downloadLink.addEventListener("click", (e) => {
      if (!els.previewImage || !els.previewImage.src) {
        e.preventDefault();
      }
    });
  }

  // Переключение языка
  if (els.btnLangRu) {
    els.btnLangRu.addEventListener("click", () => setLanguage("ru"));
  }
  if (els.btnLangEn) {
    els.btnLangEn.addEventListener("click", () => setLanguage("en"));
  }
}

// =========================
// ЯЗЫК: RU / EN
// =========================

function setLanguage(lang) {
  if (lang !== "ru" && lang !== "en") return;
  appState.language = lang;
  applyLanguageUI();
  refreshSelectionChips();
}

function applyLanguageUI() {
  if (els.btnLangRu && els.btnLangEn) {
    if (appState.language === "ru") {
      els.btnLangRu.classList.add("lang-selected");
      els.btnLangEn.classList.remove("lang-selected");
    } else {
      els.btnLangEn.classList.add("lang-selected");
      els.btnLangRu.classList.remove("lang-selected");
    }
  }
}

// =========================
// РАБОТА С ФАЙЛОМ
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
// НИЖНИЙ SHEET (СПИСКИ ОПЦИЙ)
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
// ЛИСТЫ: СТИЛЬ, КОЖА, МИМИКА, ПОЗДРАВЛЕНИЯ
// =========================

function openStyleSheet() {
  const options = [
    { value: "beauty", label: appState.language === "ru" ? "✨ Светлый бьюти-портрет" : "✨ Bright beauty portrait" },
    { value: "oil", label: appState.language === "ru" ? "Картина маслом" : "Oil painting" },
    { value: "anime", label: appState.language === "ru" ? "Аниме" : "Anime" },
    { value: "poster", label: appState.language === "ru" ? "Постер" : "Poster" },
    { value: "classic", label: appState.language === "ru" ? "Классический портрет" : "Classic portrait" }
  ];

  openSheet({
    title: appState.language === "ru" ? "Стиль портрета" : "Portrait style",
    description: appState.language === "ru"
      ? "Выберите основной художественный стиль."
      : "Choose the main art style.",
    options: options.map((opt) => ({
      ...opt,
      selected: appState.selectedStyle === opt.value,
      onClick: (value) => {
        appState.selectedStyle = value;
        refreshSelectionChips();
        closeSheet();
      }
    }))
  });
}

function openSkinSheet() {
  const options = [
    {
      value: "no-wrinkles",
      label: appState.language === "ru" ? "Без морщин" : "No wrinkles"
    },
    {
      value: "younger",
      label: appState.language === "ru" ? "Моложе на 10–20 лет" : "10–20 years younger"
    },
    {
      value: "smooth-skin",
      label: appState.language === "ru" ? "Гладкая кожа" : "Smooth skin"
    },
    {
      value: "glow-golden",
      label: appState.language === "ru" ? "✨ Золотое сияние" : "✨ Golden glow"
    },
    {
      value: "cinematic-light",
      label: appState.language === "ru" ? "🎬 Кино-свет" : "🎬 Cinematic light"
    }
  ];

  openSheet({
    title: appState.language === "ru" ? "Эффект кожи" : "Skin effect",
    description: appState.language === "ru"
      ? "Выберите эффект, который даст вау-ощущение."
      : "Choose an effect that gives a wow feeling.",
    options: options.map((opt) => ({
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
  const options = [
    {
      value: "smile-soft",
      label: appState.language === "ru" ? "🙂 Лёгкая улыбка" : "🙂 Soft smile"
    },
    {
      value: "smile-big",
      label: appState.language === "ru" ? "😄 Большая улыбка" : "😄 Big smile"
    },
    {
      value: "smile-hollywood",
      label: appState.language === "ru" ? "😁 Голливудская улыбка" : "😁 Hollywood smile"
    },
    {
      value: "laugh",
      label: appState.language === "ru" ? "😂 Смех" : "😂 Laugh"
    },
    {
      value: "surprised-wow",
      label: appState.language === "ru" ? "😲 Вау-удивление" : "😲 Wow surprise"
    },
    {
      value: "eyes-bigger",
      label: appState.language === "ru" ? "👁 Чуть больше глаза" : "👁 Slightly bigger eyes"
    },
    {
      value: "eyes-brighter",
      label: appState.language === "ru" ? "✨ Ярче глаза" : "✨ Brighter eyes"
    },
    {
      value: "neutral",
      label: appState.language === "ru" ? "Нейтральное лицо" : "Neutral face"
    },
    {
      value: "serious",
      label: appState.language === "ru" ? "Серьёзный взгляд" : "Serious look"
    }
  ];

  openSheet({
    title: appState.language === "ru" ? "Мимика" : "Expression",
    description: appState.language === "ru"
      ? "Выберите выражение лица."
      : "Choose facial expression.",
    options: options.map((opt) => ({
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
  // фильтры с поздравлениями (категории)
  const labels = appState.language === "ru"
    ? {
        "new-year": "Новый год 🎄",
        birthday: "День рождения 🎂",
        funny: "Смешное 😜",
        scary: "Страшное 👻"
      }
    : {
        "new-year": "New Year 🎄",
        birthday: "Birthday 🎂",
        funny: "Funny 😜",
        scary: "Scary 👻"
      };

  const options = Object.entries(labels).map(([value, label]) => ({
    value,
    label
  }));

  openSheet({
    title: appState.language === "ru" ? "Поздравления" : "Greetings",
    description: appState.language === "ru"
      ? "Мы аккуратно добавим праздничный антураж к портрету."
      : "We gently add a festive mood to your portrait.",
    options: options.map((opt) => ({
      ...opt,
      selected: appState.selectedGreeting === opt.value,
      onClick: (value) => {
        appState.selectedGreeting =
          appState.selectedGreeting === value ? null : value;
        refreshSelectionChips();
        closeSheet();
      }
    }))
  });
}

// =========================
// ВСПОМОГАТЕЛЬНОЕ ДЛЯ ЭФФЕКТОВ
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

// СБРОС СТИЛЕЙ/ЭФФЕКТОВ/ПОЗДРАВЛЕНИЙ ПОСЛЕ КАЖДОЙ ГЕНЕРАЦИИ
function resetEffectsAndGreeting() {
  appState.selectedStyle = null;
  appState.selectedEffects = [];
  appState.selectedGreeting = null;

  if (els.greetingOverlay) {
    els.greetingOverlay.textContent = "";
    els.greetingOverlay.style.display = "none";
  }

  refreshSelectionChips();
}

// =========================
// ПАКЕТЫ И ОПЛАТА STRIPE (БОЕВОЙ РЕЖИМ)
// =========================

function openPayModal() {
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
  if (!appState.selectedPack) {
    if (els.payError) {
      els.payError.textContent = "Пожалуйста, выберите пакет.";
    }
    return;
  }
  closePayModal(false);
  openAgreementModal();
}

function openAgreementModal() {
  if (!els.agreementBackdrop) return;

  if (els.agreeError) els.agreeError.textContent = "";

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
// СОГЛАСИЕ (ПЕРЕД ГЕНЕРАЦИЕЙ / ОПЛАТОЙ)
// =========================

function handleAgreeConfirm() {
  const email = (els.agreeEmail && els.agreeEmail.value.trim()) || "";
  const checked = els.agreeCheckbox && els.agreeCheckbox.checked;

  if (!email) {
    if (els.agreeError) els.agreeError.textContent = "Введите email.";
    return;
  }
  if (!checked) {
    if (els.agreeError)
      els.agreeError.textContent = "Нужно подтвердить возраст и согласие.";
    return;
  }

  const confirmText =
    "Продолжая, вы согласны, что:\n\n" +
    "• ваше фото и сгенерированные портреты будут отправлены в сторонний AI-сервис для обработки;\n" +
    "• обработка происходит автоматически, без ручной модерации;\n" +
    "• вы имеете права на загружаемые изображения и разрешаете их такую обработку.\n\n" +
    "Нажмите «OK», если вы согласны.";
  const ok = window.confirm(confirmText);
  if (!ok) {
    return;
  }

  if (els.agreeError) els.agreeError.textContent = "";

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
  if (!appState.selectedPack) {
    alert("Сначала выберите пакет.");
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
      throw new Error("Сервер оплаты вернул ошибку.");
    }

    const data = await resp.json();
    if (!data || !data.sessionId || !data.publishableKey) {
      throw new Error("Неверный ответ от сервера оплаты.");
    }

    closeAgreementModal(false);

    const stripe = window.Stripe
      ? window.Stripe(data.publishableKey)
      : null;

    if (!stripe) {
      alert(
        'Stripe.js не найден. Убедитесь, что в index.html есть <script src="https://js.stripe.com/v3/"></script>.'
      );
      return;
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId: data.sessionId
    });

    if (error) {
      console.error("Stripe redirect error:", error);
      alert("Не удалось открыть страницу оплаты: " + error.message);
    }
  } catch (err) {
    console.error("PAY ERROR:", err);
    alert("Ошибка при создании оплаты. Попробуйте ещё раз.");
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
      alert("Оплата успешно завершена! 🎉 Теперь вы можете генерировать портреты.");
    } else if (status === "cancel") {
      console.log("Stripe checkout cancelled");
    }

    url.searchParams.delete("status");
    url.searchParams.delete("session_id");
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "", url.toString());
    }
  } catch (e) {
    console.warn("Cannot parse URL for Stripe status", e);
  }
}

// =========================
// ЧИПЫ ВЫБРАННЫХ ОПЦИЙ ПОД ПРЕВЬЮ
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

  // язык
  if (appState.language === "ru") {
    addChip("Язык: Русский");
  } else {
    addChip("Language: English");
  }

  if (appState.selectedStyle) {
    const mapRu = {
      beauty: "Стиль: Бьюти",
      oil: "Стиль: Масло",
      anime: "Стиль: Аниме",
      poster: "Стиль: Постер",
      classic: "Стиль: Классика"
    };
    const mapEn = {
      beauty: "Style: Beauty",
      oil: "Style: Oil painting",
      anime: "Style: Anime",
      poster: "Style: Poster",
      classic: "Style: Classic"
    };
    const map = appState.language === "ru" ? mapRu : mapEn;
    addChip(map[appState.selectedStyle] || (appState.language === "ru" ? "Стиль: выбран" : "Style: selected"));
  }

  appState.selectedEffects.forEach((e) => {
    const mapRu = {
      "no-wrinkles": "Эффект: без морщин",
      younger: "Эффект: моложе",
      "smooth-skin": "Эффект: гладкая кожа",
      "glow-golden": "Эффект: золотое сияние",
      "cinematic-light": "Эффект: кино-свет",
      "smile-soft": "Мимика: лёгкая улыбка",
      "smile-big": "Мимика: большая улыбка",
      "smile-hollywood": "Мимика: голливудская улыбка",
      laugh: "Мимика: смех",
      "surprised-wow": "Мимика: вау-удивление",
      neutral: "Мимика: нейтрально",
      serious: "Мимика: серьёзно",
      "eyes-bigger": "Мимика: больше глаза",
      "eyes-brighter": "Мимика: ярче глаза"
    };
    const mapEn = {
      "no-wrinkles": "Effect: no wrinkles",
      younger: "Effect: younger",
      "smooth-skin": "Effect: smooth skin",
      "glow-golden": "Effect: golden glow",
      "cinematic-light": "Effect: cinematic light",
      "smile-soft": "Expression: soft smile",
      "smile-big": "Expression: big smile",
      "smile-hollywood": "Expression: Hollywood smile",
      laugh: "Expression: laugh",
      "surprised-wow": "Expression: wow surprise",
      neutral: "Expression: neutral",
      serious: "Expression: serious",
      "eyes-bigger": "Expression: bigger eyes",
      "eyes-brighter": "Expression: brighter eyes"
    };
    const map = appState.language === "ru" ? mapRu : mapEn;
    addChip(map[e] || e);
  });

  if (appState.selectedGreeting) {
    const mapRu = {
      "new-year": "Поздравление: Новый год",
      birthday: "Поздравление: День рождения",
      funny: "Поздравление: смешное",
      scary: "Поздравление: страшное"
    };
    const mapEn = {
      "new-year": "Greeting: New Year",
      birthday: "Greeting: Birthday",
      funny: "Greeting: funny",
      scary: "Greeting: scary"
    };
    const map = appState.language === "ru" ? mapRu : mapEn;
    addChip(map[appState.selectedGreeting] || (appState.language === "ru" ? "Поздравление выбрано" : "Greeting chosen"));
  }

  if (appState.selectedPack) {
    const mapRu = {
      pack10: "Пакет: 10 генераций",
      pack20: "Пакет: 20 генераций",
      pack30: "Пакет: 30 генераций"
    };
    const mapEn = {
      pack10: "Pack: 10 generations",
      pack20: "Pack: 20 generations",
      pack30: "Pack: 30 generations"
    };
    const map = appState.language === "ru" ? mapRu : mapEn;
    addChip(map[appState.selectedPack] || (appState.language === "ru" ? "Пакет выбран" : "Pack selected"));
  }

  if (appState.creditsTotal > 0) {
    if (appState.language === "ru") {
      addChip(`Сделано ${appState.creditsUsed} из ${appState.creditsTotal}`);
    } else {
      addChip(`Generated ${appState.creditsUsed} of ${appState.creditsTotal}`);
    }
  }

  if (DEMO_MODE) {
    if (appState.language === "ru") {
      addChip("Demo: 5 генераций с отправкой на email");
    } else {
      addChip("Demo: 5 generations with email delivery");
    }
  } else if (appState.hasActivePack) {
    addChip(appState.language === "ru" ? "Оплачено: генерации доступны" : "Paid: generations available");
  } else {
    addChip(appState.language === "ru" ? "Оплата не выполнена" : "Payment not completed");
  }
}

// =========================
// СЕРВЕРНАЯ СЕССИЯ
// =========================

async function ensureServerSession() {
  if (!appState.userEmail) return null;

  if (appState.serverSessionId) {
    return appState.serverSessionId;
  }

  let existingId = null;
  try {
    existingId = window.localStorage.getItem(STORAGE_KEYS.SESSION_ID);
  } catch (e) {
    console.warn("Cannot read SESSION_ID from storage", e);
  }

  if (existingId) {
    appState.serverSessionId = existingId;
    return existingId;
  }

  try {
    const resp = await fetch(API_SESSION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: appState.userEmail,
        totalCredits: appState.creditsTotal || DEMO_SESSION_LIMIT
      })
    });

    if (!resp.ok) {
      console.warn("Session create error:", await resp.text());
      return null;
    }

    const data = await resp.json();
    const newId = data.sessionId || (data.session && data.session.id);
    if (!newId) return null;

    appState.serverSessionId = newId;
    try {
      window.localStorage.setItem(STORAGE_KEYS.SESSION_ID, newId);
    } catch (e) {
      console.warn("Cannot save SESSION_ID", e);
    }
    return newId;
  } catch (e) {
    console.warn("ensureServerSession failed", e);
    return null;
  }
}

async function updateServerSessionAfterGeneration(imageUrl) {
  if (!appState.serverSessionId || !imageUrl) return;

  try {
    await fetch(API_SESSION, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId: appState.serverSessionId,
        imageUrl,
        incrementUsedCredits: 1,
        meta: {
          style: appState.selectedStyle || "beauty",
          effects: appState.selectedEffects,
          greeting: appState.selectedGreeting || null,
          language: appState.language
        }
      })
    });
  } catch (e) {
    console.warn("updateServerSessionAfterGeneration failed", e);
  }
}

// =========================
// ГЕНЕРАЦИЯ ПОРТРЕТА
// =========================

async function handleGenerateClick() {
  if (appState.isGenerating) return;

  if (!appState.photoBase64) {
    alert(appState.language === "ru" ? "Сначала добавьте фото." : "Please upload a photo first.");
    return;
  }

  if (DEMO_MODE) {
    if (!appState.userEmail || !appState.userAgreed) {
      openAgreementModal();
      return;
    }
  } else {
    if (!appState.hasActivePack) {
      alert(appState.language === "ru"
        ? "Сначала оплатите пакет генераций."
        : "Please purchase a generation pack first."
      );
      openPayModal();
      return;
    }
  }

  if (appState.userEmail) {
    await ensureServerSession();
  }

  appState.isGenerating = true;
  showGenerating(true);

  try {
    const payload = {
      style: appState.selectedStyle || "beauty",
      text: "",
      photo: appState.photoBase64,
      effects: appState.selectedEffects,
      greeting: appState.selectedGreeting || null,
      language: appState.language // язык для поздравлений/надписей
    };

    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error("Сервер генерации вернул ошибку.");
    }

    const data = await resp.json();
    if (!data || !data.image) {
      throw new Error("Сервер не вернул ссылку на изображение.");
    }

    showResultPortrait(data.image);

    await updateServerSessionAfterGeneration(data.image);

    if (DEMO_MODE) {
      registerGeneration(data.image);
    }

    resetEffectsAndGreeting();
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    alert(
      appState.language === "ru"
        ? "Не удалось сгенерировать портрет. Попробуйте ещё раз."
        : "Failed to generate the portrait. Please try again."
    );
  } finally {
    showGenerating(false);
    appState.isGenerating = false;
  }
}

function registerGeneration(imageUrl) {
  if (appState.creditsTotal <= 0) {
    appState.creditsTotal = DEMO_SESSION_LIMIT;
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

  if (appState.creditsUsed >= appState.creditsTotal) {
    finishSessionAndSendEmail();
  }
}

function showGenerating(isOn) {
  if (!els.generateStatus) return;
  els.generateStatus.style.display = isOn ? "flex" : "none";
}

// =========================
// ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА / СКАЧИВАНИЕ
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
// ЗАВЕРШЕНИЕ СЕССИИ И ОТПРАВКА НА EMAIL
// =========================

async function finishSessionAndSendEmail() {
  const email = appState.userEmail;

  if (!email) {
    alert(
      appState.language === "ru"
        ? "Email не найден. Невозможно отправить портреты."
        : "Email not found. Cannot send portraits."
    );
    return;
  }

  if (!appState.generatedImages || appState.generatedImages.length === 0) {
    alert(
      appState.language === "ru"
        ? "Нет сгенерированных портретов для отправки."
        : "No generated portraits to send."
    );
    return;
  }

  try {
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
        language: appState.language
      })
    });

    if (!resp.ok) {
      throw new Error("Сервер email вернул ошибку.");
    }

    const data = await resp.json();
    if (!data || !data.ok) {
      throw new Error("Сервис email не подтвердил отправку.");
    }

    alert(
      appState.language === "ru"
        ? `Сессия завершена. Мы отправили ${appState.generatedImages.length} портрет(ов) на ${email}.`
        : `Session finished. We sent ${appState.generatedImages.length} portrait(s) to ${email}.`
    );

    resetDemoSession();
  } catch (err) {
    console.error("SEND EMAIL ERROR:", err);
    alert(
      appState.language === "ru"
        ? "Портреты были сгенерированы, но не удалось отправить email. Попробуйте позже или свяжитесь с поддержкой."
        : "Portraits were generated, but email sending failed. Please try again later or contact support."
    );
  }
}

function resetDemoSession() {
  appState.creditsTotal = 0;
  appState.creditsUsed = 0;
  appState.generatedImages = [];

  try {
    window.localStorage.removeItem(STORAGE_KEYS.CREDITS_TOTAL);
    window.localStorage.removeItem(STORAGE_KEYS.CREDITS_USED);
    window.localStorage.removeItem(STORAGE_KEYS.GENERATED_IMAGES);
  } catch (e) {
    console.warn("Cannot clear demo session storage", e);
  }

  refreshSelectionChips();
}