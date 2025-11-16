// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления
// Без возврата prompt на фронт
// + Жёсткое правило: НИКАКИХ надписей, логотипов, интерфейсов на итоговом фото

import Replicate from "replicate";

// Стили, усиленный oil и новый beauty
const STYLE_PREFIX = {
  // Новый стиль: светлый, гладкая кожа, без морщин, бьюти-портрет
  beauty:
    "soft beauty portrait, studio lighting, bright airy tones, smooth flawless skin, no wrinkles, gentle high-end retouch, subtle glow, k-beauty style, pastel background, flattering look",

  // Художественная картина маслом (можно оставлять как есть)
  oil:
    "dramatic oil painting portrait, impasto style, very visible thick brush strokes, rich oil paint texture, canvas texture, painterly background, face slightly stylized, not photorealistic, strong painterly look, soft edges",

  anime: "anime style portrait, clean lines, soft pastel shading",
  poster: "cinematic movie poster portrait, dramatic lighting, high contrast",
  classic: "classical old master portrait, realism, warm tones, detailed skin",
  default: "realistic portrait, detailed face, soft studio lighting"
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles": "no wrinkles, reduced skin texture, gentle beauty retouch",
  younger: "looks 20 years younger, fresh and healthy skin, lively eyes",
  "smooth-skin": "smooth flawless skin, even skin tone, subtle beauty lighting",

  // мимика
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood":
    "wide hollywood smile, visible white teeth, confident look",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral face expression, relaxed, no strong visible emotion",
  serious: "serious face, no smile, focused expression",
  "eyes-bigger": "slightly bigger eyes, more open and attentive look",
  "eyes-brighter": "brighter eyes, more vivid and expressive gaze"
};

// Поздравления — ТОЛЬКО атмосфера, БЕЗ текста на изображении
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

// БАЗОВЫЙ ПРОМПТ ДЛЯ УДАЛЕНИЯ ЛЮБОГО ТЕКСТА / ЛОГОТИПОВ / ИНТЕРФЕЙСА
const NO_TEXT_BASE_PROMPT =
  "clean high-quality portrait of the person, reconstruct face only, remove all text, remove all numbers, remove all watermarks, remove all logos, remove any UI elements, remove phone screen overlays, remove status bar, remove timestamps, remove notifications, no captions, no writing, no symbols on the image, no artifacts, simple clean background";

// NEGATIVE PROMPT — явно запрещаем текст, цифры, интерфейсы и т.п.
const NEGATIVE_TEXT_PROMPT =
  "text, numbers, letters, subtitles, captions, watermark, logo, stickers, emojis, UI elements, phone interface, time, battery icon, notification icons, status bar, on-screen controls, overlays";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Парсим тело
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { style, text, photo, effects, greeting } = body || {};

    // 1. Стиль
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // 2. Пользовательский текст
    const userPrompt = (text || "").trim();

    // 3. Эффекты (кожа + мимика)
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // 4. Поздравление (атмосфера, БЕЗ текста на картинке)
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // 5. Итоговый prompt:
    //    - стиль
    //    - базовое правило "без текста"
    //    - пользовательский текст
    //    - эффекты
    //    - атмосфера поздравления
    const promptParts = [stylePrefix, NO_TEXT_BASE_PROMPT];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const prompt = promptParts.join(". ").trim();

    // 6. Вход для Replicate
    const input = {
      prompt,
      negative_prompt: NEGATIVE_TEXT_PROMPT,
      output_format: "jpg"
    };

    // Фото добавляем только если есть
    if (photo) {
      input.input_image = photo;
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input
    });

    // Поиск URL
    let imageUrl = null;

    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (output?.output) {
      if (Array.isArray(output.output)) imageUrl = output.output[0];
      else if (typeof output.output === "string") imageUrl = output.output;
    } else if (typeof output === "string") {
      imageUrl = output;
    } else if (output?.url) {
      try {
        imageUrl = output.url();
      } catch {
        // ignore
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: "No image URL returned"
      });
    }

    // prompt не отдаём наружу
    return res.status(200).json({
      ok: true,
      image: imageUrl
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}