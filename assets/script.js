// YourPhotoAI — основной фронтенд-скрипт
// UI: выбор стиля, эффектов кожи, мимики, поздравлений, пакетов и генерации.
// Оплата: Stripe Checkout через /api/create-checkout-session.
// ЛОГИКА КРЕДИТОВ:
//  - после успешной оплаты появляются кредиты (10 / 20 / 30)
//  - каждый успешный портрет = минус 1 кредит
//  - когда кредиты закончились — все портреты отправляются на email и сессия закрывается.

// =========================
// КОНСТАНТЫ ДЛЯ ХРАНЕНИЯ СОСТОЯНИЯ
// =========================

const PACK_SIZES = {
  pack10: 10,
  pack20: 20,
  pack30: 30,
};

const STORAGE_KEYS = {
  HAS_ACTIVE_PACK: "yourphotoai_hasActivePack",
  CREDITS_TOTAL: "yourphotoai_creditsTotal",
  CREDITS_USED: "yourphotoai_creditsUsed",
  USER_EMAIL: "yourphotoai_userEmail",
  PENDING_PACK: "yourphotoai_pendingPack",
  GENERATED_IMAGES: "yourphotoai_generatedImages",
};

// =========================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// =========================

const appState = {
  // генерация
  selectedStyle: null,
  selectedEffects: [], // массив ключей эффектов
  selectedGreeting: null,

  // фото
  originalFile: null,
  photoBase64: null,

  // пакеты Stripe
  selectedPack: null, // 'pack10' | 'pack20' | 'pack30'

  // статус
  isGenerating: false,
  isPaying: false,

  // кредиты
  hasActivePack: false,
  creditsTotal: 0,
  creditsUsed: 0,
  generatedImages: [],

  // UI-слой для кнопки "Назад"
  layer: "home", // 'home' | 'sheet' | 'pay' | 'agree' | 'result'
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

  // Модалка согласия
  els.agreementBackdrop = document.getElementById("agreementBackdrop");
  els.agreementCloseBtn = document.getElementById("agreementCloseBtn");
  els.agreeEmail = document.getElementById("agreeEmail");
  els.agreeCheckbox = document.getElementById("agreeCheckbox");
  els.agreeError = document.getElementById("agreeError");
  els.agreePayBtn = document.getElementById("agreePayBtn");

  // Кнопка скачивания результата
  els.downloadLink = document.getElementById("downloadLink");
}

// =========================
// ИНИЦИАЛИЗАЦИЯ
// =========================

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  restoreStateFromStorage();
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

function restoreStateFromStorage() {
  try {
    const hasPack = window.localStorage.getItem(STORAGE_KEYS.HAS_ACTIVE_PACK);
    appState.hasActivePack = hasPack === "1";

    const total = parseInt(
      window.localStorage.getItem(STORAGE_KEYS.CREDITS_TOTAL) || "0",
      10
    );
    const used = parseInt(
      window.localStorage.getItem(STORAGE_KEYS.CREDITS_USED) || "0",
      10
    );
    if (!Number.isNaN(total)) appState.creditsTotal = total;
    if (!Number.isNaN(used)) appState.creditsUsed = used;

    const storedImages =
      window.localStorage.getItem(STORAGE_KEYS.GENERATED_IMAGES);
    if (storedImages) {
      try {
        const arr = JSON.parse(storedImages);
        if (Array.isArray(arr)) {
          appState.generatedImages = arr;
        }
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.warn("Cannot restore state from localStorage", e);
  }
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
  // Начальное состояние
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
        // уже на home — позволяем браузеру уходить назад
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

  // Оплата
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

  if (els.agreementCloseBtn) {
    els.agreementCloseBtn.addEventListener("click", () =>
      closeAgreementModal()
    );
  }
  if (els.agreePayBtn) {
    els.agreePayBtn.addEventListener("click", () => handleAgreePay());
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

  // Категории (если есть)
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

  // Основные варианты
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
    { value: "beauty", label: "Светлый бьюти-портрет" },
    { value: "oil", label: "Картина маслом" },
    { value: "anime", label: "Аниме" },
    { value: "poster", label: "Постер" },
    { value: "classic", label: "Классический портрет" },
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
      },
    })),
  });
}

