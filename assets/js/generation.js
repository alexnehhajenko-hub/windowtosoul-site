// assets/js/generation.js
// Логика генерации портрета + завершение сессии и отправка на email
// Зависит от глобальных объектов: DEMO_MODE, appState, STORAGE_KEYS, els,
// а также функций refreshSelectionChips (interface.js), openAgreementModal / openPayModal (events/payment).

// =========================
// ГЕНЕРАЦИЯ ПОРТРЕТА
// =========================

async function handleGenerateClick() {
  if (appState.isGenerating) return;

  if (!appState.photoBase64) {
    alert("First add a photo.");
    return;
  }

  // DEMO: сначала собираем email + согласие
  if (DEMO_MODE) {
    if (!appState.userEmail || !appState.userAgreed) {
      if (typeof openAgreementModal === "function") {
        openAgreementModal();
      } else {
        alert("Please enter your email and confirm consent first.");
      }
      return;
    }
  } else {
    // Боевой режим: без оплаченного пакета — показываем окно оплаты
    if (!appState.hasActivePack) {
      alert("Please buy a package of generations first.");
      if (typeof openPayModal === "function") {
        openPayModal();
      }
      return;
    }
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
      throw new Error("Generation server returned an error.");
    }

    const data = await resp.json();
    if (!data || !data.image) {
      throw new Error("Generation server did not return an image URL.");
    }

    // Показать результат
    showResultPortrait(data.image);

    // Учесть генерацию в демо-счётчике
    if (DEMO_MODE) {
      registerGeneration(data.image);
    }

    // ВАЖНО: после каждой успешной генерации
    // полностью сбрасываем выбранные эффекты,
    // чтобы пользователь заново выбирал стиль, кожу, мимику и поздравление
    resetAllEffects();
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    alert("Could not generate the portrait. Please try again.");
  } finally {
    showGenerating(false);
    appState.isGenerating = false;
  }
}

// =========================
// РЕГИСТРАЦИЯ ГЕНЕРАЦИИ (ДЕМО-СЦЕНАРИЙ)
// =========================

function registerGeneration(imageUrl) {
  // На всякий случай — если почему-то не инициализировали creditsTotal
  if (appState.creditsTotal <= 0 && typeof DEMO_SESSION_LIMIT !== "undefined") {
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
    console.warn("Cannot store demo credits/images", e);
  }

  if (typeof refreshSelectionChips === "function") {
    refreshSelectionChips();
  }

  if (appState.creditsUsed >= appState.creditsTotal) {
    finishSessionAndSendEmail();
  }
}

// =========================
// ВСПОМОГАТЕЛЬНОЕ: СБРОС ВСЕХ ЭФФЕКТОВ
// =========================

function resetAllEffects() {
  // Обнуляем выбранный стиль, эффекты и поздравление
  appState.selectedStyle = null;
  appState.selectedEffects = [];
  appState.selectedGreeting = null;

  // Чистим текст поверх картинки (если будем использовать)
  if (window.els && els.greetingOverlay) {
    els.greetingOverlay.textContent = "";
    els.greetingOverlay.style.display = "none";
  }

  // Обновляем чипы под превью
  if (typeof refreshSelectionChips === "function") {
    refreshSelectionChips();
  }
}

// =========================
// UI: СОСТОЯНИЕ "ГЕНЕРАЦИЯ ИДЁТ"
// =========================

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
  if (typeof setLayer === "function") {
    setLayer("result", true);
  }
}

function exitResultView(pushHistory = true) {
  document.body.classList.remove("result-mode");
  if (typeof setLayer === "function" && pushHistory) {
    setLayer("home", true);
  }
}

// =========================
// ЗАВЕРШЕНИЕ СЕССИИ И ОТПРАВКА НА EMAIL
// =========================

async function finishSessionAndSendEmail() {
  const email = appState.userEmail;

  if (!email) {
    alert("Email not found. Cannot send portraits.");
    return;
  }

  if (!appState.generatedImages || appState.generatedImages.length === 0) {
    alert("There are no generated portraits to send.");
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
      throw new Error("Email server returned an error.");
    }

    const data = await resp.json();
    if (!data || !data.ok) {
      throw new Error("Email service did not confirm sending.");
    }

    alert(
      `Session finished. We sent ${appState.generatedImages.length} portrait(s) to ${email}.`
    );

    resetDemoSession();
  } catch (err) {
    console.error("SEND EMAIL ERROR:", err);
    alert(
      "Portraits were generated, but we could not send the email. Please try again later or contact support."
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
    // email и согласие оставляем
  } catch (e) {
    console.warn("Cannot clear demo session storage", e);
  }

  if (typeof refreshSelectionChips === "function") {
    refreshSelectionChips();
  }
}