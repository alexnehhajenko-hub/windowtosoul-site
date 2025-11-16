// WindowToSoul — основной фронтенд-скрипт
// UI: выбор стиля, кожи, мимики, поздравлений, пакетов и соглашения
// + обработка системной кнопки «Назад» на телефоне (закрывает окна, не выкидывает с сайта)

// =============================
// GLOBAL STATE
// =============================
let currentSheet = null;      // какой sheet открыт
let pkgModalOpen = false;     // открыто окно пакетов
let consentModalOpen = false; // окно с согласием
let selectedPackage = null;   // выбранный пакет

// DOM refs
const sheetBackdrop = document.getElementById("sheetBackdrop");
const sheet = document.querySelector(".sheet");
const sheetCloseBtn = document.getElementById("sheetCloseBtn");
const sheetTitle = document.getElementById("sheetTitle");
const sheetDescription = document.getElementById("sheetDescription");
const sheetOptionsRow = document.getElementById("sheetOptionsRow");
const sheetCategoryRow = document.getElementById("sheetCategoryRow");
const sheetCategoryTitle = document.getElementById("sheetCategoryTitle");

// кнопки на главном экране
const btnStyle = document.getElementById("btnStyle");
const btnSkin = document.getElementById("btnSkin");
const btnMimic = document.getElementById("btnMimic");
const btnGreetings = document.getElementById("btnGreetings");
const btnAddPhoto = document.getElementById("btnAddPhoto");
const btnGenerate = document.getElementById("btnGenerate");
const btnPay = document.getElementById("btnPay");

const fileInputHidden = document.getElementById("fileInput");

// модалка пакетов
const pkgModal = document.getElementById("packageModal");
const pkgBtn10 = document.getElementById("pkg10");
const pkgBtn20 = document.getElementById("pkg20");
const pkgBtn30 = document.getElementById("pkg30");
const pkgNextBtn = document.getElementById("pkgNext");
const pkgCloseBtn = document.getElementById("pkgClose");

// модалка согласия + email
const consentModal = document.getElementById("consentModal");
const consentCheckbox = document.getElementById("consentCheck");
const consentEmail = document.getElementById("consentEmail");
const consentPayBtn = document.getElementById("consentPay");
const consentCloseBtn = document.getElementById("consentClose");

// =============================
// BACK BUTTON (Android / iOS swipe back)
// =============================

window.addEventListener("popstate", () => {
    if (pkgModalOpen) {
        closePackageModal(false);
        return;
    }
    if (consentModalOpen) {
        closeConsentModal(false);
        return;
    }
    if (currentSheet) {
        closeSheet(false);
        return;
    }
});

// =============================
// OPEN / CLOSE SHEET
// =============================
function openSheet(title, description, options) {
    sheetTitle.textContent = title;
    sheetDescription.textContent = description;

    sheetOptionsRow.innerHTML = "";
    sheetCategoryRow.style.display = "none";
    sheetCategoryTitle.style.display = "none";

    options.forEach(opt => {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.textContent = opt.label;
        chip.onclick = () => opt.onSelect(opt.key);
        sheetOptionsRow.appendChild(chip);
    });

    sheetBackdrop.classList.add("show");
    sheet.classList.add("slide-up");
    currentSheet = true;

    history.pushState({ wtsOverlay: true }, "");
}

function closeSheet(pushHistory = true) {
    sheet.classList.remove("slide-up");
    sheetBackdrop.classList.remove("show");
    currentSheet = false;

    if (pushHistory) history.back();
}

sheetCloseBtn.onclick = () => closeSheet();

// =============================
// PACKAGE MODAL
// =============================
function openPackageModal() {
    pkgModal.classList.add("show");
    pkgModalOpen = true;
    history.pushState({ wtsOverlay: true }, "");
}

function closePackageModal(push = true) {
    pkgModal.classList.remove("show");
    pkgModalOpen = false;
    if (push) history.back();
}

btnPay.onclick = openPackageModal;
pkgCloseBtn.onclick = () => closePackageModal();

