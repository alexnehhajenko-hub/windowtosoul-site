// WindowToSoul — основной фронтенд-скрипт
// UI: стиль, кожа, мимика, поздравления, пакеты, согласие, генерация
// + мягкая обработка кнопки «Назад»

// ======================= КОНСТАНТЫ =======================

// Стиль портрета
const PORTRAIT_STYLES = [
  "Classic Portrait",
  "Oil Painting",
  "Cute Soft",
  "Anime",
  "Scary Dark",
  "Futuristic / Cyber"
];

const STYLE_CODE_MAP = {
  "Classic Portrait": "classic",
  "Oil Painting": "oil",
  "Cute Soft": "beauty",
  "Anime": "anime",
  "Scary Dark": "poster",
  "Futuristic / Cyber": "poster"
};

// Эффекты кожи
const SKIN_EFFECTS = [
  "Smooth Skin",
  "Remove Wrinkles",
  "Bright Face",
  "Extra Glow",
  "Warm Tone"
];

const SKIN_PROMPTS = {
  "Smooth Skin": "smooth, even, soft skin",
  "Remove Wrinkles": "less visible wrinkles, subtle anti-age retouch",
  "Bright Face": "bright, well-lit face, gentle glow",
  "Extra Glow": "strong glow, beauty lighting, glossy skin look",
  "Warm Tone": "warm skin tone, golden light"
};

// Мимика
const MIMIC_OPTIONS = [
  "Soft Smile",
  "Big Smile",
  "Neutral",
  "Serious",
  "Surprise"
];

const MIMIC_PROMPTS = {
  "Soft Smile": "soft gentle smile",
  "Big Smile": "big open smile, joyful expression",
  "Neutral": "neutral expression, calm face",
  "Serious": "serious expression, focused look",
  "Surprise": "slight surprise, open eyes"
};

// Поздравления (английский текст — только как оверлей)
const GREETINGS = {
  newYear: [
    "Happy New Year!",
    "Merry Christmas!",
    "Happy Holidays!",
    "New Year, New You",
    "Shine in the New Year",
    "Magic New Year Portrait"
  ],
  birthday: [
    "Happy Birthday!",
    "Birthday Magic",
    "Birthday Portrait Just for You",
    "Another Year of You",
    "Make a Wish"
  ],
  love: [
    "With Love",
    "You Are My Universe",
    "Made for You",
    "From My Heart to Yours",
    "You Are My Favorite Story"
  ],
  funny: [
    "Too Cute to Be Real",
    "AI Made Me Like This",
    "Glow Up Mode: ON",
    "New Face, Same Soul",
    "100% Digital Drama"
  ],
  creepy: [
    "Sweet Dreams… or Not",
    "Welcome to the Other Side",
    "Beautifully Haunted",
    "Born in the Shadows",
    "Do You Dare to Look?"
  ]
};

const GREETING_CATEGORY_LABELS = {
  newYear: "New Year / Christmas",
  birthday: "Birthday",
  love: "Love / Romantic",
  funny: "Funny / Cute",
  creepy: "Creepy / Scary"
};

// ======================= СОСТОЯНИЕ =======================

const state = {
  styleName: null,
  skinEffect: null,
  mimic: null,
  greetingCategory: null,
  greetingText: null,
  photoFile: null,
  hasPhoto: false
};

let selectedPackageId = "p10";
let hasGeneratingLayout = false;

// ======================= DOM ЭЛЕМЕНТЫ =======================

