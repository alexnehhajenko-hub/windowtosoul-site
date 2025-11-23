// assets/js/generation.js
// Загрузка фото, вызов /api/generate, учёт демо/пакетов, отправка email.

import {
  appState,
  DEMO_MODE,
  DEMO_SESSION_LIMIT,
  STORAGE_KEYS,
  UI_TEXT,
  PACK_SIZES
} from "./state.js";
import {
  els,
  refreshSelectionChips,
  setLayer,
  updateGreetingOverlay
} from "./interface.js";
import { openAgreementModal, openPayModal } from "./payment.js";

export function handleFileSelected(event) {
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
      updateGreetingOverlay();
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

export async function handleGenerateClick() {
  if (appState.isGenerating) return;

  const t = UI_TEXT[appState.language] || UI_TEXT.en;

  if (!appState.photoBase64) {
    alert(t.alertAddPhoto || "Please add a photo first.");
    return;
  }

  // Проверяем демо / оплату
  if (DEMO_MODE) {
    if (!appState.userEmail || !appState.userAgreed) {
      openAgreementModal();
      return;
    }
    if (
      appState.creditsTotal > 0 &&
      appState.creditsUsed >= appState.creditsTotal
    ) {
      alert(t.alertDemoFinished || UI_TEXT.en.alertDemoFinished);
      return;
    }
  } else {
    if (!appState.hasActivePack) {
      alert(t.alertNoActivePack || UI_TEXT.en.alertNoActivePack);
      openPayModal();
      return;
    }
    if (
      appState.creditsTotal > 0 &&
      appState.creditsUsed >= appState.creditsTotal
    ) {
      alert(t.alertPaidFinished || UI_TEXT.en.alertPaidFinished);
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
      greeting: appState.selectedGreeting || null,
      language: appState.language || "en"
    };

    const resp = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error("Generation server error");
    }

    const data = await resp.json();
    if (!data || !data.image) {
      throw new Error("No image URL in response");
    }

    // Показываем результат
    showResultPortrait(data.image);
    // Учитываем генерацию (кредиты, список картинок)
    registerGeneration(data.image);
    // Сбрасываем выбранные эффекты и поздравление после успешной генерации
    clearEffectsSelection();
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    alert(t.alertGenerationFailed || UI_TEXT.en.alertGenerationFailed);
  } finally {
    showGenerating(false);
    appState.isGenerating = false;
  }
}

export function showGenerating(isOn) {
  if (!els.generateStatus) return;
  els.generateStatus.style.display = isOn ? "flex" : "none";
}

export function showResultPortrait(url) {
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

  updateGreetingOverlay();
  document.body.classList.add("result-mode");
  setLayer("result", true);
}

export function exitResultView(pushHistory = true) {
  document.body.classList.remove("result-mode");
  if (pushHistory) setLayer("home", true);
}

function registerGeneration(imageUrl) {
  // Инициализируем общее количество генераций,
  // если ещё не установлено.
  if (appState.creditsTotal <= 0) {
    if (DEMO_MODE) {
      appState.creditsTotal = DEMO_SESSION_LIMIT;
    } else if (appState.selectedPack && PACK_SIZES[appState.selectedPack]) {
      appState.creditsTotal = PACK_SIZES[appState.selectedPack];
    }
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

  if (DEMO_MODE && appState.creditsUsed >= appState.creditsTotal) {
    finishSessionAndSendEmail();
  }
}

// Сброс эффектов и поздравления после генерации
function clearEffectsSelection() {
  appState.selectedEffects = [];
  appState.selectedGreeting = null;

  refreshSelectionChips();
  updateGreetingOverlay();
}

async function finishSessionAndSendEmail() {
  const t = UI_TEXT[appState.language] || UI_TEXT.en;

  const email = appState.userEmail;
  if (!email) {
    alert("Email not found. Cannot send portraits.");
    return;
  }

  if (!appState.generatedImages || appState.generatedImages.length === 0) {
    alert("No generated portraits to send.");
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
      throw new Error("Email server error");
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
      "Portraits have been generated, but email could not be sent. Please try later."
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