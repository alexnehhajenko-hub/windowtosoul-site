// assets/js/payment.js
// Оплата Stripe + окно согласия/email.

import {
  appState,
  STORAGE_KEYS,
  PACK_SIZES,
  UI_TEXT,
  DEMO_MODE
} from "./state.js";
import { els, setLanguage, refreshSelectionChips, setLayer } from "./interface.js";

export function openPayModal() {
  if (DEMO_MODE) {
    // в демо просто показываем окно согласия
    openAgreementModal();
    return;
  }

  if (!els.payBackdrop) return;
  els.payBackdrop.style.display = "flex";
  if (els.payError) els.payError.textContent = "";
  setLayer("pay", true);
}

export function closePayModal(pushHistory = true) {
  if (!els.payBackdrop) return;
  els.payBackdrop.style.display = "none";
  if (pushHistory) setLayer("home", true);
}

export function selectPack(packKey) {
  appState.selectedPack = packKey;
  try {
    window.localStorage.setItem(STORAGE_KEYS.SELECTED_PACK, packKey);
  } catch (e) {
    console.warn("Cannot store selected pack", e);
  }

  if (els.payError) els.payError.textContent = "";

  const all = [els.pkg10, els.pkg20, els.pkg30];
  all.forEach((btn) => {
    if (!btn) return;
    if (btn.dataset.package === packKey) {
      btn.classList.add("pay-package--selected");
    } else {
      btn.classList.remove("pay-package--selected");
    }
  });

  refreshSelectionChips();
}

export function handlePayNext() {
  if (DEMO_MODE) {
    openAgreementModal();
    return;
  }

  if (!appState.selectedPack) {
    const t = UI_TEXT[appState.language] || UI_TEXT.en;
    if (els.payError) {
      els.payError.textContent =
        t.alertSelectPack || "Please select a package.";
    } else {
      alert(t.alertSelectPack || "Please select a package.");
    }
    return;
  }
  closePayModal(false);
  openAgreementModal();
}

export function openAgreementModal() {
  if (!els.agreementBackdrop) return;

  if (els.agreeError) els.agreeError.textContent = "";

  if (els.agreeEmail && appState.userEmail) {
    els.agreeEmail.value = appState.userEmail;
  }

  if (els.agreeCheckbox) {
    els.agreeCheckbox.checked = appState.userAgreed || false;
  }

  els.agreementBackdrop.style.display = "flex";
  setLayer("agree", true);
}

export function closeAgreementModal(pushHistory = true) {
  if (!els.agreementBackdrop) return;
  els.agreementBackdrop.style.display = "none";
  if (pushHistory) setLayer("home", true);
}

export function handleAgreeConfirm() {
  const t = UI_TEXT[appState.language] || UI_TEXT.en;

  const email = (els.agreeEmail && els.agreeEmail.value.trim()) || "";
  const checked = els.agreeCheckbox && els.agreeCheckbox.checked;

  if (!email) {
    if (els.agreeError) els.agreeError.textContent = t.alertEmailMissing;
    return;
  }
  if (!checked) {
    if (els.agreeError) els.agreeError.textContent = t.alertAgreeMissing;
    return;
  }

  const confirmText =
    "By continuing, you agree that:\n\n" +
    "• your photo and generated portraits will be sent to an external AI service for processing;\n" +
    "• processing is automatic, without manual moderation;\n" +
    "• you have the rights to the uploaded images and allow this processing.\n\n" +
    'Press "OK", if you agree.';
  const ok = window.confirm(confirmText);
  if (!ok) {
    return;
  }

  if (els.agreeError) els.agreeError.textContent = "";

  appState.userEmail = email;
  appState.userAgreed = true;

  try {
    window.localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
    window.localStorage.setItem(STORAGE_KEYS.USER_AGREED, "1");
  } catch (e) {
    console.warn("Cannot store email/agreement", e);
  }

  if (DEMO_MODE) {
    closeAgreementModal(false);

    if (appState.creditsTotal <= 0) {
      appState.creditsTotal =  DEMO_SESSION_LIMIT;
      appState.creditsUsed = 0;
      try {
        window.localStorage.setItem(
          STORAGE_KEYS.CREDITS_TOTAL,
          String(appState.creditsTotal)
        );
        window.localStorage.setItem(
          STORAGE_KEYS.CREDITS_USED,
          String(appState.creditsUsed)
        );
      } catch (e) {
        console.warn("Cannot store demo credits", e);
      }
    }

    refreshSelectionChips();
  } else {
    startStripeCheckout(email);
  }
}

export async function startStripeCheckout(email) {
  const t = UI_TEXT[appState.language] || UI_TEXT.en;

  if (!appState.selectedPack) {
    alert(t.alertSelectPack || "Please select a package.");
    return;
  }

  if (appState.isPaying) return;
  appState.isPaying = true;

  try {
    const resp = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pack: appState.selectedPack,
        email
      })
    });

    if (!resp.ok) {
      throw new Error("Server returned error.");
    }

    const data = await resp.json();
    if (!data || !data.sessionId || !data.publishableKey) {
      throw new Error("Invalid response from payment server.");
    }

    closeAgreementModal(false);

    const stripe = window.Stripe
      ? window.Stripe(data.publishableKey)
      : null;

    if (!stripe) {
      alert(t.alertStripeMissing || UI_TEXT.en.alertStripeMissing);
      return;
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId: data.sessionId
    });

    if (error) {
      console.error("Stripe redirect error:", error);
      alert(
        "Could not open payment page: " + (error.message || String(error))
      );
    }
  } catch (err) {
    console.error("PAY ERROR:", err);
    alert(t.alertPaymentCreateFailed || UI_TEXT.en.alertPaymentCreateFailed);
  } finally {
    appState.isPaying = false;
  }
}

export function handleStripeStatusFromUrl() {
  try {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
    if (!status) return;

    if (status === "success") {
      appState.hasActivePack = true;
      try {
        window.localStorage.setItem(STORAGE_KEYS.HAS_ACTIVE_PACK, "1");
      } catch (e) {
        console.warn("Cannot write localStorage", e);
      }

      const storedPack = window.localStorage.getItem(
        STORAGE_KEYS.SELECTED_PACK
      );
      const packKey = storedPack || appState.selectedPack;
      const size = PACK_SIZES[packKey] || 0;
      if (size > 0) {
        appState.creditsTotal = size;
        appState.creditsUsed = 0;
        try {
          window.localStorage.setItem(
            STORAGE_KEYS.CREDITS_TOTAL,
            String(size)
          );
          window.localStorage.setItem(STORAGE_KEYS.CREDITS_USED, "0");
        } catch (e) {
          console.warn("Cannot store credits after payment", e);
        }
      }

      const t = UI_TEXT[appState.language] || UI_TEXT.en;
      alert(t.paymentSuccess || UI_TEXT.en.paymentSuccess);
    } else if (status === "cancel") {
      console.log("Stripe checkout cancelled");
    }

    url.searchParams.delete("status");
    url.searchParams.delete("session_id");
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "", url.toString());
    }

    refreshSelectionChips();
  } catch (e) {
    console.warn("Cannot parse URL for Stripe status", e);
  }
}