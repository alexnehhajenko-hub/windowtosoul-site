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

export function openSkinSheet() {
  const lang = appState.language;
  const sheet = SHEET_TEXT[lang] || SHEET_TEXT.en;

  const optionsConfig = [
    { value: "no-wrinkles", label: "No wrinkles" },
    { value: "younger", label: "Younger by 10–20 years" },
    { value: "smooth-skin", label: "Smooth skin" },
    { value: "glow-golden", label: "Golden glow ✨" },
    { value: "cinematic-light", label: "Cinematic light 🎬" }
  ];

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
        removeAllMimicEffects();
        toggleEffect(value);
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