function openSkinSheet() {
  const options = [
    { value: "no-wrinkles", label: "Без морщин" },
    { value: "younger", label: "Моложе" },
    { value: "smooth-skin", label: "Гладкая кожа" },
  ];

  openSheet({
    title: "Эффект кожи",
    description: "Выберите один или несколько эффектов.",
    options: options.map((opt) => ({
      ...opt,
      selected: appState.selectedEffects.includes(opt.value),
      onClick: (value) => {
        toggleEffect(value);
        refreshSelectionChips();
        // не закрываем сразу, чтобы можно было выбрать несколько
      },
    })),
  });
}

function openMimicSheet() {
  const options = [
    { value: "smile-soft", label: "Лёгкая улыбка" },
    { value: "smile-big", label: "Большая улыбка" },
    { value: "smile-hollywood", label: "Голливудская улыбка" },
    { value: "laugh", label: "Смех" },
    { value: "neutral", label: "Нейтральное лицо" },
    { value: "serious", label: "Серьёзный взгляд" },
    { value: "eyes-bigger", label: "Чуть больше глаза" },
    { value: "eyes-brighter", label: "Ярче глаза" },
  ];

  openSheet({
    title: "Мимика",
    description: "Выберите выражение лица.",
    options: options.map((opt) => ({
      ...opt,
      selected: appState.selectedEffects.includes(opt.value),
      onClick: (value) => {
        // одна мимика за раз
        removeAllMimicEffects();
        toggleEffect(value);
        refreshSelectionChips();
        closeSheet();
      },
    })),
  });
}

function openGreetingSheet() {
  const options = [
    { value: "new-year", label: "Новый год" },
    { value: "birthday", label: "День рождения" },
    { value: "funny", label: "Смешное" },
    { value: "scary", label: "Страшное" },
  ];

  openSheet({
    title: "Поздравления",
    description:
      "Выберите тип поздравления. Текст будет аккуратным и без грубых фраз.",
    options: options.map((opt) => ({
      ...opt,
      selected: appState.selectedGreeting === opt.value,
      onClick: (value) => {
        appState.selectedGreeting =
          appState.selectedGreeting === value ? null : value;
        refreshSelectionChips();
        closeSheet();
      },
    })),
  });
}

// =========================
// ПАКЕТЫ И ОПЛАТА STRIPE (МОДАЛКИ)
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
  els.agreementBackdrop.style.display = "flex";
  if (els.agreeError) els.agreeError.textContent = "";
  if (els.agreeCheckbox) els.agreeCheckbox.checked = false;
  setLayer("agree", true);
}

function closeAgreementModal(pushHistory = true) {
  if (!els.agreementBackdrop) return;
  els.agreementBackdrop.style.display = "none";
  if (pushHistory) setLayer("home", true);
}

function handleAgreePay() {
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

  if (els.agreeError) els.agreeError.textContent = "";
  startStripeCheckout(email);
}

