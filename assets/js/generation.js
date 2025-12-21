// assets/js/generation.js
// Upload photo, call /api/generate OR /api/restore
// Update: keep 2 image sizes (1024 + HQ 2048) and send HQ for Hollywood Pro / skin retouch.
// Also send retouch flags (face_zoom) for server-side "zoom-in face -> retouch -> restore" pipeline.

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

// Effects that benefit from higher input resolution
const HQ_EFFECTS = new Set([
  "hollywood-pro",
  "no-wrinkles",
  "younger",
  "smooth-skin",
  "beauty-one-touch"
]);

export function handleFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  appState.originalFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // normal preview/generation image
      const resizedDataUrl = resizeImageToMax(img, 1024);
      appState.photoBase64 = resizedDataUrl;

      // HQ image for Hollywood Pro / skin retouch / restore
      const resizedHQ = resizeImageToMax(img, 2048);
      appState.photoBase64HQ = resizedHQ;

      if (els.previewImage) {
        els.previewImage.src = resizedDataUrl; // preview fast
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

function shouldUseHQImage({ isRestore, style, effects }) {
  if (isRestore) return true;
  if (style === "beauty") return true;

  if (Array.isArray(effects) && effects.some((e) => HQ_EFFECTS.has(e))) {
    return true;
  }
  return false;
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
    const effectsArr = Array.isArray(appState.selectedEffects) ? appState.selectedEffects : [];
    const styleKey = appState.selectedStyle || "beauty";

    const useHQ = shouldUseHQImage({
      isRestore,
      style: styleKey,
      effects: effectsArr
    });

    const photoToSend = (useHQ ? appState.photoBase64HQ : appState.photoBase64) || appState.photoBase64;

    // Extra retouch flags (server can ignore safely now; we will use them in api/generate.js V2 later)
    const hasHollywoodPro = effectsArr.includes("hollywood-pro");
    const retouch = hasHollywoodPro
      ? {
          mode: "hollywood-pro",
          face_zoom: true,       // server: zoom-in face -> retouch -> restore
          strength: "max"        // server: stronger wrinkle removal
        }
      : null;

    const payload = isRestore
      ? {
          photo: photoToSend,
          language: appState.language || "en"
        }
      : {
          style: styleKey,
          text: "",
          photo: photoToSend,
          effects: effectsArr,
          greeting: appState.selectedGreeting || null,
          language: appState.language || "en",
          ...(retouch ? { retouch } : {})
        };

    const endpoint = isRestore ? "/api/restore" : "/api/generate";

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
    if (!data || !data.image) {
      throw new Error("No image URL in response");
    }

    showResultPortrait(data.image);

    if (!isRestore) {
      registerGeneration(data.image);
      clearEffectsSelection();
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