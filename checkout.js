// /checkout.js

// Требования к верстке:
//  - input с email имеет id="user-email"
//  - кнопка "Перейти к оплате" имеет id="pay-button"

async function createCheckoutSession() {
  const emailInput = document.getElementById("user-email");
  const email = emailInput ? emailInput.value.trim() : "";

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    let data = null;
    let rawText = null;

    try {
      rawText = await response.text();
      data = rawText ? JSON.parse(rawText) : null;
    } catch (e) {
      // ответ не JSON — оставим текст как есть
    }

    // Если статус не 2xx — покажем, ЧТО именно вернул сервер
    if (!response.ok) {
      const msgFromServer =
        (data && (data.error || data.message)) || rawText || "";
      const msg =
        "Ошибка при создании оплаты.\n\n" +
        "HTTP статус: " +
        response.status +
        "\n" +
        (msgFromServer ? "Ответ сервера: " + msgFromServer : "");
      throw new Error(msg);
    }

    if (!data || !data.ok || !data.url) {
      const msg =
        (data && data.error) ||
        "Сервер не вернул ссылку на оплату. Попробуйте ещё раз.";
      throw new Error(msg);
    }

    // Всё ок — отправляем пользователя на Stripe Checkout
    window.location.href = data.url;
  } catch (err) {
    console.error(err);
    alert(err.message || "Ошибка при создании оплаты. Попробуйте ещё раз.");
  }
}

function initCheckoutButton() {
  const button = document.getElementById("pay-button");
  if (!button) {
    console.warn("Checkout button with id='pay-button' not found");
    return;
  }

  button.addEventListener("click", async (event) => {
    event.preventDefault();

    if (button.disabled) return;

    button.disabled = true;
    const oldText = button.innerText;
    button.innerText = "Loading…";

    try {
      await createCheckoutSession();
    } finally {
      button.disabled = false;
      button.innerText = oldText;
    }
  });
}

document.addEventListener("DOMContentLoaded", initCheckoutButton);