async function startStripeCheckout(email) {
  if (!appState.selectedPack) {
    alert("Сначала выберите пакет.");
    return;
  }

  if (appState.isPaying) return;
  appState.isPaying = true;

  // сохраняем выбор пакета и email, чтобы после возврата со Stripe восстановить
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.PENDING_PACK,
      appState.selectedPack
    );
    window.localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
  } catch (e) {
    console.warn("Cannot store pending pack/email", e);
  }

  try {
    const resp = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pack: appState.selectedPack,
        email,
      }),
    });

    if (!resp.ok) {
      throw new Error("Сервер оплаты вернул ошибку.");
    }

    const data = await resp.json();
    if (!data || !data.sessionId || !data.publishableKey) {
      throw new Error("Неверный ответ от сервера оплаты.");
    }

    closeAgreementModal(false);

    const stripe = window.Stripe ? window.Stripe(data.publishableKey) : null;

    if (!stripe) {
      alert(
        'Stripe.js не найден. Убедитесь, что в index.html есть <script src="https://js.stripe.com/v3/"></script>.'
      );
      return;
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId: data.sessionId,
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
      // помечаем, что оплата прошла, и выдаём кредиты по пакету
      onPaymentSuccess();
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

function onPaymentSuccess() {
  let packKey = null;
  try {
    packKey = window.localStorage.getItem(STORAGE_KEYS.PENDING_PACK);
  } catch (e) {
    console.warn("Cannot read pending pack", e);
  }

  const credits = PACK_SIZES[packKey] || 10; // по умолчанию 10, если что-то пошло не так

  appState.hasActivePack = true;
  appState.creditsTotal = credits;
  appState.creditsUsed = 0;
  appState.generatedImages = [];

  try {
    window.localStorage.setItem(STORAGE_KEYS.HAS_ACTIVE_PACK, "1");
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
    console.warn("Cannot store payment state", e);
  }

  refreshSelectionChips();
  alert(
    `Оплата прошла! 🎉 Вам доступно ${credits} генераций портрета в YourPhotoAI.`
  );
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

function removeAllMimicEffects() {
  const mimicKeys = [
    "smile-soft",
    "smile-big",
    "smile-hollywood",
    "laugh",
    "neutral",
    "serious",
    "eyes-bigger",
    "eyes-brighter",
  ];
  appState.selectedEffects = appState.selectedEffects.filter(
    (e) => !mimicKeys.includes(e)
  );
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
      classic: "Стиль: Классика",
    };
    addChip(map[appState.selectedStyle] || "Стиль: выбран");
  }

  appState.selectedEffects.forEach((e) => {
    const map = {
      "no-wrinkles": "Без морщин",
      younger: "Моложе",
      "smooth-skin": "Гладкая кожа",
      "smile-soft": "Лёгкая улыбка",
      "smile-big": "Большая улыбка",
      "smile-hollywood": "Голливудская улыбка",
      laugh: "Смех",
      neutral: "Нейтрально",
      serious: "Серьёзно",
      "eyes-bigger": "Больше глаза",
      "eyes-brighter": "Ярче глаза",
    };
    addChip(map[e] || e);
  });

  if (appState.selectedGreeting) {
    const map = {
      "new-year": "Поздравление: Новый год",
      birthday: "Поздравление: День рождения",
      funny: "Поздравление: Смешное",
      scary: "Поздравление: Страшное",
    };
    addChip(map[appState.selectedGreeting] || "Поздравление выбрано");
  }

  if (appState.selectedPack) {
    const map = {
      pack10: "Пакет: 10 генераций",
      pack20: "Пакет: 20 генераций",
      pack30: "Пакет: 30 генераций",
    };
    addChip(map[appState.selectedPack] || "Пакет выбран");
  }

  // Статус по кредитам
  if (appState.creditsTotal > 0) {
    const left = Math.max(appState.creditsTotal - appState.creditsUsed, 0);
    addChip(`Осталось ${left} из ${appState.creditsTotal}`);
  }

  if (appState.hasActivePack) {
    addChip("Оплачено: генерации доступны");
  } else {
    addChip("Demo: оплата не выполнена");
  }
}

// =========================
// ГЕНЕРАЦИЯ ПОРТРЕТА (REPLICATE /api/generate)
// =========================

