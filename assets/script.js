// assets/script.js
//
// Главный фронтовый скрипт YourPhotoAI / WindowToSoul.
//
// Работает с:
//   - /api/generate        — генерация портрета
//   - /api/send-portraits  — отправка всех портретов на email
//
// Основные функции:
//   - уменьшение загруженного фото;
//   - сбор настроек (стиль, эффекты кожи, мимика, поздравление);
//   - генерация портрета и показ результата;
//   - учёт сессии: сколько генераций доступно и сколько осталось;
//   - сохранение всех URL картинок в SessionState.images;
//   - автоматическая отправка всех портретов на email после окончания пакета;
//   - ручная отправка по кнопке "Завершить сессию".
//
// Скрипт написан так, чтобы НЕ падать, если каких-то элементов нет
// (тогда просто пропускает соответствующую функцию).

// ========================== НАСТРОЙКИ ===========================

// Сколько генераций в демо-пакете, если нет данных от Stripe / activate-pack.
const DEFAULT_DEMO_CREDITS = 30;

// Пока настраиваем проект — НЕ блокировать генерацию по лимиту.
// Когда включишь оплату и реальные пакеты — можно поставить false.
const IGNORE_CREDITS_LIMIT = true;

// Стиль по умолчанию
let CURRENT_STYLE = "beauty"; // beauty / oil / anime / poster / classic

// Активные эффекты (кожа, мимика и т.п.)
const ACTIVE_EFFECTS = new Set();

// Текущее поздравление (new-year, birthday, funny, scary, и т.п.)
let CURRENT_GREETING = null;

// ======================== СОСТОЯНИЕ СЕССИИ ======================

const SessionState = {
  email: "",            // email пользователя
  packCode: "demo",     // demo / pack10 / pack20 / pack30
  creditsTotal: DEFAULT_DEMO_CREDITS,
  creditsLeft: DEFAULT_DEMO_CREDITS,
  images: [],           // массив URL всех сгенерированных портретов

  setEmail(value) {
    this.email = (value || "").trim();
    updateSessionBadges();
  },

  setPack(pack, totalCredits) {
    this.packCode = pack || "demo";

    const cleanTotal =
      Number.isFinite(totalCredits) && totalCredits > 0
        ? totalCredits
        : DEFAULT_DEMO_CREDITS;

    this.creditsTotal = cleanTotal;
    this.creditsLeft = cleanTotal;
    updateSessionBadges();
  },

  addImage(url) {
    if (!url) return;
    this.images.push(url);

    if (Number.isFinite(this.creditsLeft) && this.creditsLeft > 0) {
      this.creditsLeft -= 1;
    }
    updateSessionBadges();
  },

  isFinished() {
    return (
      Number.isFinite(this.creditsLeft) &&
      this.creditsLeft <= 0 &&
      this.images.length > 0
    );
  }
};

// Делаем состояние доступным из консоли / других скриптов
window.SessionState = SessionState;

// ===================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================

// Аккуратный поиск элемента по id
function $(id) {
  return document.getElementById(id);
}

// Обновление чипов / состояния UI по пакету и email
function updateSessionBadges() {
  const packChip = $("chip-pack");
  if (packChip) {
    const t = SessionState.creditsTotal;
    const l = SessionState.creditsLeft;
    if (!Number.isFinite(t)) {
      packChip.textContent = "Пакет: без лимита";
    } else {
      packChip.textContent = `Пакет: ${l}/${t} генераций`;
    }
  }

  const demoChip = $("chip-demo");
  if (demoChip) {
    if (SessionState.packCode === "demo") {
      demoChip.textContent = "Demo: оплата не выполнена";
    } else {
      demoChip.textContent = "Пакет активен";
    }
  }

  const emailChip = $("chip-email");
  if (emailChip) {
    emailChip.textContent = SessionState.email
      ? `Email: ${SessionState.email}`
      : "Email: не указан";
  }
}

// Уменьшение фото до ~1024px
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (e) => {
      img.onload = () => {
        const maxSide = 1024;
        let w = img.width;
        let h = img.height;

        if (w > h && w > maxSide) {
          h = Math.round((h * maxSide) / w);
          w = maxSide;
        } else if (h >= w && h > maxSide) {
          w = Math.round((w * maxSide) / h);
          h = maxSide;
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        try {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ================== ОТПРАВКА ВСЕХ ПОРТРЕТОВ НА EMAIL ============

async function sendSessionToEmail() {
  // Берём email из инпута, если он есть
  const emailInput = $("user-email");
  const emailFromInput = emailInput ? emailInput.value.trim() : "";
  if (emailFromInput) {
    SessionState.setEmail(emailFromInput);
  }

  if (!SessionState.email) {
    const fallback = window.prompt(
      "Введите email, на который отправить все ваши портреты:"
    );
    if (!fallback) {
      throw new Error("Email не указан, отправка отменена");
    }
    SessionState.setEmail(fallback);
  }

  if (!SessionState.images.length) {
    throw new Error("Нет изображений для отправки");
  }

  const payload = {
    email: SessionState.email,
    images: SessionState.images,
    total: SessionState.creditsTotal,
    used: SessionState.images.length
  };

  const res = await fetch("/api/send-portraits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    // игнор
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data.error || "Сервер не смог отправить письмо");
  }

  alert("Мы отправили все ваши портреты на email: " + SessionState.email);

  // После успешной отправки можно очистить сессию
  SessionState.images = [];
  // Если хочешь — можно блокировать дальнейшие генерации:
  // SessionState.creditsLeft = 0;
  updateSessionBadges();
}

// ======================= ВЫБОР СТИЛЕЙ / ЭФФЕКТОВ =================

// Стиль портрета — по кнопкам с data-style="beauty|oil|anime|poster|classic"
function initStyleButtons() {
  const buttons = document.querySelectorAll("[data-style]");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const style = btn.getAttribute("data-style");
      if (!style) return;

      CURRENT_STYLE = style;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const styleChip = $("chip-style");
      if (styleChip) {
        styleChip.textContent = "Стиль: " + btn.textContent.trim();
      }
    });
  });
}

