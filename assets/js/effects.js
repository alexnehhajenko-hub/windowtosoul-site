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

export function toggleEffect(value) {
  const idx = appState.selectedEffects.indexOf(value);
  if (idx >= 0) {
    appState.selectedEffects.splice(idx, 1);
  } else {
    appState.selectedEffects.push(value);
  }
}

export function removeSkinEffects() {
  const skinKeys = [
    "hollywood-pro",
    "no-wrinkles",
    "younger",
    "smooth-skin",
    "beauty-one-touch",
    "glow-golden",
    "cinematic-light"
  ];
  appState.selectedEffects = appState.selectedEffects.filter((e) => !skinKeys.includes(e));
}

export function removeWowEffects() {
  const wowKeys = [
    "glow-golden",
    "cinematic-light",
    "studio-glam",
    "luxury-editorial",
    "neon-pop"
  ];
  appState.selectedEffects = appState.selectedEffects.filter((e) => !wowKeys.includes(e));
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
  appState.selectedEffects = appState.selectedEffects.filter((e) => !mimicKeys.includes(e));
}

export function openStyleSheet() {
  const lang = appState.language;
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;

  const optionsConfig = ["beauty", "oil", "anime", "poster", "classic"];

  const options = optionsConfig.map((value) => ({
    value,
    label: STYLE_LABELS_EN[value] || value,
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

function openSkinWowSheet(tab) {
  const lang = appState.language;
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;

  const categories = [
    { value: "skin", label: "Skin", selected: tab === "skin", onClick: () => openSkinWowSheet("skin") },
    { value: "wow", label: "Wow", selected: tab === "wow", onClick: () => openSkinWowSheet("wow") }
  ];

  const skinOptionsConfig = [
    { value: "hollywood-pro", label: "Hollywood Pro ⭐️" },
    { value: "no-wrinkles", label: "No wrinkles" },
    { value: "younger", label: "Younger by 5–10 years" },
    { value: "smooth-skin", label: "Smooth skin" },
    { value: "beauty-one-touch", label: "Beauty one-touch 💎" }
  ];

  const wowOptionsConfig = [
    { value: "glow-golden", label: "Golden glow ✨" },
    { value: "cinematic-light", label: "Cinematic light 🎬" },
    { value: "studio-glam", label: "Studio glam 💄" },
    { value: "luxury-editorial", label: "Luxury editorial 📰" },
    { value: "neon-pop", label: "Neon pop 🌈" }
  ];

  const optionsConfig = tab === "wow" ? wowOptionsConfig : skinOptionsConfig;

  openSheet({
    title: sheet.skinTitle,
    description: sheet.skinDescription,
    categories,
    options: optionsConfig.map((opt) => ({
      ...opt,
      selected: appState.selectedEffects.includes(opt.value),
      onClick: (value) => {
        const wasSelected = appState.selectedEffects.includes(value);

        if (tab === "wow") removeWowEffects();
        else removeSkinEffects();

        if (!wasSelected) toggleEffect(value);

        refreshSelectionChips();
        closeSheet();
      }
    }))
  });
}

export function openSkinSheet() {
  openSkinWowSheet("skin");
}

export function openMimicSheet() {
  const lang = appState.language;
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;

  const optionsConfig = [
    { value: "smile-soft", label: "Soft smile 🙂" },
    { value: "smile-big", label: "Big smile 😄" },
    { value: "smile-hollywood", label: "Hollywood smile 😁" },
    { value: "laugh", label: "Laugh 😂" },
    { value: "surprised-wow", label: "Wow surprise 😲" },
    { value: "eyes-bigger", label: "Slightly bigger eyes 👁" },
    { value: "eyes-brighter", label: "Brighter eyes ✨" },
    { value: "neutral", label: "Neutral face" },
    { value: "serious", label: "Serious look" }
  ];

  openSheet({
    title: sheet.mimicTitle,
    description: sheet.mimicDescription,
    options: optionsConfig.map((opt) => ({
      ...opt,
      selected: appState.selectedEffects.includes(opt.value),
      onClick: (value) => {
        const wasSelected = appState.selectedEffects.includes(value);

        removeAllMimicEffects();
        if (!wasSelected) toggleEffect(value);

        refreshSelectionChips();
        closeSheet();
      }
    }))
  });
}

export function openGreetingSheet() {
  const lang = appState.language;
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;
  const labels = GREETING_LABELS[lang] || GREETING_LABELS.en;

  // ✅ Extended list: greetings + props/costumes
  const optionsConfig = [
    "new-year",
    "birthday",
    "funny",
    "scary",
    "santa-hat",
    "devil-eyes",
    "viking-helm",
    "samurai-helm",
    "blue-demon"
  ];

  const options = optionsConfig.map((value) => ({
    value,
    label: labels[value] || value,
    selected: appState.selectedGreeting === value,
    onClick: (val) => {
      appState.selectedGreeting = appState.selectedGreeting === val ? null : val;
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