async function handleGenerateClick() {
  if (appState.isGenerating) return;

  // Блокировка генерации без оплаты
  if (!appState.hasActivePack || appState.creditsTotal <= 0) {
    alert("Сначала оплатите пакет генераций.");
    openPayModal();
    return;
  }

  const left = appState.creditsTotal - appState.creditsUsed;
  if (left <= 0) {
    alert("У вас закончились генерации. Мы отправим ваши портреты на email.");
    finishSessionAndSendEmail();
    return;
  }

  if (!appState.photoBase64) {
    alert("Сначала добавьте фото.");
    return;
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
    };

    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw new Error("Сервер генерации вернул ошибку.");
    }

    const data = await resp.json();
    if (!data || !data.image) {
      throw new Error("Сервер не вернул ссылку на изображение.");
    }

    const imageUrl = data.image;
    showResultPortrait(imageUrl);
    registerGeneration(imageUrl);
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    alert("Не удалось сгенерировать портрет. Попробуйте ещё раз.");
  } finally {
    showGenerating(false);
    appState.isGenerating = false;
  }
}

function registerGeneration(imageUrl) {
  appState.creditsUsed += 1;
  if (!appState.generatedImages.includes(imageUrl)) {
    appState.generatedImages.push(imageUrl);
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEYS.CREDITS_USED,
      String(appState.creditsUsed)
    );
    window.localStorage.setItem(
      STORAGE_KEYS.GENERATED_IMAGES,
      JSON.stringify(appState.generatedImages)
    );
  } catch (e) {
    console.warn("Cannot store used credits/images", e);
  }

  refreshSelectionChips();

  const left = appState.creditsTotal - appState.creditsUsed;
  if (left <= 0) {
    // кредиты кончились — отправляем все портреты на email
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
  let email = "";

  // 1) Пытаемся взять email из localStorage (как было изначально)
  try {
    email = window.localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || "";
  } catch (e) {
    console.warn("Cannot read user email from localStorage", e);
  }

  // 2) Если в localStorage пусто — пробуем взять из поля согласия (если пользователь только что вводил)
  if (!email && els.agreeEmail && els.agreeEmail.value) {
    email = els.agreeEmail.value.trim();
  }

  // 3) Если всё ещё пусто — спрашиваем через prompt
  if (!email) {
    const entered = window.prompt(
      "Введите email, на который отправить все ваши портреты:"
    );
    if (!entered) {
      alert("Email не указан. Невозможно отправить портреты.");
      return;
    }
    email = entered.trim();
    if (!email) {
      alert("Email не указан. Невозможно отправить портреты.");
      return;
    }

    // Сохраняем, чтобы в следующий раз не спрашивать
    try {
      window.localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
    } catch (e) {
      console.warn("Cannot store user email to localStorage", e);
    }
  }

  if (!appState.generatedImages || appState.generatedImages.length === 0) {
    alert("Нет сгенерированных портретов для отправки.");
    return;
  }

  try {
    const resp = await fetch("/api/send-portraits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        images: appState.generatedImages,
        total: appState.creditsTotal,
        used: appState.creditsUsed,
      }),
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

    // очищаем сессию
    resetSession();
  } catch (err) {
    console.error("SEND EMAIL ERROR:", err);
    alert(
      "Портреты были сгенерированы, но не удалось отправить email. Попробуйте позже или свяжитесь с поддержкой."
    );
  }
}

function resetSession() {
  appState.hasActivePack = false;
  appState.creditsTotal = 0;
  appState.creditsUsed = 0;
  appState.generatedImages = [];

  try {
    window.localStorage.removeItem(STORAGE_KEYS.HAS_ACTIVE_PACK);
    window.localStorage.removeItem(STORAGE_KEYS.CREDITS_TOTAL);
    window.localStorage.removeItem(STORAGE_KEYS.CREDITS_USED);
    window.localStorage.removeItem(STORAGE_KEYS.GENERATED_IMAGES);
    window.localStorage.removeItem(STORAGE_KEYS.PENDING_PACK);
    // email оставляем, чтобы не вводить каждый раз
  } catch (e) {
    console.warn("Cannot clear session storage", e);
  }

  refreshSelectionChips();
}