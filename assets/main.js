// -------------------- НАСТРОЙКИ И ДАННЫЕ --------------------

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
  "Cute Soft": "classic",
  "Anime": "anime",
  "Scary Dark": "poster",
  "Futuristic / Cyber": "poster"
};

const SKIN_EFFECTS = [
  "Smooth Skin",
  "Remove Wrinkles",
  "Bright Face",
  "Extra Glow",
  "Warm Tone"
];

const MIMIC_OPTIONS = [
  "Soft Smile",
  "Big Smile",
  "Neutral",
  "Serious",
  "Surprise"
];

const SKIN_PROMPTS = {
  "Smooth Skin": "smooth, even, soft skin",
  "Remove Wrinkles": "less visible wrinkles, subtle anti-age retouch",
  "Bright Face": "bright, well-lit face, gentle glow",
  "Extra Glow": "strong glow, beauty lighting, glossy skin look",
  "Warm Tone": "warm skin tone, golden light"
};

const MIMIC_PROMPTS = {
  "Soft Smile": "soft gentle smile",
  "Big Smile": "big open smile, joyful expression",
  "Neutral": "neutral expression, calm face",
  "Serious": "serious expression, focused look",
  "Surprise": "slight surprise, open eyes"
};

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
  love: "Love",
  funny: "Funny / Cute",
  creepy: "Creepy / Scary"
};

// -------------------- СОСТОЯНИЕ --------------------

const state = {
  styleName: null,
  skinEffect: null,
  mimic: null,
  greetingCategory: null,
  greetingText: null,
  hasPhoto: false,
  photoFile: null
};

// -------------------- DOM --------------------

const previewImage = document.getElementById("previewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const greetingOverlay = document.getElementById("greetingOverlay");
const selectionRow = document.getElementById("selectionRow");

const btnStyle = document.getElementById("btnStyle");
const btnSkin = document.getElementById("btnSkin");
const btnMimic = document.getElementById("btnMimic");
const btnGreetings = document.getElementById("btnGreetings");
const btnGenerate = document.getElementById("btnGenerate");
const btnAddPhoto = document.getElementById("btnAddPhoto");
const btnPay = document.getElementById("btnPay");
const fileInput = document.getElementById("fileInput");

const sheetBackdrop = document.getElementById("sheetBackdrop");
const sheetTitle = document.getElementById("sheetTitle");
const sheetDescription = document.getElementById("sheetDescription");
const sheetCloseBtn = document.getElementById("sheetCloseBtn");
const sheetCategoryTitle = document.getElementById("sheetCategoryTitle");
const sheetCategoryRow = document.getElementById("sheetCategoryRow");
const sheetOptionsTitle = document.getElementById("sheetOptionsTitle");
const sheetOptionsRow = document.getElementById("sheetOptionsRow");

const generateStatus = document.getElementById("generateStatus");

// -------------------- UI --------------------

function updateSelectionPills() {
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
  if (state.greetingText) {
    greetingOverlay.textContent = state.greetingText;
    greetingOverlay.classList.add("visible");
  } else {
    greetingOverlay.textContent = "";
    greetingOverlay.classList.remove("visible");
  }
}

function showSheet() {
  sheetBackdrop.classList.add("visible");
}

function hideSheet() {
  sheetBackdrop.classList.remove("visible");
}

function clearSheet() {
  sheetCategoryRow.innerHTML = "";
  sheetOptionsRow.innerHTML = "";
  sheetCategoryTitle.style.display = "none";
  sheetCategoryRow.style.display = "none";
  sheetOptionsTitle.textContent = "Варианты";
}

// -------------------- ПАНЕЛИ --------------------

function openStyleSheet() {
  clearSheet();
  sheetTitle.textContent = "Стиль портрета";
  sheetDescription.textContent = "Выберите, как будет выглядеть общий стиль портрета.";

  PORTRAIT_STYLES.forEach((name) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = name;
    if (state.styleName === name) chip.classList.add("selected");
    chip.addEventListener("click", () => {
      state.styleName = name;
      hideSheet();
      updateSelectionPills();
    });
    sheetOptionsRow.appendChild(chip);
  });

  showSheet();
}

