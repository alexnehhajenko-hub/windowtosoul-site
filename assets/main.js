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
  setupLanguageDropdownAutoClose(); // ✅ NEW
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

/**
 * ✅ Language dropdown auto-close (safe mode):
 * - Works with old 4-button UI (does nothing harmful).
 * - If you already converted languages into a dropdown/menu, it will close it after selection
 *   and on outside click.
 *
 * We don't assume exact markup. We try common patterns:
 * - container: .lang-switch or #langSwitch
 * - open class: .open / .lang-open / .is-open
 * - menu element: .lang-menu / .lang-dropdown / [data-lang-menu]
 * - toggle button: .lang-toggle / #langToggle / [data-lang-toggle]
 */
function setupLanguageDropdownAutoClose() {
  const langButtons = [
    document.getElementById("langEn"),
    document.getElementById("langDe"),
    document.getElementById("langEs"),
    document.getElementById("langRu")
  ].filter(Boolean);

  // If no language buttons exist, nothing to do.
  if (langButtons.length === 0) return;

  const container =
    document.querySelector(".lang-switch") ||
    document.getElementById("langSwitch") ||
    document.querySelector("[data-lang-container]") ||
    null;

  function closeLangMenu() {
    if (!container) return;

    // remove typical "open" classes
    container.classList.remove("open");
    container.classList.remove("lang-open");
    container.classList.remove("is-open");

    // hide typical menu nodes if present
    const menu =
      container.querySelector(".lang-menu") ||
      container.querySelector(".lang-dropdown") ||
      container.querySelector("[data-lang-menu]") ||
      null;
    if (menu) menu.style.display = "none";

    // update aria on toggle if present
    const toggle =
      container.querySelector(".lang-toggle") ||
      container.querySelector("#langToggle") ||
      container.querySelector("[data-lang-toggle]") ||
      null;
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  // Close after selecting a language
  langButtons.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        // Let setLanguage run first (events.js), then close.
        // (setTimeout 0 = next tick, avoids race with any UI toggling)
        setTimeout(() => closeLangMenu(), 0);
      },
      { passive: true }
    );
  });

  // Close on click outside (only if we can locate container)
  document.addEventListener("click", (e) => {
    if (!container) return;
    const target = e.target;
    if (!(target instanceof Element)) return;

    // click outside container -> close
    if (!container.contains(target)) closeLangMenu();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLangMenu();
  });
}