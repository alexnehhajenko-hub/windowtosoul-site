// assets/js/events.js
// Подписывает кнопки на нужные действия.

import { els, setLanguage } from "./interface.js";
import {
  openStyleSheet,
  openSkinSheet,
  openMimicSheet,
  openGreetingSheet
} from "./effects.js";
import { handleGenerateClick, handleFileSelected } from "./generation.js";
import {
  openPayModal,
  closePayModal,
  selectPack,
  handlePayNext,
  closeAgreementModal,
  handleAgreeConfirm
} from "./payment.js";

export function attachMainHandlers() {
  if (els.btnStyle) {
    els.btnStyle.addEventListener("click", () => openStyleSheet());
  }
  if (els.btnSkin) {
    els.btnSkin.addEventListener("click", () => openSkinSheet());
  }
  if (els.btnMimic) {
    els.btnMimic.addEventListener("click", () => openMimicSheet());
  }
  if (els.btnGreetings) {
    els.btnGreetings.addEventListener("click", () => openGreetingSheet());
  }
  if (els.btnGenerate) {
    els.btnGenerate.addEventListener("click", () => handleGenerateClick());
  }
  if (els.btnAddPhoto) {
    els.btnAddPhoto.addEventListener("click", () => {
      if (els.fileInput) els.fileInput.click();
    });
  }
  if (els.fileInput) {
    els.fileInput.addEventListener("change", handleFileSelected);
  }

  if (els.btnPay) {
    els.btnPay.addEventListener("click", () => openPayModal());
  }
  if (els.payCloseBtn) {
    els.payCloseBtn.addEventListener("click", () => closePayModal());
  }
  if (els.pkg10) {
    els.pkg10.addEventListener("click", () => selectPack("pack10"));
  }
  if (els.pkg20) {
    els.pkg20.addEventListener("click", () => selectPack("pack20"));
  }
  if (els.pkg30) {
    els.pkg30.addEventListener("click", () => selectPack("pack30"));
  }
  if (els.payNextBtn) {
    els.payNextBtn.addEventListener("click", () => handlePayNext());
  }

  if (els.agreementCloseBtn) {
    els.agreementCloseBtn.addEventListener("click", () =>
      closeAgreementModal()
    );
  }
  if (els.agreePayBtn) {
    els.agreePayBtn.addEventListener("click", () => handleAgreeConfirm());
  }

  if (els.sheetCloseBtn) {
    els.sheetCloseBtn.addEventListener("click", () => {
      const event = new Event("popstate");
      window.dispatchEvent(event);
    });
  }

  if (els.downloadLink) {
    els.downloadLink.addEventListener("click", (e) => {
      if (!els.previewImage || !els.previewImage.src) {
        e.preventDefault();
      }
    });
  }

  // Переключение языков, если кнопки есть в верстке
  if (els.btnLangEn) {
    els.btnLangEn.addEventListener("click", () => setLanguage("en"));
  }
  if (els.btnLangDe) {
    els.btnLangDe.addEventListener("click", () => setLanguage("de"));
  }
  if (els.btnLangEs) {
    els.btnLangEs.addEventListener("click", () => setLanguage("es"));
  }
  if (els.btnLangRu) {
    els.btnLangRu.addEventListener("click", () => setLanguage("ru"));
  }
}