// preview
const previewImage = document.getElementById("previewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const greetingOverlay = document.getElementById("greetingOverlay");

// выборы
const selectionRow = document.getElementById("selectionRow");

// главные кнопки
const btnStyle = document.getElementById("btnStyle");
const btnSkin = document.getElementById("btnSkin");
const btnMimic = document.getElementById("btnMimic");
const btnGreetings = document.getElementById("btnGreetings");
const btnGenerate = document.getElementById("btnGenerate");
const btnAddPhoto = document.getElementById("btnAddPhoto");
const btnPay = document.getElementById("btnPay");
const fileInput = document.getElementById("fileInput");

// sheet
const sheetBackdrop = document.getElementById("sheetBackdrop");
const sheet = document.querySelector(".sheet");
const sheetTitle = document.getElementById("sheetTitle");
const sheetDescription = document.getElementById("sheetDescription");
const sheetOptionsRow = document.getElementById("sheetOptionsRow");
const sheetCategoryRow = document.getElementById("sheetCategoryRow");
const sheetCategoryTitle = document.getElementById("sheetCategoryTitle");
const sheetOptionsTitle = document.getElementById("sheetOptionsTitle");
const sheetCloseBtn = document.getElementById("sheetCloseBtn");

// генерация
const generateStatus = document.getElementById("generateStatus");
const downloadLink = document.getElementById("downloadLink");

// pay modal
const payBackdrop = document.getElementById("payBackdrop");
const payCloseBtn = document.getElementById("payCloseBtn");
const payError = document.getElementById("payError");
const payNextBtn = document.getElementById("payNextBtn");
const packageButtons = document.querySelectorAll(".pay-package");

// agreement modal
const agreementBackdrop = document.getElementById("agreementBackdrop");
const agreementCloseBtn = document.getElementById("agreementCloseBtn");
const agreeEmailInput = document.getElementById("agreeEmail");
const agreeCheckbox = document.getElementById("agreeCheckbox");
const agreeError = document.getElementById("agreeError");
const agreePayBtn = document.getElementById("agreePayBtn");

// ======================= ВСПОМОГАТЕЛЬНЫЕ UI =======================

function updateSelectionPills() {
  if (!selectionRow) return;
  selectionRow.innerHTML = "";

  if (state.styleName) {
    const pill = document.createElement("div");
    pill.className = "selection-pill";
    pill.textContent = `Стиль: ${state.styleName}`;
    selectionRow.appendChild(pill);
  }

  if (state.skinEffect) {
    const pill = document.createElement("div");
    pill.className = "selection-pill";
    pill.textContent = `Кожа: ${state.skinEffect}`;
    selectionRow.appendChild(pill);
  }

  if (state.mimic) {
    const pill = document.createElement("div");
    pill.className = "selection-pill";
    pill.textContent = `Мимика: ${state.mimic}`;
    selectionRow.appendChild(pill);
  }

  if (state.greetingText) {
    const pill = document.createElement("div");
    pill.className = "selection-pill";
    pill.textContent = `Текст: "${state.greetingText}"`;
    selectionRow.appendChild(pill);
  }
}

function updateGreetingOverlay() {
  if (!greetingOverlay) return;
  if (state.greetingText) {
    greetingOverlay.textContent = state.greetingText;
    greetingOverlay.classList.add("visible");
  } else {
    greetingOverlay.textContent = "";
    greetingOverlay.classList.remove("visible");
  }
}

// ----------------- SHEET (общий) -----------------

function clearSheet() {
  if (sheetOptionsRow) sheetOptionsRow.innerHTML = "";
  if (sheetCategoryRow) sheetCategoryRow.innerHTML = "";
  if (sheetCategoryTitle) sheetCategoryTitle.style.display = "none";
  if (sheetCategoryRow) sheetCategoryRow.style.display = "none";
  if (sheetOptionsTitle) sheetOptionsTitle.textContent = "Варианты";
}

function showSheet() {
  if (!sheetBackdrop || !sheet) return;
  sheetBackdrop.classList.add("visible");
  history.pushState({ wtsOverlay: "sheet" }, "");
}

function hideSheet(fromHistory = false) {
  if (!sheetBackdrop || !sheet) return;
  sheetBackdrop.classList.remove("visible");
  if (!fromHistory) history.back();
}

function isSheetOpen() {
  return sheetBackdrop && sheetBackdrop.classList.contains("visible");
}

// ----------------- SHEET: стиль -----------------

function openStyleSheet() {
  clearSheet();
  if (sheetTitle) sheetTitle.textContent = "Стиль портрета";
  if (sheetDescription) {
    sheetDescription.textContent =
      "Выберите, как будет выглядеть общий художественный стиль.";
  }

  PORTRAIT_STYLES.forEach((name) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = name;
    if (state.styleName === name) chip.classList.add("selected");
    chip.addEventListener("click", () => {
      state.styleName = name;
      updateSelectionPills();
      hideSheet();
    });
    sheetOptionsRow.appendChild(chip);
  });

  showSheet();
}

