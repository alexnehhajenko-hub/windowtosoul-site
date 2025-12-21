// assets/main.js
// Точка входа: инициализация DOM, состояния, языков, истории и обработчиков.

import {
  bindElements,
  setupSupportEmail,
  hideOverlaysOnStart,
  setLanguage,
  refreshSelectionChips,
  closeSheet,
  updateGreetingOverlay
} from "./js/interface.js";
import { appState, loadStateFromStorage } from "./js/state.js";
import { attachMainHandlers } from "./js/events.js";
import {
  handleStripeStatusFromUrl,
  closePayModal,
  closeAgreementModal
} from "./js/payment.js";
import { exitResultView } from "./js/generation.js";

console.log("MAIN JS LOADED");

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  setupSupportEmail();
  loadStateFromStorage();
  setLanguage(appState.language || "en");
  hideOverlaysOnStart();
  attachMainHandlers();
  setupBackButtonLogic();
  setupClearEffectsButton();
  handleStripeStatusFromUrl();
  refreshSelectionChips();
});

function setupBackButtonLogic() {
  if (window.history && window.history.replaceState) {
    window.history.replaceState({ layer: "home" }, "", window.location.href);
  }

  window.addEventListener("popstate", () => {
    const layer = appState.layer;
    switch (layer) {
      case "sheet":
        closeSheet(false);
        break;
      case "pay":
        closePayModal(false);
        break;
      case "agree":
        closeAgreementModal(false);
        break;
      case "result":
        exitResultView(false);
        break;
      default:
        return;
    }
    appState.layer = "home";
  });
}

// CLEAR EFFECTS:
// — очищает эффекты
// — убирает поздравление
// — снимает стиль
// — сбрасывает режим на generate (выходит из Hollywood Pro)
function setupClearEffectsButton() {
  const btn = document.getElementById("btnClearEffects");
  if (!btn) return;

  btn.addEventListener("click", () => {
    appState.mode = "generate";
    appState.selectedEffects = [];
    appState.selectedGreeting = null;
    appState.selectedStyle = null;

    refreshSelectionChips();
    updateGreetingOverlay();
    closeSheet();
  });
}