// Текущий выбранный стиль
let CURRENT_STYLE = "oil";

// Активные эффекты (убрать морщины / омолодить / сгладить кожу)
const ACTIVE_EFFECTS = new Set();

// Карта эффектов -> текст, который подмешиваем в промпт
const EFFECT_PROMPTS = {
  "no-wrinkles": "no wrinkles, soft skin texture, beauty retouch",
  "younger": "look 10 years younger, fresh and rested face",
  "smooth-skin": "smooth, flawless, even skin, subtle beauty lighting"
};

// Выбор основного стиля (oil / anime / poster / classic)
function selectStyle(s) {
  CURRENT_STYLE = s;
  document
    .querySelectorAll(".style-btns button")
    .forEach((b) => b.classList.remove("active"));
  const btn = document.getElementById("btn-" + s);
  if (btn) btn.classList.add("active");
}

// Тоггл эффектов (кнопки с классом .effect-btn и data-effect="no-wrinkles" и т.п.)
function toggleEffect(button) {
  const effect = button.dataset.effect;
  if (!effect) return;

  if (ACTIVE_EFFECTS.has(effect)) {
    ACTIVE_EFFECTS.delete(effect);
    button.classList.remove("active");
  } else {
    ACTIVE_EFFECTS.add(effect);
    button.classList.add("active");
  }
}

// Уменьшаем фото перед отправкой (fix 413)
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 900;
        let w = img.width,
          h = img.height;

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
      img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

// Показываем/скрываем лоадер
function setLoading(isLoading) {
  const result = document.getElementById("result");
  const generateBtn = document.getElementById("generate-btn");
  const loader = document.getElementById("loader");

  if (isLoading) {
    if (result) result.innerHTML = "";
    if (loader) loader.style.display = "block";
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerText = "Генерация...";
    }
  } else {
    if (loader) loader.style.display = "none";
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerText = "Создать портрет";
    }
  }
}

// Главная функция генерации
async function generate() {
  const errorEl = document.getElementById("error");
  const resultEl = document.getElementById("result");
  const downloadLink = document.getElementById("download");
  const extraInput = document.getElementById("extra");
  const fileInput = document.getElementById("photo");

  if (errorEl) errorEl.innerText = "";
  if (resultEl) resultEl.innerHTML = "";
  if (downloadLink) downloadLink.style.display = "none";

  const extraText = extraInput ? extraInput.value.trim() : "";
  const file = fileInput ? fileInput.files[0] : null;

  // Разрешаем:
  //  - фото + (опциональный) текст
  //  - только текст
  //  - только эффекты
  if (!file && !extraText && ACTIVE_EFFECTS.size === 0) {
    if (errorEl) {
      errorEl.innerText = "Добавь фото, текст или выбери хотя бы один эффект.";
    }
    return;
  }

  setLoading(true);

  try {
    let photoData = null;
    if (file) {
      photoData = await resizeImage(file);
    }

    // Собираем текст: пользовательский + эффекты
    const effectsText = Array.from(ACTIVE_EFFECTS)
      .map((key) => EFFECT_PROMPTS[key])
      .filter(Boolean)
      .join(", ");

    let finalText = extraText;
    if (effectsText) {
      if (finalText) {
        finalText = `${finalText}. Also: ${effectsText}`;
      } else {
        finalText = effectsText;
      }
    }

    const payload = {
      style: CURRENT_STYLE,
      text: finalText || null,
      photo: photoData // может быть null → режим "только текст"
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

    if (resultEl) {
      resultEl.innerHTML = `<img src="${data.image}" alt="Результат" />`;
    }

    if (downloadLink) {
      downloadLink.href = data.image;
      downloadLink.download = "windows-to-soul.png";
      downloadLink.style.display = "block";
    }
  } catch (err) {
    if (errorEl) {
      errorEl.innerText = err.message || "Неизвестная ошибка.";
    }
    if (resultEl) resultEl.innerHTML = "";
  } finally {
    setLoading(false);
  }
}

// Если хочешь, можешь повесить обработчики в HTML:
// <button id="generate-btn" onclick="generate()">Создать портрет</button>
// <button class="effect-btn" data-effect="no-wrinkles" onclick="toggleEffect(this)">Убрать морщины</button>
// <button class="effect-btn" data-effect="younger" onclick="toggleEffect(this)">Омолодить</button>
// <button class="effect-btn" data-effect="smooth-skin" onclick="toggleEffect(this)">Сделать кожу гладкой</button>