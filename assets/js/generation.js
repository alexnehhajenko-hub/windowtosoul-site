// assets/js/generation.js
// Upload photo, call /api/generate OR /api/restore
// V2: async prediction + polling (prevents long hangs/timeouts)

import {
  appState,
  DEMO_MODE,
  DEMO_SESSION_LIMIT,
  STORAGE_KEYS,
  UI_TEXT,
  PACK_SIZES
} from "./state.js";
import { els, refreshSelectionChips, setLayer, updateGreetingOverlay } from "./interface.js";
import { openAgreementModal, openPayModal } from "./payment.js";

export function handleFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  appState.originalFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // ✅ Higher quality input for better identity + wrinkles handling
      const resizedDataUrl = resizeImageToMax(img, 1536);
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

  // slightly higher quality
  return canvas.toDataURL("image/jpeg", 0.92);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: ctrl.signal });
    const json = await resp.json().catch(() => null);
    return { resp, json };
  } finally {
    clearTimeout(t);
  }
}

async function pollPrediction(predId, t, maxMs = 240000) {
  const started = Date.now();
  let lastStatus = "starting";

  while (Date.now() - started < maxMs) {
    // update UI text occasionally
    const elapsed = Date.now() - started;
    if (els.generateStatusText) {
      if (elapsed > 60000) els.generateStatusText.textContent = t.generateStatus + " (still working…)";
      else els.generateStatusText.textContent = t.generateStatus;
    }

    const { resp, json } = await fetchJsonWithTimeout(
      `/api/prediction?id=${encodeURIComponent(predId)}`,
      { method: "GET" },
      20000
    );

    if (!resp.ok) {
      const msg = json?.details || json?.error || `HTTP ${resp.status}`;
      throw new Error("Prediction poll failed: " + msg);
    }

    lastStatus = json?.status || lastStatus;

    if (lastStatus === "succeeded" || lastStatus === "successful") {
      if (json?.image) return json.image;
      throw new Error("Prediction succeeded but returned no image");
    }

    if (lastStatus === "failed" || lastStatus === "canceled") {
      const e = json?.replicateError ? ` | ${json.replicateError}` : "";
      throw new Error("Prediction failed: " + lastStatus + e);
    }

    await sleep(1800);
  }

  throw new Error("Prediction timeout: took too long");
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
  showGenerating(true, t.generateStatus);

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

    // fast request (create prediction) — should return quickly now
    const { resp, json } = await fetchJsonWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      30000
    );

    if (!resp.ok) {
      const msg = json?.details || json?.error || `HTTP ${resp.status}`;
      throw new Error("Server error: " + msg);
    }

    if (!json) throw new Error("Empty server response");

    // If server already has an image (rare), show it immediately.
    let imageUrl = json.image || null;

    // Otherwise poll by prediction id
    if (!imageUrl && json.prediction) {
      imageUrl = await pollPrediction(json.prediction, t, 240000);
    }

    if (!imageUrl) throw new Error("No image URL");

    showResultPortrait(imageUrl);

    if (!isRestore) {
      registerGeneration(imageUrl);
      clearEffectsSelection(); // ✅ effects are reset after each successful generation
    }

    if (isRestore) {
      appState.mode = "generate";
      refreshSelectionChips();
    }
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    alert(t.alertGenerationFailed || UI_TEXT.en.alertGenerationFailed);
  } finally {
    showGenerating(false);
    appState.isGenerating = false;
  }
}

export function showGenerating(isOn, text) {
  if (!els.generateStatus) return;
  els.generateStatus.style.display = isOn ? "flex" : "none";
  if (isOn && els.generateStatusText && text) els.generateStatusText.textContent = text;
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
    window.localStorage.setItem(STORAGE_KEYS.GENERATED_IMAGES, JSON.stringify(appState.generatedImages));
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