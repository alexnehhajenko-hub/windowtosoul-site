// assets/js/interface.js
// Интерфейс: DOM, языки, общий sheet, чипы, слои.

import {
  SUPPORT_EMAIL,
  UI_TEXT,
  SUPPORTED_LANGS,
  GREETING_TEXT,
  SHEET_TEXT,
  EFFECT_CHIP_LABELS_EN,
  STYLE_LABELS_EN,
  DEMO_MODE,
  STORAGE_KEYS,
  appState
} from "./state.js";

export const els = {};

export function bindElements() {
  els.appSubtitle = document.querySelector(".app-subtitle");

  els.previewLabel = document.querySelector(".preview-label");
  els.previewImage = document.getElementById("previewImage");
  els.previewPlaceholder = document.getElementById("previewPlaceholder");
  els.greetingOverlay = document.getElementById("greetingOverlay");
  els.generateStatus = document.getElementById("generateStatus");
  els.generateStatusText = document.querySelector(".generate-status-text");
  els.selectionRow = document.getElementById("selectionRow");

  els.btnStyle = document.getElementById("btnStyle");
  els.btnSkin = document.getElementById("btnSkin");
  els.btnMimic = document.getElementById("btnMimic");
  els.btnGreetings = document.getElementById("btnGreetings");
  els.btnGenerate = document.getElementById("btnGenerate");
  els.btnAddPhoto = document.getElementById("btnAddPhoto");
  els.btnPay = document.getElementById("btnPay");

  els.btnLangEn = document.getElementById("langEn");
  els.btnLangDe = document.getElementById("langDe");
  els.btnLangEs = document.getElementById("langEs");
  els.btnLangRu = document.getElementById("langRu");

  els.supportEmail = document.getElementById("supportEmail");

  els.fileInput = document.getElementById("fileInput");

  els.sheetBackdrop = document.getElementById("sheetBackdrop");
  els.sheetTitle = document.getElementById("sheetTitle");
  els.sheetDescription = document.getElementById("sheetDescription");
  els.sheetCategoryTitle = document.getElementById("sheetCategoryTitle");
  els.sheetCategoryRow = document.getElementById("sheetCategoryRow");
  els.sheetOptionsTitle = document.getElementById("sheetOptionsTitle");
  els.sheetOptionsRow = document.getElementById("sheetOptionsRow");
  els.sheetCloseBtn = document.getElementById("sheetCloseBtn");

  els.payBackdrop = document.getElementById("payBackdrop");
  els.payCloseBtn = document.getElementById("payCloseBtn");
  els.pkg10 = document.getElementById("pkg10");
  els.pkg20 = document.getElementById("pkg20");
  els.pkg30 = document.getElementById("pkg30");
  els.payError = document.getElementById("payError");
  els.payNextBtn = document.getElementById("payNextBtn");
  els.payTitle = document.querySelector(".pay-title");
  els.paySectionTitle = document.querySelector(".pay-section-title");

  els.agreementBackdrop = document.getElementById("agreementBackdrop");
  els.agreementCloseBtn = document.getElementById("agreementCloseBtn");
  els.agreeEmail = document.getElementById("agreeEmail");
  els.agreeCheckbox = document.getElementById("agreeCheckbox");
  els.agreeError = document.getElementById("agreeError");
  els.agreePayBtn = document.getElementById("agreePayBtn");
  els.agreementTitle = document.querySelector(".agreement-title");
  els.agreementText = document.querySelector(".agreement-text");
  els.agreementEmailTitle = document.querySelector(
    ".agreement-section-title"
  );
  els.agreementCheckboxLabel = document.querySelector(
    ".agreement-checkbox-row span"
  );
  els.agreementHint = document.querySelector(".agreement-hint");

  els.downloadLink = document.getElementById("downloadLink");
}

export function setupSupportEmail() {
  if (!els.supportEmail) return;
  els.supportEmail.href = `mailto:${SUPPORT_EMAIL}`;
  els.supportEmail.textContent = SUPPORT_EMAIL;
}