// Эффекты кожи и мимики — по кнопкам с data-effect="no-wrinkles" и т.п.
function initEffectButtons() {
  const effectButtons = document.querySelectorAll("[data-effect]");
  if (!effectButtons.length) return;

  effectButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const effectKey = btn.getAttribute("data-effect");
      if (!effectKey) return;

      if (ACTIVE_EFFECTS.has(effectKey)) {
        ACTIVE_EFFECTS.delete(effectKey);
        btn.classList.remove("active");
      } else {
        ACTIVE_EFFECTS.add(effectKey);
        btn.classList.add("active");
      }
    });
  });
}

// Поздравления — по кнопкам с data-greeting="new-year" и т.п.
function initGreetingButtons() {
  const greetingButtons = document.querySelectorAll("[data-greeting]");
  if (!greetingButtons.length) return;

  greetingButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-greeting");
      if (!value) return;

      const alreadySelected = CURRENT_GREETING === value;

      greetingButtons.forEach((b) => b.classList.remove("active"));

      if (alreadySelected) {
        CURRENT_GREETING = null;
        return;
      }

      CURRENT_GREETING = value;
      btn.classList.add("active");
    });
  });
}

// Пакеты — по кнопкам с data-pack="pack10|pack20|pack30" и data-credits="10|20|30"
function initPackButtons() {
  const packButtons = document.querySelectorAll("[data-pack]");
  if (!packButtons.length) {
    // Если нет кнопок пакетов — выставляем демо-сессию
    SessionState.setPack("demo", DEFAULT_DEMO_CREDITS);
    return;
  }

  packButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const pack = btn.getAttribute("data-pack");
      const creditsAttr = btn.getAttribute("data-credits");
      const credits = creditsAttr ? Number(creditsAttr) : DEFAULT_DEMO_CREDITS;

      SessionState.setPack(pack, credits);

      packButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// =========================== ГЕНЕРАЦИЯ ===========================

async function generate() {
  const errorEl = $("error");
  const resultEl = $("result");
  const buttonEl = $("generate-btn");

  if (!IGNORE_CREDITS_LIMIT) {
    if (
      Number.isFinite(SessionState.creditsLeft) &&
      SessionState.creditsLeft <= 0
    ) {
      alert(
        "Ваш пакет генераций закончился. Завершите сессию или купите новый пакет."
      );
      return;
    }
  }

  if (errorEl) errorEl.textContent = "";
  if (resultEl) {
    resultEl.textContent = "Генерируем портрет…";
    resultEl.style.opacity = "0.8";
  }
  if (buttonEl) buttonEl.disabled = true;

  try {
    // --- фото ---
    const fileInput = $("photo") || $("photo-input");
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    let photoData = null;
    if (file) {
      try {
        photoData = await resizeImage(file);
      } catch (e) {
        throw new Error("Не удалось обработать фото: " + e.message);
      }
    }

    // --- текст ---
    const extraInput = $("extra") || $("prompt");
    const extraText = extraInput ? extraInput.value.trim() : "";

    if (!file && !extraText && ACTIVE_EFFECTS.size === 0 && !CURRENT_GREETING) {
      throw new Error(
        "Добавьте фото, текст, эффекты или выберите поздравление."
      );
    }

    const body = {
      style: CURRENT_STYLE,
      text: extraText || null,
      photo: photoData,
      effects: Array.from(ACTIVE_EFFECTS),
      greeting: CURRENT_GREETING
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Сервер вернул некорректный ответ.");
    }

    if (!res.ok) {
      throw new Error(
        data.error || data.message || "Не удалось сгенерировать портрет."
      );
    }

    if (!data.image) {
      throw new Error("Сервер не вернул изображение.");
    }

    // Показ картинки
    if (resultEl) {
      const img = document.createElement("img");
      img.src = data.image;
      img.alt = "AI портрет";

      resultEl.style.opacity = "1";
      resultEl.innerHTML = "";
      resultEl.appendChild(img);
    }

    // Сохраняем изображение в сессии
    SessionState.addImage(data.image);

    // Если пакет закончился — пробуем сразу отправить все изображения на email
    if (SessionState.isFinished()) {
      try {
        await sendSessionToEmail();
      } catch (e) {
        console.error("Ошибка при автоотправке портретов:", e);
        // не блокируем пользователя, просто пишем в консоль
      }
    }
  } catch (err) {
    console.error(err);
    if (errorEl) {
      errorEl.textContent = err.message || "Ошибка при генерации портрета.";
    } else {
      alert(err.message || "Ошибка при генерации портрета.");
    }
    if (resultEl) {
      resultEl.textContent = "";
    }
  } finally {
    if (buttonEl) buttonEl.disabled = false;
  }
}

// Делаем функцию доступной глобально (если вызывается из onClick)
window.generate = generate;

// ======================= ИНИЦИАЛИЗАЦИЯ UI =======================

function initGenerateButton() {
  const btn = $("generate-btn");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    generate();
  });
}

// Кнопка "Завершить сессию"
function initFinishSessionButton() {
  const btn = $("finish-session-btn");
  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await sendSessionToEmail();
    } catch (err) {
      console.error(err);
      alert(err.message || "Не удалось отправить портреты на email");
    }
  });
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  initStyleButtons();
  initEffectButtons();
  initGreetingButtons();
  initPackButtons();
  initGenerateButton();
  initFinishSessionButton();
  updateSessionBadges();
});