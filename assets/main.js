// assets/main.js
// Точка входа: инициализация DOM, состояния, языков, истории и обработчиков.

import { bindElements, setupSupportEmail, hideOverlaysOnStart, setLanguage, refreshSelectionChips } from "./js/interface.js";
import { appState, loadStateFromStorage } from "./js/state.js";
import { attachMainHandlers } from "./js/events.js";
import { handleStripeStatusFromUrl, closePayModal, closeAgreementModal } from "./js/payment.js";
import { closeSheet } from "./js/interface.js";
import { exitResultView } from "./js/generation.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Находим все DOM-элементы
  bindElements();

  // 2. Email поддержки
  setupSupportEmail();

  // 3. Загружаем состояние из localStorage (язык, демо, пакеты...)
  loadStateFromStorage();

  // 4. Применяем язык к интерфейсу
  setLanguage(appState.language || "en");

  // 5. Прячем оверлеи на старте
  hideOverlaysOnStart();

  // 6. Вешаем все обработчики кнопок
  attachMainHandlers();

  // 7. Настраиваем кнопку "Назад"
  setupBackButtonLogic();

  // 8. Обрабатываем возврат со Stripe (?status=success/cancel)
  handleStripeStatusFromUrl();

  // 9. Обновляем чипы под предпросмотром
  refreshSelectionChips();
});

function setupBackButtonLogic() {
  if (window.history && window.history.replaceState) {
    window.history.replaceState({ layer: "home" }, "", window.location.href);
  }

  window.addEventListener("popstate", () => {
    // смотрим текущий слой в состоянии
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