export function hideOverlaysOnStart() {
  if (els.sheetBackdrop) els.sheetBackdrop.style.display = "none";
  if (els.payBackdrop) els.payBackdrop.style.display = "none";
  if (els.agreementBackdrop) els.agreementBackdrop.style.display = "none";
  if (els.greetingOverlay) els.greetingOverlay.style.display = "none";
}

// Смена языка UI
export function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    lang = "en";
  }
  appState.language = lang;

  try {
    window.localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  } catch (e) {
    console.warn("Cannot store language", e);
  }

  const t = UI_TEXT[lang] || UI_TEXT.en;

  if (els.appSubtitle) {
    els.appSubtitle.textContent = t.subtitle;
  }

  if (els.previewLabel) {
    els.previewLabel.textContent = t.previewLabel;
  }
  if (els.previewPlaceholder) {
    els.previewPlaceholder.innerHTML = t.previewPlaceholder
      .split("\n")
      .join("<br>");
  }

  if (els.generateStatusText) {
    els.generateStatusText.textContent = t.generateStatus;
  }

  function setButtonLabel(btn, text) {
    if (!btn) return;
    const spans = btn.querySelectorAll("span");
    if (spans.length >= 2) {
      spans[1].textContent = text;
    }
  }

  setButtonLabel(els.btnStyle, t.btnStyle);
  setButtonLabel(els.btnSkin, t.btnSkin);
  setButtonLabel(els.btnMimic, t.btnMimic);
  setButtonLabel(els.btnGreetings, t.btnGreetings);
  setButtonLabel(els.btnGenerate, t.btnGenerate);
  setButtonLabel(els.btnAddPhoto, t.btnAddPhoto);
  setButtonLabel(els.btnPay, t.btnPay);

  if (els.sheetOptionsTitle) {
    els.sheetOptionsTitle.textContent = t.sheetOptionsTitle;
  }
  if (els.sheetCategoryTitle) {
    els.sheetCategoryTitle.textContent = t.sheetCategoryTitle;
  }

  if (els.payTitle) els.payTitle.textContent = t.payTitle;
  if (els.paySectionTitle) els.paySectionTitle.textContent = t.paySectionTitle;
  if (els.pkg10) {
    const titleEl = els.pkg10.querySelector(".pay-package-title");
    if (titleEl) titleEl.textContent = t.payPack10Title;
  }
  if (els.pkg20) {
    const titleEl = els.pkg20.querySelector(".pay-package-title");
    if (titleEl) titleEl.textContent = t.payPack20Title;
  }
  if (els.pkg30) {
    const titleEl = els.pkg30.querySelector(".pay-package-title");
    if (titleEl) titleEl.textContent = t.payPack30Title;
  }
  if (els.payNextBtn) els.payNextBtn.textContent = t.payNext;

  if (els.agreementTitle) els.agreementTitle.textContent = t.agreementTitle;
  if (els.agreementText) {
    els.agreementText.innerHTML = t.agreementText
      .split("\n")
      .join("<br><br>");
  }
  if (els.agreementEmailTitle) {
    els.agreementEmailTitle.textContent = t.agreementEmailTitle;
  }
  if (els.agreementCheckboxLabel) {
    els.agreementCheckboxLabel.innerHTML = t.agreementCheckboxHtml;
  }
  if (els.agreementHint) {
    els.agreementHint.textContent = t.agreementHint;
  }
  if (els.agreePayBtn) {
    els.agreePayBtn.textContent = t.agreementSubmitDemo;
  }

  if (els.downloadLink) {
    els.downloadLink.textContent = t.download;
  }

  const supportBlock = els.supportEmail && els.supportEmail.parentElement;
  if (supportBlock) {
    supportBlock.innerHTML = `${t.supportLabel} <a id="supportEmail"></a>`;
    els.supportEmail = document.getElementById("supportEmail");
    setupSupportEmail();
  }

  const allButtons = [
    els.btnLangEn,
    els.btnLangDe,
    els.btnLangEs,
    els.btnLangRu
  ];
  allButtons.forEach((b) => {
    if (!b) return;
    b.classList.remove("lang-selected");
  });
  const mapping = {
    en: els.btnLangEn,
    de: els.btnLangDe,
    es: els.btnLangEs,
    ru: els.btnLangRu
  };
  if (mapping[lang]) {
    mapping[lang].classList.add("lang-selected");
  }
}

