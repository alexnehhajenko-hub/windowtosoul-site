// api/generate.js — YourPhotoAI
// Генерация портрета через Replicate (FLUX-Kontext-Pro)
// Фото / эффекты кожи / мимика / поздравления
// Жёстко запрещаем любой текст/логотипы/интерфейс на итоговом фото
// НОВОЕ: максимально сохраняем ЛИЧНОСТЬ с фото (тот же человек, тот же пол)

import Replicate from "replicate";

// Стили (в том числе новый "beauty")
const STYLE_PREFIX = {
  beauty:
    [
      "high-quality beauty portrait",
      "studio lighting, bright airy tones",
      "smooth skin with gentle beauty retouch",
      // Важно: не просим рисовать абстрактную девушку,
      // а подчёркиваем, что это тот же человек
      "keep the same person as in the input photo",
      "keep the same facial structure and gender as the original",
      "natural but slightly polished look",
      "pastel or soft background"
    ].join(", "),

  oil:
    "dramatic oil painting portrait, impasto style, very visible thick brush strokes, rich oil paint texture, canvas texture, painterly background, face slightly stylized, not photorealistic, strong painterly look, soft edges",

  anime: "anime style portrait, clean lines, soft pastel shading",
  poster: "cinematic movie poster portrait, dramatic lighting, high contrast",
  classic: "classical old master portrait, realism, warm tones, detailed skin",
  default: "realistic portrait, detailed face, soft studio lighting"
};

// Эффекты: кожа + мимика
const EFFECT_PROMPTS = {
  // ----- кожа -----
  "no-wrinkles":
    [
      "reduce or remove visible facial wrinkles, especially on the forehead and around the eyes",
      "keep the same person, same facial features and bone structure",
      "do NOT change gender or identity",
      "result should look like the same person with smoother, younger-looking skin"
    ].join(", "),

  younger:
    [
      "make the person look about 15–20 years younger",
      "fresher and healthier skin, less sagging, more vibrant eyes",
      "keep the same identity, same gender and facial proportions"
    ].join(", "),

  "smooth-skin":
    [
      "smooth and even skin tone",
      "subtle beauty retouch, remove small blemishes",
      "keep pores and details slightly visible so it still feels realistic",
      "do not change identity or gender"
    ].join(", "),

  // ----- мимика -----
  "smile-soft":
    [
      "change expression to a subtle soft smile",
      "corners of the mouth slightly lifted",
      "eyes relaxed and friendly",
      "keep the same person and facial proportions"
    ].join(", "),

  "smile-big":
    [
      "change expression to a big happy smile, showing teeth",
      "cheeks slightly lifted, joyful and friendly look",
      "keep the same identity and gender as the original person"
    ].join(", "),

  "smile-hollywood":
    [
      "change expression to a wide hollywood smile with visible white teeth",
      "confident and charismatic look",
      "keep the same person, same face structure, same gender"
    ].join(", "),

  laugh:
    [
      "change expression to laughing with a bright smile",
      "very joyful and natural expression",
      "keep the same person and facial proportions"
    ].join(", "),

  neutral:
    [
      "neutral relaxed expression",
      "no visible strong emotion",
      "keep the same person and facial structure"
    ].join(", "),

  serious:
    [
      "serious focused expression",
      "no smile",
      "keep the same identity and gender"
    ].join(", "),

  "eyes-bigger":
    [
      "slightly bigger, more open eyes",
      "more attentive and awake look",
      "keep realistic proportions and do not change identity"
    ].join(", "),

  "eyes-brighter":
    [
      "brighter, more vivid eyes",
      "slightly more contrast and clarity in the eyes",
      "keep the same color and shape of the eyes"
    ].join(", ")
};

// Поздравления — только атмосфера, БЕЗ текста на картинке
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year portrait, glowing warm lights, soft snow, cozy winter atmosphere, no visible text, no logos, clean background",
  birthday:
    "birthday themed portrait, balloons, confetti, festive colorful composition, joyful mood, no visible text, no logos, clean background",
  funny:
    "playful humorous portrait, bright vivid colors, fun dynamic composition, cheerful mood, no visible text, no logos, clean background",
  scary:
    "dark horror themed portrait, spooky lighting, eerie atmosphere, mysterious background, no visible text, no logos, clean background"
};

// Базовое правило: удалить весь текст/логотипы/интерфейс
// НОВОЕ: явно просим сохранить ЛИЧНОСТЬ и ПОЛ из исходного фото.
const NO_TEXT_BASE_PROMPT =
  [
    "clean high-quality portrait of the SAME person from the input photo",
    "keep the same identity, same gender, same approximate age group",
    "keep the same face structure, head shape, and key facial features",
    "do not change the person into someone else",
    "if the original is a man, keep him clearly male; if a woman, keep her female",
    "remove all text, remove all numbers, remove all watermarks, remove all logos",
    "remove any UI elements, phone screen overlays, status bar, timestamps, notifications",
    "no captions, no writing, no symbols on the image",
    "simple clean background"
  ].join(", ");

// Negative prompt — явно запрещаем текст и интерфейсы
const NEGATIVE_TEXT_PROMPT =
  "text, numbers, letters, subtitles, captions, watermark, logo, stickers, emojis, UI elements, phone interface, time, battery icon, notification icons, status bar, on-screen controls, overlays";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let body = req.body;

    // На всякий случай, если Vercel отдаст строку
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { style, text, photo, effects, greeting } = body || {};

    // Без фото — смысла нет, модель рисует "левую девушку".
    if (!photo) {
      return res
        .status(400)
        .json({ error: "Photo is required for portrait editing" });
    }

    // 1. Стиль
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // 2. Пользовательский текст (пока не используем, но оставим)
    const userPrompt = (text || "").trim();

    // 3. Эффекты (кожа + мимика)
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // 4. Атмосфера поздравления (без текста на изображении)
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // 5. Финальный prompt
    const promptParts = [stylePrefix, NO_TEXT_BASE_PROMPT];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if