// ----------------- SHEET: кожа -----------------

function openSkinSheet() {
  clearSheet();
  if (sheetTitle) sheetTitle.textContent = "Эффект кожи";
  if (sheetDescription) {
    sheetDescription.textContent =
      "Выберите улучшение кожи. Оно добавится в запрос к ИИ.";
  }

  SKIN_EFFECTS.forEach((name) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = name;
    if (state.skinEffect === name) chip.classList.add("selected");
    chip.addEventListener("click", () => {
      state.skinEffect = name;
      updateSelectionPills();
      hideSheet();
    });
    sheetOptionsRow.appendChild(chip);
  });

  showSheet();
}

// ----------------- SHEET: мимика -----------------

function openMimicSheet() {
  clearSheet();
  if (sheetTitle) sheetTitle.textContent = "Мимика";
  if (sheetDescription) {
    sheetDescription.textContent = "Выберите выражение лица.";
  }

  MIMIC_OPTIONS.forEach((name) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = name;
    if (state.mimic === name) chip.classList.add("selected");
    chip.addEventListener("click", () => {
      state.mimic = name;
      updateSelectionPills();
      hideSheet();
    });
    sheetOptionsRow.appendChild(chip);
  });

  showSheet();
}

// ----------------- SHEET: поздравления -----------------

function renderGreetingOptions(categoryKey) {
  if (!sheetOptionsRow) return;
  sheetOptionsRow.innerHTML = "";
  const list = GREETINGS[categoryKey] || [];

  list.forEach((text) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = text;
    if (state.greetingText === text) chip.classList.add("selected");
    chip.addEventListener("click", () => {
      state.greetingCategory = categoryKey;
      state.greetingText = text;
      updateSelectionPills();
      updateGreetingOverlay();
      hideSheet();
    });
    sheetOptionsRow.appendChild(chip);
  });
}

function openGreetingsSheet() {
  clearSheet();
  if (sheetTitle) sheetTitle.textContent = "Поздравления";
  if (sheetDescription) {
    sheetDescription.textContent =
      "Сначала выберите категорию, затем английскую фразу. Текст появится поверх портрета.";
  }

  if (sheetCategoryTitle) sheetCategoryTitle.style.display = "block";
  if (sheetCategoryRow) {
    sheetCategoryRow.style.display = "flex";

    Object.keys(GREETINGS).forEach((key) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip chip-category";
      chip.textContent = GREETING_CATEGORY_LABELS[key] || key;
      if (state.greetingCategory === key) chip.classList.add("selected");
      chip.addEventListener("click", () => {
        state.greetingCategory = key;
        Array.from(sheetCategoryRow.children).forEach((el) =>
          el.classList.remove("selected")
        );
        chip.classList.add("selected");
        renderGreetingOptions(key);
      });
      sheetCategoryRow.appendChild(chip);
    });
  }

  if (sheetOptionsTitle) sheetOptionsTitle.textContent = "Тексты";

  if (state.greetingCategory) {
    renderGreetingOptions(state.greetingCategory);
  }

  showSheet();
}

// ======================= ФОТО =======================

if (btnAddPhoto && fileInput) {
  btnAddPhoto.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    const file =
      e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    if (!file) return;
    state.photoFile = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (!previewImage || !previewPlaceholder) return;
      previewImage.src = ev.target.result;
      previewImage.style.display = "block";
      previewPlaceholder.style.display = "none";
      state.hasPhoto = true;
    };
    reader.readAsDataURL(file);
  });
}