export function setLayer(newLayer, pushToHistory = true) {
  appState.layer = newLayer;
  if (pushToHistory && window.history && window.history.pushState) {
    window.history.pushState({ layer: newLayer }, "", window.location.href);
  }
}

// Общий sheet
export function openSheet({ title, description, categories, options }) {
  if (!els.sheetBackdrop) return;

  els.sheetTitle.textContent = title || "";
  els.sheetDescription.textContent = description || "";

  if (categories && categories.length > 0) {
    els.sheetCategoryTitle.style.display = "block";
    els.sheetCategoryRow.style.display = "flex";
    els.sheetCategoryRow.innerHTML = "";

    categories.forEach((cat) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = cat.label;
      chip.dataset.value = cat.value;
      chip.addEventListener("click", () => {
        if (typeof cat.onClick === "function") cat.onClick(cat.value);
      });
      els.sheetCategoryRow.appendChild(chip);
    });
  } else {
    els.sheetCategoryTitle.style.display = "none";
    els.sheetCategoryRow.style.display = "none";
    els.sheetCategoryRow.innerHTML = "";
  }

  els.sheetOptionsRow.innerHTML = "";
  (options || []).forEach((opt) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = opt.label;
    chip.dataset.value = opt.value;

    if (opt.selected) {
      chip.classList.add("chip-selected");
    }

    chip.addEventListener("click", () => {
      if (typeof opt.onClick === "function") {
        opt.onClick(opt.value);
      }
    });

    els.sheetOptionsRow.appendChild(chip);
  });

  els.sheetBackdrop.style.display = "flex";
  setLayer("sheet", true);
}

export function closeSheet(pushHistory = true) {
  if (!els.sheetBackdrop) return;
  els.sheetBackdrop.style.display = "none";
  if (pushHistory) setLayer("home", true);
}

// Чипы под предпросмотром
export function refreshSelectionChips() {
  if (!els.selectionRow) return;

  els.selectionRow.innerHTML = "";

  function addChip(label) {
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = label;
    els.selectionRow.appendChild(chip);
  }

  if (appState.selectedStyle) {
    const name =
      STYLE_LABELS_EN[appState.selectedStyle] || appState.selectedStyle;
    addChip(`Style: ${name}`);
  }

  appState.selectedEffects.forEach((e) => {
    const label = EFFECT_CHIP_LABELS_EN[e] || e;
    addChip(label);
  });

  if (appState.selectedGreeting) {
    addChip(`Greeting selected`);
  }

  if (appState.selectedPack) {
    const map = {
      pack10: "Package: 10 generations",
      pack20: "Package: 20 generations",
      pack30: "Package: 30 generations"
    };
    addChip(map[appState.selectedPack] || "Package selected");
  }

  if (appState.creditsTotal > 0) {
    addChip(`Used ${appState.creditsUsed} of ${appState.creditsTotal}`);
  }

  if (DEMO_MODE) {
    addChip("Demo: 5 generations with email");
  } else if (appState.hasActivePack) {
    addChip("Paid: package active");
  } else {
    addChip("No paid package yet");
  }
}

// Текст поверх картинки (пока просто включаем/выключаем, сам текст в письме)
export function updateGreetingOverlay() {
  if (!els.greetingOverlay) return;

  const key = appState.selectedGreeting;
  if (!key) {
    els.greetingOverlay.textContent = "";
    els.greetingOverlay.style.display = "none";
    return;
  }

  const text = GREETING_TEXT[key] || "";
  els.greetingOverlay.textContent = text;
  els.greetingOverlay.style.display = "block";
}