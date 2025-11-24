// assets/gallery.js
// Сбор всех сгенерированных портретов текущей сессии и отправка всех на email.

const previewImage = document.getElementById("previewImage");
const galleryButton = document.getElementById("galleryButton");
const galleryBackdrop = document.getElementById("galleryBackdrop");
const galleryCloseBtn = document.getElementById("galleryCloseBtn");
const galleryGrid = document.getElementById("galleryGrid");
const galleryEmpty = document.getElementById("galleryEmpty");
const gallerySendBtn = document.getElementById("gallerySendBtn");
const galleryStatus = document.getElementById("galleryStatus");

// Для email берём либо поле под портретом, либо то, что ввели в модалке оплаты
const emailInput = document.getElementById("emailInput");
const agreeEmail = document.getElementById("agreeEmail");

let portraits = [];
let lastPreviewUrl = null;

function hasPreview() {
  if (!previewImage) return false;
  const src = previewImage.src || "";
  return src.startsWith("http");
}

// Отслеживаем смену preview и добавляем новые портреты в массив
function capturePreviewIfNeeded() {
  if (!hasPreview()) return;
  const src = previewImage.src;

  if (src === lastPreviewUrl) return;
  lastPreviewUrl = src;

  if (!portraits.includes(src)) {
    portraits.push(src);
    updateGalleryButton();
  }
}

// Обновляем текст и видимость кнопки "My portraits (N)"
function updateGalleryButton() {
  if (!galleryButton) return;

  const count = portraits.length;
  if (count === 0) {
    galleryButton.style.display = "none";
    galleryButton.textContent = "My portraits (0)";
  } else {
    galleryButton.style.display = "inline-flex";
    galleryButton.textContent = `My portraits (${count})`;
  }
}

// Рендерим галерею
function renderGallery() {
  if (!galleryGrid || !galleryEmpty) return;

  if (portraits.length === 0) {
    galleryEmpty.style.display = "block";
    galleryGrid.style.display = "none";
    galleryGrid.innerHTML = "";
    return;
  }

  galleryEmpty.style.display = "none";
  galleryGrid.style.display = "block";

  const itemsHtml = portraits
    .map(
      (url, index) => `
      <div style="margin-bottom:12px; text-align:center;">
        <div style="font-size:12px; color:#aaaaaa; margin-bottom:4px;">
          Portrait #${index + 1}
        </div>
        <a href="${url}" target="_blank" rel="noreferrer" style="text-decoration:none; color:#ffffff;">
          <img
            src="${url}"
            alt="Portrait #${index + 1}"
            style="max-width:100%; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.4); margin-bottom:4px;"
          />
          <div style="font-size:12px; color:#6ea8ff;">Open full size</div>
        </a>
      </div>
    `
    )
    .join("\n");

  galleryGrid.innerHTML = itemsHtml;
}

// Открыть / закрыть модалку
function openGallery() {
  if (!galleryBackdrop) return;
  galleryStatus.textContent = "";
  renderGallery();
  galleryBackdrop.style.display = "flex";
}

function closeGallery() {
  if (!galleryBackdrop) return;
  galleryBackdrop.style.display = "none";
}

// Отправить ВСЕ портреты на email
async function sendAllToEmail() {
  galleryStatus.textContent = "";

  if (portraits.length === 0) {
    galleryStatus.textContent = "No portraits to send yet.";
    return;
  }

  let email =
    (emailInput && emailInput.value.trim()) ||
    (agreeEmail && agreeEmail.value.trim()) ||
    "";

  if (!email) {
    galleryStatus.textContent =
      "Please enter your email under the preview or in the confirmation form.";
    return;
  }

  const imagesToSend = portraits.slice(-30); // максимум 30, на всякий случай

  gallerySendBtn.disabled = true;
  gallerySendBtn.textContent = "Sending…";

  try {
    const res = await fetch("/api/send-portraits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        images: imagesToSend,
        total: imagesToSend.length,
        used: imagesToSend.length
      })
    });

    let data = null;
    try {
      data = await res.json();
    } catch (_) {}

    if (!res.ok || !data || data.ok === false) {
      console.error("SEND-ALL ERROR", { status: res.status, data });
      galleryStatus.textContent =
        "Could not send email. Please try again later.";
    } else {
      galleryStatus.textContent =
        "All portraits have been sent to your email.";
    }
  } catch (err) {
    console.error("SEND-ALL FETCH ERROR", err);
    galleryStatus.textContent =
      "Network error while sending email. Check your internet.";
  } finally {
    gallerySendBtn.disabled = false;
    gallerySendBtn.textContent = "Send all to email";
  }
}

// Интервальный захват превью
capturePreviewIfNeeded();
updateGalleryButton();
setInterval(capturePreviewIfNeeded, 1000);

// Обработчики
if (galleryButton) {
  galleryButton.addEventListener("click", openGallery);
}
if (galleryCloseBtn) {
  galleryCloseBtn.addEventListener("click", closeGallery);
}
if (galleryBackdrop) {
  galleryBackdrop.addEventListener("click", (e) => {
    if (e.target === galleryBackdrop) {
      closeGallery();
    }
  });
}
if (gallerySendBtn) {
  gallerySendBtn.addEventListener("click", () => {
    sendAllToEmail();
  });
}