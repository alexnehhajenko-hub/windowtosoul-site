// assets/js/generation.js
// Upload photo, call /api/generate OR /api/restore

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

const MAX_UPLOAD_SIZE = 2048; // ✅ was 1024 — more face detail -> less identity drift
const JPEG_QUALITY = 0.92;
const REQUEST_TIMEOUT_MS = 120000; // ✅ 2 minutes (prevents infinite loading)

export function handleFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  appState.originalFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const resizedDataUrl = resizeImageToMax(img, MAX_UPLOAD_SIZE, JPEG_QUALITY);
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

function resizeImageToMax(img, maxSize, quality = 0.9) {
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
  return canvas.toDataURL("image/jpeg", quality);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

export async function handleGenerateClick() {
  if (appState.isGenerating) return;

  const t = UI_TEXT[appState.language] || UI_TEXT.en;

  if (!appState.photoBase64) {
    alert(t.alertAddPhoto || "Please add a photo first.");
    return;
  }

  const isRestore = appState.mode === "restore";

  if (!isRestore) {
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
  }

  appState.isGenerating = true;
  showGenerating(true);

  try {
    const payload = isRestore
      ? { photo: appState.photoBase64, language: appState.language || "en" }
      : {
          style: appState.selectedStyle || "beauty",
          text: "",
          photo: appState.photoBase64,
          effects: appState.selectedEffects,
          greeting: appState.selectedGreeting || null,
          language: appState.language || "en"
        };

    const endpoint = isRestore ? "/api/restore" : "/api/generate";

    const resp = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      REQUEST_TIMEOUT_MS
    );

    if (!resp.ok) {
      let serverMsg = "";
      try {
        const j = await resp.json();
        serverMsg = j?.details || j?.error || JSON.stringify(j);
      } catch (e) {
        try {
          serverMsg = await resp.text();
        } catch {}
      }
      console.error("SERVER ERROR:", resp.status, serverMsg);
      throw new Error(
        "Server error: " +
          resp.status +
          (serverMsg ? " | " + serverMsg : "")
      );
    }

    const data = await resp.json();
    if (!data || !data.image) {
      throw new Error("No image URL in response");
    }

    showResultPortrait(data.image);

    if (!isRestore) {
      registerGeneration(data.image);
    }

    if (isRestore) {
      appState.mode = "generate";
      refreshSelectionChips();
    }
  } catch (err) {
    console.error("GENERATION ERROR:", err);

    // ✅ handle timeout gracefully
    const msg = String(err?.message || err);
    if (msg.includes("aborted") || msg.toLowerCase().includes("abort")) {
      alert(
        (t.alertGenerationFailed || UI_TEXT.en.alertGenerationFailed) +
          "\n\nTimeout: generation took too long. Please try again."
      );
    } else {
      alert(t.alertGenerationFailed || UI_TEXT.en.alertGenerationFailed);
    }
  } finally {
    // ✅ ALWAYS clear effects after any generate attempt (as you asked)
    // so the next run starts clean.
    if (!isRestore) {
      clearEffectsSelection();
    }

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
}

function clearEffectsSelection() {
  appState.selectedEffects = [];
  appState.selectedGreeting = null;

  refreshSelectionChips();
  updateGreetingOverlay();
}