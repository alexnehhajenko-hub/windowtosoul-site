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
    beauty: "Beauty retouch",
    oil: "Oil painting",
    anime: "Anime",
    poster: "Movie poster",
    classic: "Classic portrait",
    royal_old: "Old royal painting",
    neon: "Neon cyberpunk",
    devil: "Demon / Devil",
    angel: "Angel light",
    vampire: "Vampire",
    ghost: "Ghost / Horror",
    comic: "Comic / Pop art",
    fire: "Fire & energy",
    god_light: "God of light"
  },
  ru: {
    beauty: "Красивый портрет",
    oil: "Картина маслом",
    anime: "Аниме",
    poster: "Кино-постер",
    classic: "Классический портрет",
    royal_old: "Старинный королевский портрет",
    neon: "Неоновый киберпанк",
    devil: "Демон / дьявол",
    angel: "Ангельский свет",
    vampire: "Вампир",
    ghost: "Призрак / хоррор",
    comic: "Комикс / поп-арт",
    fire: "Огонь и энергия",
    god_light: "Бог света"
  },
  de: {
    beauty: "Beauty-Porträt",
    oil: "Ölgemälde",
    anime: "Anime",
    poster: "Filmplakat",
    classic: "Klassisches Porträt",
    royal_old: "Altes königliches Gemälde",
    neon: "Neon-Cyberpunk",
    devil: "Dämon / Teufel",
    angel: "Engel-Licht",
    vampire: "Vampir",
    ghost: "Geist / Horror",
    comic: "Comic / Pop-Art",
    fire: "Feuer und Energie",
    god_light: "Lichtgott"
  },
  es: {
    beauty: "Retrato beauty",
    oil: "Óleo",
    anime: "Anime",
    poster: "Póster de cine",
    classic: "Retrato clásico",
    royal_old: "Retrato real antiguo",
    neon: "Neón cyberpunk",
    devil: "Demonio",
    angel: "Luz de ángel",
    vampire: "Vampiro",
    ghost: "Fantasma / terror",
    comic: "Cómic / pop art",
    fire: "Fuego y energía",
    god_light: "Dios de la luz"
  }
};

// ──────────────────────── ЭФФЕКТЫ КОЖИ ────────────────────────

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
    younger: "Моложе и свежий вид",
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
    "classic",
    "anime",
    "poster",
    "royal_old",
    "neon",
    "devil",
    "angel",
    "vampire",
    "ghost",
    "comic",
    "fire",
    "god_light"
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