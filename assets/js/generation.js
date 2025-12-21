// assets/js/generation.js
// Upload photo, call /api/generate OR /api/restore
// Fixes:
// - Add fetch timeout (prevents infinite spinner)
// - Store hi-res preview for better beauty/restore identity
// - Always clear effects after a successful generation (and after restore result)

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

const PREVIEW_MAX_NORMAL = 1024;
const PREVIEW_MAX_HI = 1600; // better for faces/restoration
const FETCH_TIMEOUT_MS = 120000; // 120s (so Safari won't hang forever)

export function handleFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  appState.originalFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const resizedNormal = resizeImageToMax(img, PREVIEW_MAX_NORMAL);
      const resizedHi = resizeImageToMax(img, PREVIEW_MAX_HI);

      appState.photoBase64 = resizedNormal;
      appState.photoBase64Hi = resizedHi;

      if (els.previewImage) {
        els.previewImage.src = resizedNormal;
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
  return canvas.toDataURL("image/jpeg", 0.92);
}

function choosePhotoForRequest(isRestore) {
  // For restore and beauty/skin (Hollywood Pro), send higher-res for better faces.
  const styleIsBeauty = (appState.selectedStyle || "beauty") === "beauty";
  const hasSkin = Array.isArray(appState.selectedEffects) && appState.selectedEffects.length > 0;

  if (isRestore || styleIsBeauty || hasSkin) {
    return appState.photoBase64Hi || appState.photoBase64;
  }
  return appState.photoBase64;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
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
      if (appState.creditsTotal > 0 && appState.creditsUsed >= appState.creditsTotal) {
        alert(t.alertDemoFinished || UI_TEXT.en.alertDemoFinished);
        return;
      }
    } else {
      if (!appState.hasActivePack) {
        alert(t.alertNoActivePack || UI_TEXT.en.alertNoActivePack);
        openPayModal();
        return;
      }
      if (appState.creditsTotal > 0 && appState.creditsUsed >= appState.creditsTotal) {
        alert(t.alertPaidFinished || UI_TEXT.en.alertPaidFinished);
        return;
      }
    }
  }

  appState.isGenerating = true;
  showGenerating(true);

  try {
    const photoToSend = choosePhotoForRequest(isRestore);

    const payload = isRestore
      ? { photo: photoToSend, language: appState.language || "en" }
      : {
          style: appState.selectedStyle || "beauty",
          text: "",
          photo: photoToSend,
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
      FETCH_TIMEOUT_MS
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
      throw new Error("Server error: " + resp.status + (serverMsg ? " | " + serverMsg : ""));
    }

    const data = await resp.json();
    if (!data || !data.image) {
      throw new Error("No image URL in response");
    }

    showResultPortrait(data.image);

    // Register credits ONLY for generate (not restore)
    if (!isRestore) {
      registerGeneration(data.image);
    }

    // ✅ Always clear effects/greeting after success (user requested)
    clearEffectsSelection();

    // After restore: go back to generate mode
    if (isRestore) {
      appState.mode = "generate";
      refreshSelectionChips();
    }
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    // Timeout (AbortController)
    const msg =
      (err && (err.name === "AbortError" || String(err).includes("AbortError")))
        ? (t.alertGenerationFailed || UI_TEXT.en.alertGenerationFailed) + " (timeout)"
        : (t.alertGenerationFailed || UI_TEXT.en.alertGenerationFailed);

    alert(msg);
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
    window.localStorage.setItem(STORAGE_KEYS.CREDITS_TOTAL, String(appState.creditsTotal));
    window.localStorage.setItem(STORAGE_KEYS.CREDITS_USED, String(appState.creditsUsed));
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