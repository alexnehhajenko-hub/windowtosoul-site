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
  // 1. Находим все DOM-элементы
  bindElements();

  // 2. Email поддержки (если есть блок в верстке)
  setupSupportEmail();

  // 3. Загружаем состояние из localStorage
  loadStateFromStorage();

  // 4. Ставим язык (по умолчанию en)
  setLanguage(appState.language || "en");

  // 5. Прячем оверлеи
  hideOverlaysOnStart();

  // 6. Вешаем обработчики на кнопки
  attachMainHandlers();

  // 7. Логика кнопки "назад"
  setupBackButtonLogic();

  // 8. Логика кнопки очистки эффектов
  setupClearEffectsButton();

  // 9. Статус Stripe (?status=success/cancel)
  handleStripeStatusFromUrl();

  // 10. Обновляем чипы под фото
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

// Кнопка "CLEAR EFFECTS":
// — очищает эффекты кожи и мимику
// — убирает поздравление
// — снимает ЛЮБОЙ стиль (selectedStyle = null)
function setupClearEffectsButton() {
  const btn = document.getElementById("btnClearEffects");
  if (!btn) return;

  btn.addEventListener("click", () => {
    // 1) убираем все выбранные эффекты (кожа + мимика)
    appState.selectedEffects = [];
    // 2) убираем поздравление
    appState.selectedGreeting = null;
    // 3) полностью убираем стиль — НИЧЕГО не выбрано
    appState.selectedStyle = null;

    // Обновляем интерфейс
    refreshSelectionChips();
    updateGreetingOverlay();
    closeSheet();
  });
}