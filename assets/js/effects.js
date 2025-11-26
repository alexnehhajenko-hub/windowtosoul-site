// assets/js/effects.js
// Логика выбора стиля, кожи, мимики и поздравлений.

import {
  appState,
  SHEET_TEXT,
  STYLE_LABELS_EN,
  GREETING_LABELS
} from "./state.js";
import {
  openSheet,
  closeSheet,
  refreshSelectionChips,
  updateGreetingOverlay
} from "./interface.js";

// ───────────────────────── СТИЛИ ─────────────────────────

// Локализованные названия стилей
const STYLE_LABELS = {
  en: {
    beauty: "Beauty",
    oil: "Oil painting",
    anime: "Anime",
    poster: "Poster",
    classic: "Classic portrait",

    // 🔹 НОВЫЕ СТИЛИ
    "old-photo": "Vintage torn photo",
    "old-painting": "Antique painting",
    "dark-demon": "Dark demon style"
  },
  ru: {
    beauty: "Красивый портрет",
    oil: "Картина маслом",
    anime: "Аниме",
    poster: "Постер",
    classic: "Классический портрет",

    "old-photo": "Старинное фото (порванное)",
    "old-painting": "Старинная картина",
    "dark-demon": "Тёмный дьявольский стиль"
  },
  de: {
    beauty: "Beauty-Porträt",
    oil: "Ölgemälde",
    anime: "Anime",
    poster: "Poster",
    classic: "Klassisches Porträt",

    "old-photo": "Altes Foto (beschädigt)",
    "old-painting": "Antikes Gemälde",
    "dark-demon": "Dunkler Dämonenstil"
  },
  es: {
    beauty: "Retrato beauty",
    oil: "Óleo",
    anime: "Anime",
    poster: "Póster",
    classic: "Retrato clásico",

    "old-photo": "Foto antigua rota",
    "old-painting": "Cuadro antiguo",
    "dark-demon": "Estilo demonio oscuro"
  }
};

// ──────────────────────── ЭФФЕКТЫ КОЖИ ────────────────────────

// Локализованные названия эффектов кожи
const SKIN_LABELS = {
  en: {
    "beauty-one-touch": "One-touch beauty (smooth skin, no acne)",
    "no-wrinkles": "Less wrinkles",
    younger: "Look a bit younger",
    "smooth-skin": "Smooth skin",
    "glow-golden": "Golden glow ✨",
    "cinematic-light": "Cinematic light 🎬"
  },
  ru: {
    "beauty-one-touch": "Ровная кожа, без прыщей",
    "no-wrinkles": "Меньше морщин",
    younger: "Моложе на 10–15 лет",
    "smooth-skin": "Гладкая кожа",
    "glow-golden": "Золотистое свечение ✨",
    "cinematic-light": "Кино-свет 🎬"
  },
  de: {
    "beauty-one-touch": "Sanfte Haut, ohne Akne",
    "no-wrinkles": "Weniger Falten",
    younger: "Etwas jünger aussehen",
    "smooth-skin": "Glatte Haut",
    "glow-golden": "Goldener Glow ✨",
    "cinematic-light": "Kinematisches Licht 🎬"
  },
  es: {
    "beauty-one-touch": "Piel uniforme, sin acné",
    "no-wrinkles": "Menos arrugas",
    younger: "Un poco más joven",
    "smooth-skin": "Piel suave",
    "glow-golden": "Brillo dorado ✨",
    "cinematic-light": "Luz cinematográfica 🎬"
  }
};

// ───────────────────────── МИМИКА ─────────────────────────

// Локализованные названия мимики
const MIMIC_LABELS = {
  en: {
    "smile-soft": "Soft smile 🙂",
    "smile-big": "Big smile 😄",
    "smile-hollywood": "Wide smile 😁",
    laugh: "Laugh 😂",
    "surprised-wow": "Wow surprise 😲",
    "eyes-bigger": "Slightly bigger eyes 👁",
    "eyes-brighter": "Brighter eyes ✨",
    neutral: "Neutral face",
    serious: "Serious look"
  },
  ru: {
    "smile-soft": "Лёгкая улыбка 🙂",
    "smile-big": "Большая улыбка 😄",
    "smile-hollywood": "Широкая улыбка 😁",
    laugh: "Смех 😂",
    "surprised-wow": "Удивление «вау» 😲",
    "eyes-bigger": "Глаза чуть больше 👁",
    "eyes-brighter": "Более яркие глаза ✨",
    neutral: "Нейтральное лицо",
    serious: "Серьёзный взгляд"
  },
  de: {
    "smile-soft": "Sanftes Lächeln 🙂",
    "smile-big": "Großes Lächeln 😄",
    "smile-hollywood": "Breites Lächeln 😁",
    laugh: "Lachen 😂",
    "surprised-wow": "Überrascht «wow» 😲",
    "eyes-bigger": "Etwas größere Augen 👁",
    "eyes-brighter": "Hellere Augen ✨",
    neutral: "Neutrales Gesicht",
    serious: "Ernster Blick"
  },
  es: {
    "smile-soft": "Sonrisa suave 🙂",
    "smile-big": "Gran sonrisa 😄",
    "smile-hollywood": "Sonrisa amplia 😁",
    laugh: "Risa 😂",
    "surprised-wow": "Sorpresa «wow» 😲",
    "eyes-bigger": "Ojos un poco más grandes 👁",
    "eyes-brighter": "Ojos más brillantes ✨",
    neutral: "Rostro neutro",
    serious: "Mirada seria"
  }
};