// уменьшение фото (fix 413)
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 900;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxSide) {
          h = (h * maxSide) / w;
          w = maxSide;
        } else if (h > maxSide) {
          w = (w * maxSide) / h;
          h = maxSide;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ======================= ГЕНЕРАЦИЯ =======================

function enterGeneratingLayout() {
  if (hasGeneratingLayout) return;
  document.body.classList.add("app-generating");
  hasGeneratingLayout = true;
}

function setLoading(isLoading) {
  if (!generateStatus || !btnGenerate) return;
  if (isLoading) {
    generateStatus.classList.add("visible");
    btnGenerate.disabled = true;
    btnGenerate.innerText = "Генерация...";
  } else {
    generateStatus.classList.remove("visible");
    btnGenerate.disabled = false;
    btnGenerate.innerText = "Генерировать";
  }
}

async function generatePortrait() {
  if (!state.photoFile) {
    alert("Сначала добавьте фото.");
    return;
  }

  enterGeneratingLayout();

  const styleName = state.styleName || "Classic Portrait";
  const styleCode = STYLE_CODE_MAP[styleName] || "classic";

  const parts = [];
  if (state.skinEffect && SKIN_PROMPTS[state.skinEffect]) {
    parts.push(SKIN_PROMPTS[state.skinEffect]);
  }
  if (state.mimic && MIMIC_PROMPTS[state.mimic]) {
    parts.push(MIMIC_PROMPTS[state.mimic]);
  }
  if (!parts.length) {
    parts.push("high quality portrait, detailed face");
  }

  const finalText = parts.join(", ");

  setLoading(true);
  if (downloadLink) downloadLink.style.display = "none";

  try {
    const photoData = await resizeImage(state.photoFile);

    const payload = {
      style: styleCode,
      text: finalText || null,
      photo: photoData
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Сервер вернул некорректный ответ.");
    }

    if (!res.ok) {
      throw new Error(data.error || "Ошибка генерации.");
    }

    if (!data.image) {
      throw new Error("Ответ без изображения.");
    }

    if (previewImage && previewPlaceholder) {
      previewImage.src = data.image;
      previewImage.style.display = "block";
      previewPlaceholder.style.display = "none";
    }

    if (downloadLink) {
      downloadLink.href = data.image;
      downloadLink.style.display = "inline-flex";
    }
  } catch (err) {
    console.error(err);
    alert(err.message || "Ошибка генерации портрета.");
  } finally {
    setLoading(false);
  }
}

// ======================= ПАКЕТЫ =======================

function updatePackageSelectionUI() {
  packageButtons.forEach((btn) => {
    const pkg = btn.dataset.package;
    if (pkg === selectedPackageId) btn.classList.add("selected");
    else btn.classList.remove("selected");
  });
}

function openPayModal() {
  if (!payBackdrop) return;
  if (payError) payError.textContent = "";
  updatePackageSelectionUI();
  payBackdrop.classList.add("visible");
  history.pushState({ wtsOverlay: "pay" }, "");
}

function closePayModal(fromHistory = false) {
  if (!payBackdrop) return;
  payBackdrop.classList.remove("visible");
  if (!fromHistory) history.back();
}

function isPayOpen() {
  return payBackdrop && payBackdrop.classList.contains("visible");
}

packageButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedPackageId = btn.dataset.package;
    updatePackageSelectionUI();
  });
});

function goToAgreementModal() {
  if (!selectedPackageId) {
    if (payError) payError.textContent = "Выберите пакет.";
    return;
  }
  if (payError) payError.textContent = "";
  closePayModal();
  openAgreementModal();
}

// ======================= СОГЛАСИЕ + EMAIL =======================

function openAgreementModal() {
  if (!agreementBackdrop) return;
  if (agreeError) agreeError.textContent = "";
  agreementBackdrop.classList.add("visible");
  history.pushState({ wtsOverlay: "agreement" }, "");
}

