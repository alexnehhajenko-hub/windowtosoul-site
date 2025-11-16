/* WindowToSoul — Full Soft Dark Premium UI */

/* ----- RESET ----- */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: radial-gradient(circle at top, #181928 0%, #050712 55%, #020109 100%);
  color: #f3edf9;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: stretch;
}

/* Режим генерации — прячем всё, кроме превью и кнопки скачать */
body.app-generating .app-header,
body.app-generating .controls,
body.app-generating .footer {
  display: none;
}

body.app-generating .app {
  padding-top: 16px;
  padding-bottom: 16px;
}

body.app-generating .preview-box {
  flex: 1;
  min-height: auto;
  height: calc(100vh - 70px);
}

/* ----- APP LAYOUT ----- */

.app {
  width: 100%;
  max-width: 420px;
  padding: 16px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.app-header {
  text-align: center;
  margin-bottom: 4px;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #f5f0ff;
}

.app-subtitle {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.7;
}

/* ----- PREVIEW ----- */

.preview-box {
  position: relative;
  border-radius: 24px;
  background: radial-gradient(circle at top, #26263b 0%, #151525 55%, #080711 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    0 16px 38px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(255, 255, 255, 0.03);
  padding: 12px;
  overflow: hidden;
  min-height: 230px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-label {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.65;
}

.preview-placeholder {
  text-align: center;
  opacity: 0.6;
  font-size: 14px;
  line-height: 1.4;
  padding: 0 12px;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 18px;
  display: none;
}

/* Надпись-поздравление поверх портрета */

.greeting-overlay {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  text-shadow: 0 0 8px rgba(0,0,0,0.9);
  border-radius: 999px;
  background: rgba(5, 7, 20, 0.7);
  max-width: 90%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease-out;
}

.greeting-overlay.visible {
  opacity: 1;
}

/* ----- CONTROLS ----- */

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}

/* Выбранные опции (чипы) */

.selection-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 22px;
}

.selection-pill {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  opacity: 0.9;
  white-space: nowrap;
}

/* ----- BUTTONS ----- */

.button-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-row-split {
  display: flex;
  gap: 10px;
}

.btn-main,
.btn-half {
  position: relative;
  border: none;
  outline: none;
  cursor: pointer;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 14px 18px;
  color: #fbf8ff;
  background: linear-gradient(135deg, #7159ff, #9a7bff 45%, #c292ff 100%);
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.9),
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 3px 0 rgba(255, 255, 255, 0.22) inset,
    0 -4px 12px rgba(0, 0, 0, 0.7) inset;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    transform 0.09s ease-out,
    box-shadow 0.09s ease-out,
    filter 0.12s ease-out;
}

.btn-main {
  width: 100%;
}

.btn-half {
  flex: 1;
  font-size: 13px;
  padding-inline: 8px;
}

.btn-main span,
.btn-half span {
  white-space: nowrap;
}

.btn-main::after,
.btn-half::after {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: radial-gradient(circle at top left,
    rgba(255, 255, 255, 0.16) 0,
    transparent 55%);
  opacity: 0.9;
  pointer-events: none;
}

.btn-main:active,
.btn-half:active {
  transform: translateY(1px) scale(0.985);
  box-shadow:
    0 5px 14px rgba(0, 0, 0, 0.9),
    0 0 0 1px rgba(255, 255, 255, 0.03),
    0 2px 0 rgba(255, 255, 255, 0.12) inset,
    0 -3px 8px rgba(0, 0, 0, 0.75) inset;
  filter: brightness(0.96);
}

.btn-secondary {
  background: linear-gradient(135deg, #414362, #555a80);
}

.btn-pay {
  background: linear-gradient(135deg, #e2b86f, #d48a59 40%, #bf624c 100%);
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.92),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 3px 0 rgba(255, 245, 220, 0.4) inset,
    0 -4px 12px rgba(0, 0, 0, 0.75) inset;
  color: #25130a;
}

.btn-icon {
  font-size: 16px;
}

/* Кнопка "Скачать" */

.download-row {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.btn-download {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  font-size: 13px;
  border-radius: 999px;
  border: none;
  text-decoration: none;
  cursor: pointer;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #5f65dd, #8b7fe7);
  color: #fbf9ff;
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* ----- FOOTER ----- */

.footer {
  margin-top: auto;
  font-size: 10px;
  opacity: 0.55;
  text-align: center;
  line-height: 1.4;
}

/* ----- SHEET (выбор стилей/эффектов/мимики/поздравлений) ----- */

.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(16px);
  z-index: 2000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease-out;
}

.sheet-backdrop.visible {
  opacity: 1;
  pointer-events: auto;
}

.sheet {
  width: 100%;
  max-width: 380px;
  max-height: 78vh;
  background: rgba(22, 22, 40, 0.94);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.95);
  padding: 14px 16px 18px;
  transform: translateY(18px) scale(0.96);
  opacity: 0;
  transition:
    transform 0.22s cubic-bezier(0.16, 0.8, 0.25, 1),
    opacity 0.22s ease-out;
  display: flex;
  flex-direction: column;
}

.sheet-backdrop.visible .sheet {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sheet-title {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.95;
}

.sheet-close {
  border: none;
  background: transparent;
  color: #ffffffb8;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

.sheet-description {
  font-size: 11px;
  opacity: 0.72;
  margin-bottom: 6px;
}

.sheet-section-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.68;
  margin-top: 6px;
  margin-bottom: 2px;
  letter-spacing: 0.08em;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
  overflow-y: auto;
}

.chip {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.16);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.12s ease-out,
    border-color 0.12s ease-out,
    transform 0.08s ease-out;
}

.chip:hover {
  background: rgba(255, 255, 255, 0.09);
  transform: translateY(-1px);
}

.chip.selected {
  background: linear-gradient(135deg, #5560d8, #8b7fe7);
  border-color: rgba(255, 255, 255, 0.8);
}

.chip-category {
  font-size: 11px;
  opacity: 0.9;
  padding: 5px 11px;
  background: rgba(255, 255, 255, 0.06);
}

/* ----- ОВЕРЛЕЙ "ГЕНЕРАЦИЯ" ----- */

.generate-status {
  position: absolute;
  inset: 10px;
  border-radius: 18px;
  background: radial-gradient(circle at top, rgba(255,255,255,0.05), rgba(0,0,0,0.9));
  display: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  z-index: 5;
}

.generate-status.visible {
  display: flex;
}

.spinner {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.16);
  border-top-color: #b3a3ff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.generate-status-text {
  font-size: 12px;
  opacity: 0.9;
}

/* ----- PAY MODAL (ПАКЕТЫ) ----- */

.pay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(16px);
  z-index: 2100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease-out;
}

.pay-backdrop.visible {
  opacity: 1;
  pointer-events: auto;
}

.pay-modal {
  width: 100%;
  max-width: 420px;
  background: rgba(24, 24, 40, 0.96);
  border-radius: 24px;
  padding: 20px 18px 18px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 24px 55px rgba(0, 0, 0, 0.95);
  color: #ffffff; /* ВЕСЬ ТЕКСТ БЕЛЫЙ */
}

.pay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.pay-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pay-close {
  border: none;
  background: transparent;
  color: #ffffffcc;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

.pay-section-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.8;
  margin-top: 6px;
  margin-bottom: 6px;
  letter-spacing: 0.12em;
}

/* Список пакетов */

.pay-packages {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pay-package {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff; /* ТЕКСТ ПАКЕТА БЕЛЫЙ */
  transition:
    background 0.14s ease-out,
    border-color 0.14s ease-out,
    transform 0.08s ease-out,
    box-shadow 0.14s ease-out;
}

.pay-package:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.pay-package.selected {
  background: linear-gradient(135deg, #6d63ff, #9a81ff);
  border-color: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 16px rgba(143, 120, 255, 0.8);
}

.pay-package-title {
  font-size: 14px;
  color: inherit;
}

.pay-package-price {
  font-size: 14px;
  font-weight: 600;
  color: inherit;
}

/* Ошибка + кнопка "далее" */

.pay-error {
  margin-top: 8px;
  font-size: 11px;
  color: #ffb3c0;
  min-height: 14px;
}

.pay-submit {
  margin-top: 12px;
  width: 100%;
  border-radius: 999px;
  border: none;
  padding: 12px 16px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  background: linear-gradient(135deg, #7b65ff, #aa88ff);
  color: #ffffff;
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.95),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* ----- AGREEMENT MODAL (СОГЛАСИЕ + EMAIL) ----- */

.agreement-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.68);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(16px);
  z-index: 2200;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease-out;
}

.agreement-backdrop.visible {
  opacity: 1;
  pointer-events: auto;
}

.agreement-modal {
  width: 100%;
  max-width: 420px;
  background: rgba(24, 24, 40, 0.96);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 24px 55px rgba(0, 0, 0, 0.95);
  padding: 20px 18px 18px;
  color: #ffffff;
}

.agreement-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.agreement-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.agreement-close {
  border: none;
  background: transparent;
  color: #ffffffcc;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

.agreement-text {
  font-size: 11px;
  opacity: 0.9;
  line-height: 1.4;
  margin-bottom: 10px;
}

.agreement-section-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.8;
  margin-bottom: 4px;
  letter-spacing: 0.12em;
}

.agreement-input {
  width: 100%;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(5, 5, 18, 0.9);
  padding: 8px 12px;
  font-size: 13px;
  color: #ffffff;
  margin-bottom: 8px;
}

.agreement-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.agreement-checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
  line-height: 1.4;
  margin-bottom: 6px;
}

.agreement-checkbox-row input[type="checkbox"] {
  margin-top: 2px;
}

.agreement-checkbox-row a {
  color: #d4c7ff;
  text-decoration: none;
}

.agreement-checkbox-row a:hover {
  text-decoration: underline;
}

.agreement-error {
  font-size: 11px;
  color: #ffb3c0;
  min-height: 14px;
  margin-bottom: 6px;
}

.agreement-submit {
  width: 100%;
  border-radius: 999px;
  border: none;
  padding: 12px 16px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  background: linear-gradient(135deg, #7b65ff, #aa88ff);
  color: #ffffff;
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.95),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

.agreement-hint {
  margin-top: 8px;
  font-size: 10px;
  opacity: 0.78;
  line-height: 1.4;
}

/* ----- RESPONSIVE ----- */

@media (min-height: 780px) {
  .preview-box {
    min-height: 260px;
  }
}
