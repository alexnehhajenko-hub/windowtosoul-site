// assets/email-send.js
// Кнопка "Send to email": отправляем последний видимый портрет на /api/send-portraits.

const emailRow = document.querySelector(".email-send-row");
const emailInput = document.getElementById("emailInput");
const emailButton = document.getElementById("emailSendButton");
const emailStatus = document.getElementById("emailStatus");
const previewImage = document.getElementById("previewImage");

// Проверяем, есть ли сейчас нормальный портрет
function hasPreview() {
  if (!previewImage) return false;
  const src = previewImage.src || "";
  return src.startsWith("http");
}

// Показывать / прятать блок email в зависимости от наличия портрета
function updateEmailRowVisibility() {
  if (!emailRow) return;
  emailRow.style.display = hasPreview() ? "flex" : "none";
}

// При загрузке и затем раз в секунду обновляем видимость
updateEmailRowVisibility();
setInterval(updateEmailRowVisibility, 1000);

if (emailButton && emailInput && emailStatus) {
  emailButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    emailStatus.textContent = "";

    if (!email) {
      emailStatus.textContent = "Enter your email.";
      return;
    }

    if (!hasPreview()) {
      emailStatus.textContent = "No portrait to send yet.";
      return;
    }

    emailButton.disabled = true;
    emailButton.textContent = "Sending…";

    try {
      const res = await fetch("/api/send-portraits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          images: [previewImage.src], // ТОЛЬКО текущий нормальный портрет
          total: 1,
          used: 1,
        }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (_) {}

      if (!res.ok || !data || data.ok === false) {
        console.error("SEND-PORTRAITS ERROR", { status: res.status, data });
        emailStatus.textContent =
          "Could not send email. Please try again later.";
      } else {
        emailStatus.textContent = "Portrait has been sent to your email.";
      }
    } catch (err) {
      console.error("SEND-PORTRAITS FETCH ERROR", err);
      emailStatus.textContent =
        "Network error while sending email. Check your internet.";
    } finally {
      emailButton.disabled = false;
      emailButton.textContent = "Send to email";
    }
  });
}
