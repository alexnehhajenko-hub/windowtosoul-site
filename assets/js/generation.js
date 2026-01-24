// assets/js/generation.js
// Upload photo, call /api/generate OR /api/restore
// ✅ Magazine Pro: use HQ input + face close-up reference to lock identity

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

const FETCH_TIMEOUT_MS = 300000; // 5 min safety timeout (prevents endless hang)

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
      // Default preview + most modes
      const resized1024 = resizeImageToMax(img, 1024);

      // ✅ HQ for Magazine Pro (stronger retouch, less identity drift)
      const resized2048 = resizeImageToMax(img, 2048);

      // ✅ Face reference crop (helps keep identity)
      const faceCrop = makeFaceCropDataUrl(img, 1024);

      appState.photoBase64 = resized1024;

      // Store extra refs (dynamic props, no need to change state.js)
      appState.photoBase64HQ = resized2048;
      appState.photoFaceCrop = faceCrop;

      if (els.previewImage) {
        els.previewImage.src = resized1024;
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

// Heuristic face crop (no extra libs): upper-center square crop
function makeFaceCropDataUrl(img, outSize = 768) {
  const srcW = img.width;
  const srcH = img.height;

  // Square size: based on width (portrait/head usually in upper area)
  const size = Math.min(srcW, Math.round(srcH * 0.70));

  let x = Math.round((srcW - size) / 2);
  let y = Math.round(srcH * 0.06); // near top

  // Clamp
  x = Math.max(0, Math.min(x, srcW - size));
  y = Math.max(0, Math.min(y, srcH - size));

  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, x, y, size, size, 0, 0, outSize, outSize);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function handleGenerateClick() {
  if (appState.isGenerating) return;

  const t = UI_TEXT[appState.language] || UI_TEXT.en;

  if (!appState.photoBase64) {
    alert(t.alertAddPhoto || "Please add a photo first.");
    return;
  }

  const isRestore = appState.mode === "restore";

  // ✅ detect Magazine Pro
  const effectsArr = Array.isArray(appState.selectedEffects) ? appState.selectedEffects : [];
  const isMagazinePro = !isRestore && effectsArr.includes("magazine-pro");

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // ✅ Layering: if enabled and we have last result -> use it as input image
    // Restore always uses original uploaded photoBase64 (do not chain restore).
    const inputPhoto =
      !isRestore && appState.useResultAsInput && appState.lastResultUrl
        ? appState.lastResultUrl
        : appState.photoBase64;

    // ✅ For Magazine Pro: use HQ input if available (only when using original upload)
    const magazineInputPhoto =
      !isRestore && !(appState.useResultAsInput && appState.lastResultUrl)
        ? (appState.photoBase64HQ || appState.photoBase64)
        : inputPhoto;

    // ✅ Face reference only when we still have original uploaded image
    const faceRef =
      isMagazinePro && !(appState.useResultAsInput && appState.lastResultUrl)
        ? (appState.photoFaceCrop || null)
        : null;

    const payload = isRestore
      ? { photo: appState.photoBase64, language: appState.language || "en" }
      : {
          style: appState.selectedStyle || "beauty",
          text: "",
          photo: isMagazinePro ? magazineInputPhoto : inputPhoto,
          face: faceRef, // ✅ optional second ref to lock identity
          effects: appState.selectedEffects,
          greeting: appState.selectedGreeting || null,
          language: appState.language || "en"
        };

    const endpoint = isRestore ? "/api/restore" : "/api/generate";

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
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
    clearTimeout(timeoutId);
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