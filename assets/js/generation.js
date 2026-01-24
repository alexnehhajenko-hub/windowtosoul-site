// assets/js/generation.js
// Upload photo, call /api/generate OR /api/restore OR /api/magazine-pro (async polling)

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

  // ✅ New photo = reset layering
  appState.lastResultUrl = null;
  appState.useResultAsInput = false;
  refreshSelectionChips();

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollPrediction(predId, t, { timeoutMs = 240000, intervalMs = 1500 } = {}) {
  const started = Date.now();

  while (true) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Prediction timeout");
    }

    const r = await fetch(`/api/prediction?id=${encodeURIComponent(predId)}`, {
      method: "GET"
    });

    let j = {};
    try {
      j = await r.json();
    } catch {}

    if (!r.ok) {
      const msg = j?.details || j?.error || `HTTP ${r.status}`;
      throw new Error("Prediction check failed: " + msg);
    }

    const status = j?.status || "unknown";

    if (status === "succeeded") {
      if (!j?.image) throw new Error("Prediction succeeded but image is missing");
      return j.image;
    }

    if (status === "failed" || status === "canceled") {
      const msg = j?.error || j?.logs || "Prediction failed";
      throw new Error(String(msg));
    }

    // starting | processing | unknown -> wait
    await sleep(intervalMs);
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
  const isMagazinePro = !isRestore && Array.isArray(appState.selectedEffects)
    ? appState.selectedEffects.includes("magazine-pro")
    : false;

  // Payment / credits gate: restore is free (as you already had)
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
    // ✅ Layering: if enabled and we have last result -> use it as input image
    // Restore always uses original uploaded photoBase64 (do not chain restore).
    const inputPhoto =
      !isRestore && appState.useResultAsInput && appState.lastResultUrl
        ? appState.lastResultUrl
        : appState.photoBase64;

    let endpoint = "/api/generate";
    let payload = {
      style: appState.selectedStyle || "beauty",
      text: "",
      photo: inputPhoto,
      effects: appState.selectedEffects,
      greeting: appState.selectedGreeting || null,
      language: appState.language || "en"
    };

    if (isRestore) {
      endpoint = "/api/restore";
      payload = { photo: appState.photoBase64, language: appState.language || "en" };
    } else if (isMagazinePro) {
      // ✅ Magazine Pro runs on separate ASYNC pipeline
      endpoint = "/api/magazine-pro";
      payload = { photo: inputPhoto };
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

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

    // ✅ SYNC path
    if (data && data.image) {
      showResultPortrait(data.image);

      if (!isRestore) {
        registerGeneration(data.image);
        clearEffectsSelection();
      } else {
        appState.mode = "generate";
        refreshSelectionChips();
      }

      return;
    }

    // ✅ ASYNC path (restore + magazine-pro)
    const predId = data?.prediction || data?.predictionId || null;
    if (!predId) {
      throw new Error("No image URL or prediction id in response");
    }

    const imageUrl = await pollPrediction(predId, t, { timeoutMs: 240000, intervalMs: 1500 });

    showResultPortrait(imageUrl);

    // restore: do not spend credits
    if (!isRestore) {
      registerGeneration(imageUrl);
      clearEffectsSelection();
    } else {
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

export function showGenerating(isOn) {
  if (!els.generateStatus) return;
  els.generateStatus.style.display = isOn ? "flex" : "none";
}

export function showResultPortrait(url) {
  // ✅ Remember last result for layering
  appState.lastResultUrl = url;

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

  refreshSelectionChips();
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