// ───────────────────────── ВСПОМОГАТЕЛЬНОЕ ─────────────────────────

export function toggleEffect(value) {
  const idx = appState.selectedEffects.indexOf(value);
  if (idx >= 0) {
    appState.selectedEffects.splice(idx, 1);
  } else {
    appState.selectedEffects.push(value);
  }
}

// убираем ВСЕ skin-эффекты, чтобы в один момент был только один
export function removeSkinEffects() {
  const skinKeys = [
    "beauty-one-touch",
    "no-wrinkles",
    "younger",
    "smooth-skin",
    "glow-golden",
    "cinematic-light"
  ];
  appState.selectedEffects = appState.selectedEffects.filter(
    (e) => !skinKeys.includes(e)
  );
}

export function removeAllMimicEffects() {
  const mimicKeys = [
    "smile-soft",
    "smile-big",
    "smile-hollywood",
    "laugh",
    "surprised-wow",
    "neutral",
    "serious",
    "eyes-bigger",
    "eyes-brighter"
  ];
  appState.selectedEffects = appState.selectedEffects.filter(
    (e) => !mimicKeys.includes(e)
  );
}

// ───────────────────────── ШТОРКА СТИЛЕЙ ─────────────────────────

export function openStyleSheet() {
  const lang = appState.language || "en";
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;
  const labels = STYLE_LABELS[lang] || STYLE_LABELS.en;

  const optionsConfig = [
    "beauty",
    "oil",
    "anime",
    "poster",
    "classic",
    "old-photo",
    "old-painting",
    "dark-demon"
  ];

  const options = optionsConfig.map((value) => ({
    value,
    label: labels[value] || STYLE_LABELS_EN[value] || value,
    selected: appState.selectedStyle === value,
    onClick: (val) => {
      appState.selectedStyle = val;
      refreshSelectionChips();
      closeSheet();
    }
  }));

  openSheet({
    title: sheet.styleTitle,
    description: sheet.styleDescription,
    options
  });
}

// ───────────────────────── ШТОРКА КОЖИ ─────────────────────────

export function openSkinSheet() {
  const lang = appState.language || "en";
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;
  const labels = SKIN_LABELS[lang] || SKIN_LABELS.en;

  const values = [
    "beauty-one-touch",
    "no-wrinkles",
    "younger",
    "smooth-skin",
    "glow-golden",
    "cinematic-light"
  ];

  const optionsConfig = values.map((value) => ({
    value,
    label: labels[value] || value
  }));

  openSheet({
    title: sheet.skinTitle,
    description: sheet.skinDescription,
    options: optionsConfig.map((opt) => ({
      ...opt,
      selected: appState.selectedEffects.includes(opt.value),
      onClick: (value) => {
        removeSkinEffects();
        toggleEffect(value);
        refreshSelectionChips();
        closeSheet();
      }
    }))
  });
}

// ───────────────────────── ШТОРКА МИМИКИ ─────────────────────────

export function openMimicSheet() {
  const lang = appState.language || "en";
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;
  const labels = MIMIC_LABELS[lang] || MIMIC_LABELS.en;

  const values = [
    "smile-soft",
    "smile-big",
    "smile-hollywood",
    "laugh",
    "surprised-wow",
    "eyes-bigger",
    "eyes-brighter",
    "neutral",
    "serious"
  ];

  const optionsConfig = values.map((value) => ({
    value,
    label: labels[value] || value
  }));

  openSheet({
    title: sheet.mimicTitle,
    description: sheet.mimicDescription,
    options: optionsConfig.map((opt) => ({
      ...opt,
      selected: appState.selectedEffects.includes(opt.value),
      onClick: (value) => {
        removeAllMimicEffects();
        toggleEffect(value);
        refreshSelectionChips();
        closeSheet();
      }
    }))
  });
}

// ───────────────────────── ШТОРКА ПОЗДРАВЛЕНИЙ ─────────────────────────

export function openGreetingSheet() {
  const lang = appState.language;
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;
  const labels = GREETING_LABELS[lang] || GREETING_LABELS.en;

  const optionsConfig = ["new-year", "birthday", "funny", "scary"];

  const options = optionsConfig.map((value) => ({
    value,
    label: labels[value],
    selected: appState.selectedGreeting === value,
    onClick: (val) => {
      appState.selectedGreeting =
        appState.selectedGreeting === val ? null : val;
      refreshSelectionChips();
      updateGreetingOverlay();
      closeSheet();
    }
  }));

  openSheet({
    title: sheet.greetingTitle,
    description: sheet.greetingDescription,
    options
  });
}