// выбор пакета
function selectPackage(p) {
    selectedPackage = p;

    pkgBtn10.classList.remove("active");
    pkgBtn20.classList.remove("active");
    pkgBtn30.classList.remove("active");

    if (p === 10) pkgBtn10.classList.add("active");
    if (p === 20) pkgBtn20.classList.add("active");
    if (p === 30) pkgBtn30.classList.add("active");
}

pkgBtn10.onclick = () => selectPackage(10);
pkgBtn20.onclick = () => selectPackage(20);
pkgBtn30.onclick = () => selectPackage(30);

pkgNextBtn.onclick = () => {
    if (!selectedPackage) {
        alert("Выберите пакет");
        return;
    }
    closePackageModal();
    openConsentModal();
};

// =============================
// CONSENT MODAL
// =============================
function openConsentModal() {
    consentModal.classList.add("show");
    consentModalOpen = true;
    history.pushState({ wtsOverlay: true }, "");
}

function closeConsentModal(pushHistory = true) {
    consentModal.classList.remove("show");
    consentModalOpen = false;
    if (pushHistory) history.back();
}

consentCloseBtn.onclick = () => closeConsentModal();

consentPayBtn.onclick = async () => {
    if (!consentCheckbox.checked) {
        alert("Поставьте галочку о согласии");
        return;
    }
    if (!consentEmail.value.trim()) {
        alert("Введите email");
        return;
    }

    // тут отправка на сервер create-checkout-session
    alert("Переход к оплате будет подключён.");
};

// =============================
// BUTTON ACTIONS (main)
// =============================
btnStyle.onclick = () =>
    openSheet("Стиль портрета", "Выберите художественный стиль:", [
        { label: "Beauty", key: "beauty", onSelect: selectStyle },
        { label: "Oil", key: "oil", onSelect: selectStyle },
        { label: "Anime", key: "anime", onSelect: selectStyle },
        { label: "Poster", key: "poster", onSelect: selectStyle },
        { label: "Classic", key: "classic", onSelect: selectStyle }
    ]);

btnSkin.onclick = () =>
    openSheet("Эффект кожи", "Выберите тип улучшения кожи:", [
        { label: "Без морщин", key: "no-wrinkles", onSelect: toggleEffect },
        { label: "Моложе", key: "younger", onSelect: toggleEffect },
        { label: "Гладкая кожа", key: "smooth-skin", onSelect: toggleEffect }
    ]);

btnMimic.onclick = () =>
    openSheet("Мимика", "Выберите выражение лица:", [
        { label: "Нейтральное", key: "neutral", onSelect: toggleEffect },
        { label: "Лёгкая улыбка", key: "smile-soft", onSelect: toggleEffect },
        { label: "Большая улыбка", key: "smile-big", onSelect: toggleEffect },
        { label: "Голливудская улыбка", key: "smile-hollywood", onSelect: toggleEffect },
        { label: "Смех", key: "laugh", onSelect: toggleEffect }
    ]);

btnGreetings.onclick = () =>
    openSheet("Поздравления", "Выберите тематическое оформление:", [
        { label: "Новый год", key: "new-year", onSelect: selectGreeting },
        { label: "День рождения", key: "birthday", onSelect: selectGreeting },
        { label: "Смешное", key: "funny", onSelect: selectGreeting },
        { label: "Страшное", key: "scary", onSelect: selectGreeting }
    ]);

// загрузка фото
btnAddPhoto.onclick = () => fileInputHidden.click();
fileInputHidden.onchange = () => {
    alert("Фото выбрано. (UI предпросмотра будет подключён)");
};

// генерация
btnGenerate.onclick = () => {
    alert("Генерация будет подключена в следующем шаге.");
};

// =============================
// LOGIC HANDLERS
// =============================
function selectStyle(styleKey) {
    console.log("Стиль:", styleKey);
    closeSheet();
}

function toggleEffect(effectKey) {
    console.log("Эффект:", effectKey);
    closeSheet();
}

function selectGreeting(gKey) {
    console.log("Поздравление:", gKey);
    closeSheet();
}