// WindowToSoul — основной фронтенд-скрипт
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
  layer: "home" // 'home' | 'sheet' | 'result'
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

  // Кнопка скачивания результата (если есть в верстке)
  els.downloadButton = document.getElementById("btnDownloadPortrait") ||
    document.querySelector("[data-download-portrait]");
}

// =========================
// ИНИЦИАЛИЗАЦИЯ
// =========================

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  attachMainHandlers();
  setupBackButtonLogic();
  refreshSelectionChips();
});

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

  window.addEventListener("popstate", (event) => {
    const layer = event.state && event.state.layer ? event.state.layer : "home";

    // Если открыт sheet — просто закрываем его и остаёмся на сайте
    if (appState.layer === "sheet") {
      closeSheet(false); // false — не пушим ещё одно состояние
      setLayer("home", false);
      return;
    }

    // Если открыт полноэкранный результат — возвращаемся к основному экрану
    if (appState.layer === "result") {
      exitResultView(false);
      setLayer("home", false);
      return;
    }

    // Если уже на home — позволяем браузеру идти дальше назад (нормальное поведение)
    appState.layer = layer;
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
  if (els.btnPay) {
    els.btnPay.addEventListener("click", () => openPackagesSheet());
  }
  if (els.sheetCloseBtn) {
    els.sheetCloseBtn.addEventListener("click", () => {
      closeSheet();
    });
  }
  if (els.downloadButton) {
    els.downloadButton.addEventListener("click", () => downloadCurrentPortrait());
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

  els.sheetBackdrop.classList.add("sheet-visible");
  setLayer("sheet", true);
}

function closeSheet(pushHistory = true) {
  if (!els.sheetBackdrop) return;
  els.sheetBackdrop.classList.remove("sheet-visible");
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
        // не закрываем сразу, чтобы можно было выбрать несколько
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
        // логика: одна мимика за раз
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

function openPackagesSheet() {
  const options = [
    { value: "pack10", label: "10 генераций • €4.99" },
    { value: "pack20", label: "20 генераций • €8.99" },
    { value: "pack30", label: "30 генераций • €11.99" }
  ];

  openSheet({
    title: "Выберите пакет",
    description: "Оплата через Stripe. После каждой генерации портрет сохраняется.",
    options: options.map((opt) => ({
      ...opt,
      selected: appState.selectedPack === opt.value,
      onClick: async (value) => {
        appState.selectedPack = value;
        refreshSelectionChips();
        // сразу запускаем оплату
        await startStripeCheckout();
      }
    }))
  });
}

async function startStripeCheckout() {
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
        pack: appState.selectedPack
      })
    });

    if (!resp.ok) {
      throw new Error("Сервер оплаты вернул ошибку.");
    }

    const data = await resp.json();
    if (!data || !data.sessionId || !data.publishableKey) {
      throw new Error("Неверный ответ от сервера оплаты.");
    }

    closeSheet();

    const stripe = window.Stripe
      ? window.Stripe(data.publishableKey)
      : null;

    if (!stripe) {
      alert(
        "Stripe.js не найден. Убедитесь, что в index.html подключен <script src=\"https://js.stripe.com/v3/\"></script>."
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
    "eyes-brighter"
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
      classic: "Стиль: Классика"
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
      "eyes-brighter": "Ярче глаза"
    };
    addChip(map[e] || e);
  });

  if (appState.selectedGreeting) {
    const map = {
      "new-year": "Поздравление: Новый год",
      birthday: "Поздравление: День рождения",
      funny: "Поздравление: Смешное",
      scary: "Поздравление: Страшное"
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
}

// =========================
// ГЕНЕРАЦИЯ ПОРТРЕТА (REPLICATE /api/generate)
// =========================

async function handleGenerateClick() {
  if (appState.isGenerating) return;

  if (!appState.photoBase64) {
    alert("Сначала добавьте фото.");
    return;
  }

  appState.isGenerating = true;
  showGenerating(true);

  try {
    const payload = {
      style: appState.selectedStyle || "beauty",
      text: "", // текст не используем пока
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

    showResultPortrait(data.image);
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    alert("Не удалось сгенерировать портрет. Попробуйте ещё раз.");
  } finally {
    showGenerating(false);
    appState.isGenerating = false;
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

  // Входим в полноэкранный "режим результата" (как на твоём скрине)
  document.body.classList.add("result-mode");
  setLayer("result", true);
}

function exitResultView(pushHistory = true) {
  document.body.classList.remove("result-mode");
  if (pushHistory) setLayer("home", true);
}

function downloadCurrentPortrait() {
  if (!els.previewImage || !els.previewImage.src) return;

  const a = document.createElement("a");
  a.href = els.previewImage.src;
  a.download = "windowtosoul-portrait.jpg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}