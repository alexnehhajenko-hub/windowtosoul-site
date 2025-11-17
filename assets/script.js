// YourPhotoAI — основной фронтенд-скрипт
// UI: выбор стиля, эффектов кожи, мимики, поздравлений, пакетов и генерации.
// Оплата: Stripe Checkout через /api/create-checkout-session.
// Дополнительно: обработка кнопки "Назад" на телефоне — закрывает окна/результат,
// а не выкидывает с сайта.

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
// НИЖНИЙ SHEET
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
}// =========================
// ЛИСТЫ: СТИЛЬ, КОЖА, МИМИКА, ПОЗДРАВЛЕНИЯ
// =========================

function openStyleSheet() {
  const options = [
    { value: "beauty", label: "Светлый бьюти-портрет" },
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
    { value: "younger", label: "Моложе" },
    { value: "smooth-skin", label: "Гладкая кожа" }
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
      }
    }))
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
    { value: "eyes-brighter", label: "Ярче глаза" }
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
        closeSheet();
      }
    }))
  });
}

function openGreetingSheet() {
  const options = [
    { value: "new-year", label: "Новый год" },
    { value: "birthday", label: "День рождения" },
    { value: "funny", label: "Смешное" },
    { value: "scary", label: "Страшное" }
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
      }
    }))
  });
}

// =========================
// ПАКЕТЫ И ОПЛАТА STRIPE
// =========================

function openPayModal() {
  els.payBackdrop.style.display = "flex";
  els.payError.textContent = "";
  setLayer("pay", true);
}

function closePayModal(pushHistory = true) {
  els.payBackdrop.style.display = "none";
  if (pushHistory) setLayer("home", true);
}

function selectPack(packKey) {
  appState.selectedPack = packKey;

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
    els.payError.textContent = "Пожалуйста, выберите пакет.";
    return;
  }
  closePayModal(false);
  openAgreementModal();
}

function openAgreementModal() {
  els.agreementBackdrop.style.display = "flex";
  els.agreeError.textContent = "";
  els.agreeCheckbox.checked = false;
  setLayer("agree", true);
}

function closeAgreementModal(pushHistory = true) {
  els.agreementBackdrop.style.display = "none";
  if (pushHistory) setLayer("home", true);
}

function handleAgreePay() {
  const email = els.agreeEmail.value.trim();
  const checked = els.agreeCheckbox.checked;

  if (!email) {
    els.agreeError.textContent = "Введите email.";
    return;
  }
  if (!checked) {
    els.agreeError.textContent = "Нужно подтвердить возраст и согласие.";
    return;
  }

  els.agreeError.textContent = "";
  startStripeCheckout(email);
}

async function startStripeCheckout(email) {
  if (appState.isPaying) return;
  appState.isPaying = true;

  try {
    const resp = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack: appState.selectedPack,
        email
      })
    });

    const data = await resp.json();

    if (!data.sessionId || !data.publishableKey) {
      throw new Error("Неверный ответ сервера.");
    }

    const stripe = window.Stripe(data.publishableKey);
    const { error } = await stripe.redirectToCheckout({
      sessionId: data.sessionId
    });

    if (error) alert("Ошибка оплаты: " + error.message);
  } catch (err) {
    alert("Ошибка при создании оплаты. Попробуйте снова.");
  } finally {
    appState.isPaying = false;
  }
}

function handleStripeStatusFromUrl() {
  try {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");

    if (status === "success") {
      alert("Оплата успешна! 🎉");
    }

    if (status) {
      url.searchParams.delete("status");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());
    }
  } catch (e) {}
}

// =========================
// ЭФФЕКТЫ
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
    "eyes-brighter"
  ];
  appState.selectedEffects = appState.selectedEffects.filter(
    (e) => !mimicKeys.includes(e)
  );
}

// =========================
// ЧИПЫ ВЫБРАННЫХ ОПЦИЙ
// =========================

function refreshSelectionChips() {
  els.selectionRow.innerHTML = "";

  const addChip = (label) => {
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = label;
    els.selectionRow.appendChild(chip);
  };

  const s = appState.selectedStyle;
  if (s) {
    const map = {
      beauty: "Стиль: Бьюти",
      oil: "Стиль: Масло",
      anime: "Стиль: Аниме",
      poster: "Стиль: Постер",
      classic: "Стиль: Классика"
    };
    addChip(map[s] || "Стиль выбран");
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
      "eyes-brighter": "Ярче глаза"
    };
    addChip(map[e] || e);
  });

  if (appState.selectedGreeting) {
    const map = {
      "new-year": "Новый год",
      birthday: "День рождения",
      funny: "Смешное",
      scary: "Страшное"
    };
    addChip(map[appState.selectedGreeting]);
  }

  if (appState.selectedPack) {
    const map = {
      pack10: "Пакет: 10",
      pack20: "Пакет: 20",
      pack30: "Пакет: 30"
    };
    addChip(map[appState.selectedPack]);
  }
}

// =========================
// ГЕНЕРАЦИЯ ПОРТРЕТА
// =========================

async function handleGenerateClick() {
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
      greeting: appState.selectedGreeting
    };

    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (!data.image) {
      throw new Error("Нет ссылки на фото.");
    }

    showResultPortrait(data.image);
  } catch (e) {
    alert("Ошибка генерации. Попробуйте ещё раз.");
  }

  showGenerating(false);
  appState.isGenerating = false;
}

function showGenerating(v) {
  els.generateStatus.style.display = v ? "flex" : "none";
}

function showResultPortrait(url) {
  els.previewImage.src = url;
  els.previewImage.style.display = "block";
  els.previewPlaceholder.style.display = "none";

  els.downloadLink.href = url;
  els.downloadLink.style.display = "inline-flex";

  document.body.classList.add("result-mode");
  setLayer("result", true);
}

function exitResultView(pushHistory = true) {
  document.body.classList.remove("result-mode");
  if (pushHistory) setLayer("home", true);
}