function closeAgreementModal(fromHistory = false) {
  if (!agreementBackdrop) return;
  agreementBackdrop.classList.remove("visible");
  if (!fromHistory) history.back();
}

function isAgreementOpen() {
  return (
    agreementBackdrop && agreementBackdrop.classList.contains("visible")
  );
}

async function startCheckout() {
  if (!agreeEmailInput || !agreeCheckbox || !agreeError || !agreePayBtn) return;

  agreeError.textContent = "";

  const email = (agreeEmailInput.value || "").trim();
  const agreed = agreeCheckbox.checked;

  if (!email) {
    agreeError.textContent = "Введите email.";
    return;
  }
  if (!agreed) {
    agreeError.textContent = "Подтвердите возраст и согласие с условиями.";
    return;
  }
  if (!selectedPackageId) {
    agreeError.textContent = "Выберите пакет генераций.";
    return;
  }

  agreePayBtn.disabled = true;
  agreePayBtn.textContent = "Создание оплаты...";

  try {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        packageId: selectedPackageId
      })
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Некорректный ответ сервера оплаты.");
    }

    if (!res.ok) {
      throw new Error(data.error || "Не удалось создать сессию оплаты.");
    }
    if (!data.url) {
      throw new Error("Сервер не вернул ссылку оплаты.");
    }

    window.location.href = data.url;
  } catch (err) {
    console.error(err);
    agreeError.textContent = err.message || "Ошибка при создании оплаты.";
  } finally {
    agreePayBtn.disabled = false;
    agreePayBtn.textContent = "Перейти к оплате";
  }
}

// ======================= BACK BUTTON =======================

(function initHistoryBase() {
  if (!window.history || !window.history.replaceState) return;
  try {
    window.history.replaceState({ wtsBase: true }, "", window.location.href);
  } catch {}
})();

window.addEventListener("popstate", () => {
  const anyOverlayOpen = isSheetOpen() || isPayOpen() || isAgreementOpen();
  if (anyOverlayOpen) {
    if (isSheetOpen()) hideSheet(true);
    if (isPayOpen()) closePayModal(true);
    if (isAgreementOpen()) closeAgreementModal(true);
    try {
      window.history.replaceState({ wtsBase: true }, "", window.location.href);
    } catch {}
  }
});

// ======================= LISTENERS =======================

if (btnStyle) btnStyle.addEventListener("click", openStyleSheet);
if (btnSkin) btnSkin.addEventListener("click", openSkinSheet);
if (btnMimic) btnMimic.addEventListener("click", openMimicSheet);
if (btnGreetings) btnGreetings.addEventListener("click", openGreetingsSheet);
if (btnGenerate) btnGenerate.addEventListener("click", generatePortrait);

if (sheetCloseBtn) sheetCloseBtn.addEventListener("click", () => hideSheet());
if (sheetBackdrop) {
  sheetBackdrop.addEventListener("click", (e) => {
    if (e.target === sheetBackdrop) hideSheet();
  });
}

if (btnPay) btnPay.addEventListener("click", openPayModal);
if (payCloseBtn) payCloseBtn.addEventListener("click", () => closePayModal());
if (payBackdrop) {
  payBackdrop.addEventListener("click", (e) => {
    if (e.target === payBackdrop) closePayModal();
  });
}
if (payNextBtn) payNextBtn.addEventListener("click", goToAgreementModal);

if (agreementCloseBtn)
  agreementCloseBtn.addEventListener("click", () =>
    closeAgreementModal()
  );
if (agreementBackdrop) {
  agreementBackdrop.addEventListener("click", (e) => {
    if (e.target === agreementBackdrop) closeAgreementModal();
  });
}
if (agreePayBtn) agreePayBtn.addEventListener("click", startCheckout);

// старт
updateSelectionPills();
updateGreetingOverlay();
updatePackageSelectionUI();
console.log("WindowToSoul script.js loaded");