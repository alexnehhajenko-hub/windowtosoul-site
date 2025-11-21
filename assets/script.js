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
// (панель закрывается после выбора)
// =========================

function openStyleSheet() {
  const options = [
    { value: "beauty", label: "✨ Светлый бьюти-портрет" },
    { value: "oil", label: "Картина маслом" },
    { value: "anime", label: "Аниме" },
    { value: "poster", label: "Постер" },
    { value: "classic", label: "Классический портрет" }
  ];

  openSheet({
    title: "Стиль портрета",
    description: "Выберите основной художественный стиль.",
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
    { value: "no-wrinkles", label: "Без морщин" },
    { value: "younger", label: "Моложе на 10–20 лет" },
    { value: "smooth-skin", label: "Гладкая кожа" },
    { value: "glow-golden", label: "✨ Золотое сияние" },
    { value: "cinematic-light", label: "🎬 Кино-свет" }
  ];

  openSheet({
    title: "Эффект кожи",
    description: "Выберите эффект, который даст вау-ощущение.",
    options: options.map((opt) => ({
      ...opt,
      selected: appState.selectedEffects.includes(opt.value),
      onClick: (value) => {
        // один эффект за раз — чтобы было понятно, что выбрано
        removeSkinEffects();
        toggleEffect(value);
        refreshSelectionChips();
        closeSheet(); // <<< панель закрывается после выбора
      }
    }))
  });
}

function openMimicSheet() {
  const options = [
    { value: "smile-soft", label: "🙂 Лёгкая улыбка" },
    { value: "smile-big", label: "😄 Большая улыбка" },
    { value: "smile-hollywood", label: "😁 Голливудская улыбка" },
    { value: "laugh", label: "😂 Смех" },
    { value: "surprised-wow", label: "😲 Вау-удивление" },
    { value: "eyes-bigger", label: "👁 Чуть больше глаза" },
    { value: "eyes-brighter", label: "✨ Ярче глаза" },
    { value: "neutral", label: "Нейтральное лицо" },
    { value: "serious", label: "Серьёзный взгляд" }
  ];

  openSheet({
    title: "Мимика",
    description: "Выберите выражение лица.",
    options: options.map((opt) => ({
      ...opt,
      selected: appState.selectedEffects.includes(opt.value),
      onClick: (value) => {
        removeAllMimicEffects();
        toggleEffect(value);
        refreshSelectionChips();
        closeSheet(); // закрываем панель после выбора
      }
    }))
  });
}

function openGreetingSheet() {
  const options = [
    { value: "new-year", label: "Новый год 🎄" },
    { value: "birthday", label: "День рождения 🎂" },
    { value: "funny", label: "Смешное 😜" },
    { value: "scary", label: "Страшное 👻" }
  ];

  openSheet({
    title: "Поздравления",
    description:
      "Мы аккуратно добавим праздничный антураж к портрету.",
    options: options.map((opt) => ({
      ...opt,
      selected: appState.selectedGreeting === opt.value,
      onClick: (value) => {
        appState.selectedGreeting =
          appState.selectedGreeting === value ? null : value;
        refreshSelectionChips();
        closeSheet(); // закрываем после выбора
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
  openAgreementModal(); // в бою можно переиспользовать это окно для email
}

function openAgreementModal() {
  if (!els.agreementBackdrop) return;

  if (els.agreeError) els.agreeError.textContent = "";

  // подставим email, если уже есть
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

  // ВАЖНО: явное соглашение про внешние ИИ
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

  // сохраняем email и согласие
  appState.userEmail = email;
  appState.userAgreed = true;

  try {
    window.localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
    window.localStorage.setItem(STORAGE_KEYS.USER_AGREED, "1");
  } catch (e) {
    console.warn("Cannot store email/agreement", e);
  }

  if (DEMO_MODE) {
    // В ДЕМО: модалка = согласие перед генерацией
    closeAgreementModal(false);

    // инициализируем пакет на 5 генераций, если ещё нет
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
    // пользователь нажимает "Сделать портрет" ещё раз, и генерация идёт
  } else {
    // В БОЕВОМ РЕЖИМЕ: после согласия запускаем Stripe Checkout
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

  if (appState.selectedStyle) {
    const map = {
      beauty: "Стиль: Бьюти",
      oil: "Стиль: Масло",
      anime: "Стиль: Аниме",
      poster: "Стиль: Постер",
      classic: "Стиль: Классика"
    };
    addChip(map[appState.selectedStyle] || "Стиль: выбран");
  }

  appState.selectedEffects.forEach((e) => {
    const map = {
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
    addChip(map[e] || e);
  });

  if (appState.selectedGreeting) {
    const map = {
      "new-year": "Поздравление: Новый год",
      birthday: "Поздравление: День рождения",
      funny: "Поздравление: смешное",
      scary: "Поздравление: страшное"
    };
    addChip(map[appState.selectedGreeting] || "Поздравление выбрано");
  }

  if (appState.selectedPack) {
    const map = {
      pack10: "Пакет: 10 генераций",
      pack20: "Пакет: 20 генераций",
      pack30: "Пакет: 30 генераций"
    };
    addChip(map[appState.selectedPack] || "Пакет выбран");
  }

  if (appState.creditsTotal > 0) {
    addChip(`Сделано ${appState.creditsUsed} из ${appState.creditsTotal}`);
  }

  if (DEMO_MODE) {
    addChip("Demo: 5 генераций с отправкой на email");
  } else if (appState.hasActivePack) {
    addChip("Оплачено: генерации доступны");
  } else {
    addChip("Оплата не выполнена");
  }
}

// =========================
// СЕРВЕРНАЯ СЕССИЯ
// =========================

// Создать / прочитать сессию на сервере и сохранить sessionId в appState + localStorage
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

// Обновление сессии после генерации (сохранение картинки + +1 генерация)
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
          greeting: appState.selectedGreeting || null
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
    alert("Сначала добавьте фото.");
    return;
  }

  if (DEMO_MODE) {
    if (!appState.userEmail || !appState.userAgreed) {
      openAgreementModal();
      return;
    }
  } else {
    if (!appState.hasActivePack) {
      alert("Сначала оплатите пакет генераций.");
      openPayModal();
      return;
    }
  }

  // гарантируем, что на сервере создана сессия с email и лимитом генераций
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
      greeting: appState.selectedGreeting || null
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

    // показать результат
    showResultPortrait(data.image);

    // записать генерацию на сервер (сессия + картинка + мета)
    await updateServerSessionAfterGeneration(data.image);

    // локальный учёт для демо-режима
    if (DEMO_MODE) {
      registerGeneration(data.image);
    }

    // после каждой генерации полностью сбрасываем стиль/эффекты/поздравление
    resetEffectsAndGreeting();
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    alert("Не удалось сгенерировать портрет. Попробуйте ещё раз.");
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
    alert("Email не найден. Невозможно отправить портреты.");
    return;
  }

  if (!appState.generatedImages || appState.generatedImages.length === 0) {
    alert("Нет сгенерированных портретов для отправки.");
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
        used: appState.creditsUsed
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
      `Сессия завершена. Мы отправили ${appState.generatedImages.length} портрет(ов) на ${email}.`
    );

    resetDemoSession();
  } catch (err) {
    console.error("SEND EMAIL ERROR:", err);
    alert(
      "Портреты были сгенерированы, но не удалось отправить email. Попробуйте позже или свяжитесь с поддержкой."
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
    // email и согласие оставляем, чтобы не вводить каждый раз
  } catch (e) {
    console.warn("Cannot clear demo session storage", e);
  }

  refreshSelectionChips();
}