function openSkinSheet() {
  clearSheet();
  sheetTitle.textContent = "Эффект кожи";
  sheetDescription.textContent = "Выберите улучшение кожи (подмешивается в промпт).";

  SKIN_EFFECTS.forEach((name) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = name;
    if (state.skinEffect === name) chip.classList.add("selected");
    chip.addEventListener("click", () => {
      state.skinEffect = name;
      hideSheet();
      updateSelectionPills();
    });
    sheetOptionsRow.appendChild(chip);
  });

  showSheet();
}

function openMimicSheet() {
  clearSheet();
  sheetTitle.textContent = "Мимика";
  sheetDescription.textContent = "Выберите эмоциональное выражение лица.";

  MIMIC_OPTIONS.forEach((name) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = name;
    if (state.mimic === name) chip.classList.add("selected");
    chip.addEventListener("click", () => {
      state.mimic = name;
      hideSheet();
      updateSelectionPills();
    });
    sheetOptionsRow.appendChild(chip);
  });

  showSheet();
}

function renderGreetingOptions(categoryKey) {
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
      hideSheet();
      updateSelectionPills();
      updateGreetingOverlay();
    });
    sheetOptionsRow.appendChild(chip);
  });
}

function openGreetingsSheet() {
  clearSheet();
  sheetTitle.textContent = "Поздравления";
  sheetDescription.textContent = "Выберите категорию и текст. Текст будет поверх портрета.";

  sheetCategoryTitle.style.display = "block";
  sheetCategoryRow.style.display = "flex";
  sheetCategoryRow.innerHTML = "";

  Object.keys(GREETINGS).forEach((key) => {
    const catChip = document.createElement("button");
    catChip.type = "button";
    catChip.className = "chip chip-category";
    catChip.textContent = GREETING_CATEGORY_LABELS[key] || key;
    if (state.greetingCategory === key) catChip.classList.add("selected");
    catChip.addEventListener("click", () => {
      state.greetingCategory = key;
      Array.from(sheetCategoryRow.children).forEach((el) =>
        el.classList.remove("selected")
      );
      catChip.classList.add("selected");
      renderGreetingOptions(key);
    });
    sheetCategoryRow.appendChild(catChip);
  });

  sheetOptionsTitle.textContent = "Тексты";

  if (state.greetingCategory && GREETINGS[state.greetingCategory]) {
    renderGreetingOptions(state.greetingCategory);
  }

  showSheet();
}

// -------------------- ФОТО --------------------

btnAddPhoto.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  state.photoFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    previewImage.style.display = "block";
    previewPlaceholder.style.display = "none";
    state.hasPhoto = true;
  };
  reader.readAsDataURL(file);
});

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
          h = h * (maxSide / w);
          w = maxSide;
        } else if (h > maxSide) {
          w = w * (maxSide / h);
          h = maxSide;
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () =>
        reject(new Error("Не удалось загрузить изображение"));
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

// -------------------- ЛОАДЕР --------------------

function setLoading(isLoading) {
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

// -------------------- ГЕНЕРАЦИЯ --------------------

async function generatePortrait() {
  if (!state.hasPhoto || !state.photoFile) {
    alert("Сначала добавьте фото, затем выберите эффекты и запустите генерацию.");
    return;
  }

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

    previewImage.src = data.image;
    previewImage.style.display = "block";
    previewPlaceholder.style.display = "none";
  } catch (err) {
    console.error(err);
    alert(err.message || "Ошибка генерации портрета.");
  } finally {
    setLoading(false);
  }
}

// -------------------- ОПЛАТА (ПОКА ЗАГЛУШКА) --------------------

btnPay.addEventListener("click", () => {
  alert(
    "Здесь будет окно с согласием (16+, условия, возвраты) и переход к оплате.\n" +
      "Платёж подключим позже."
  );
});

// -------------------- ПОДПИСКА НА СОБЫТИЯ --------------------

btnStyle.addEventListener("click", openStyleSheet);
btnSkin.addEventListener("click", openSkinSheet);
btnMimic.addEventListener("click", openMimicSheet);
btnGreetings.addEventListener("click", openGreetingsSheet);
btnGenerate.addEventListener("click", generatePortrait);

sheetCloseBtn.addEventListener("click", hideSheet);
sheetBackdrop.addEventListener("click", (event) => {
  if (event.target === sheetBackdrop) hideSheet();
});

updateSelectionPills();
updateGreetingOverlay();