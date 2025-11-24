// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления (EN-надписи)

import Replicate from "replicate";

// Базовые стили
const STYLE_PREFIX = {
  beauty:
    "high-end beauty portrait, realistic photo, soft studio light, clean background",
  oil: "oil painting portrait, detailed, soft warm light, artistic brush strokes",
  anime: "anime style portrait, clean line art, soft pastel shading, big expressive eyes",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field",
  classic:
    "classical old master portrait, realism, warm tones, detailed skin, subtle vignette",
  default: "realistic portrait, detailed face, soft studio lighting"
};

// Эффекты обработки кожи + мимика
// (ключи совпадают с EFFECT_CHIP_LABELS_EN из state.js)
const EFFECT_PROMPTS = {
  // 🔹 один общий эффект "улучшить кожу": цвет, прыщи, мелкие морщины
  "beauty-one-touch":
    "natural beauty retouch on the whole face, even skin tone, remove acne and pimples, reduce dark spots and dark circles, soften fine wrinkles and lines, keep realistic skin texture and pores, keep the same person",

  // кожа (старые эффекты тоже остаются, можно использовать вместе или по отдельности)
  "no-wrinkles":
    "no wrinkles, slightly reduced skin texture, gentle beauty retouch, still natural",
  younger:
    "looks 10–15 years younger, fresher skin, less tired look, but still the same person",
  "smooth-skin":
    "smooth and even skin, reduced blemishes, preserved pores, very natural retouch",
  "glow-golden":
    "soft golden glow on the skin, warm highlights, healthy radiant look",
  "cinematic-light":
    "cinematic beauty lighting on the face, soft key light and gentle rim light",

  // мимика
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood":
    "wide hollywood smile, visible white teeth but still natural, confident look",
  laugh: "laughing with a bright smile, joyful and natural expression",
  "surprised-wow": "wow surprised expression, eyes a bit wider, eyebrows raised",
  neutral: "neutral face expression, relaxed, no strong visible emotion",
  serious: "serious face, no smile, focused thoughtful expression",
  "eyes-bigger": "slightly bigger eyes, more open and attentive look",
  "eyes-brighter": "brighter eyes, more vivid and expressive gaze"
};

// Поздравления — английский текст + антураж
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year portrait, cozy winter atmosphere, soft lights and bokeh, elegant handwritten English text 'Happy New Year' on the image",
  birthday:
    "birthday celebration portrait, balloons and confetti in the background, warm party lights, elegant handwritten English text 'Happy Birthday' on the image",
  funny:
    "playful fun portrait, bright colors, dynamic background shapes, bold handwritten English text like 'You look amazing!' on the image",
  scary:
    "dark horror themed portrait, moody lighting, subtle spooky background, creepy handwritten English text 'Happy Halloween' on the image"
};

// Сохраняем одного и того же человека
const IDENTITY_PROMPT =
  "edit this exact portrait photo of the SAME person from the input image, keep the same gender, face shape and skin tone, do not generate a different person";

// Убираем мусор из скриншотов (UI, кнопки и т.п.)
const UI_CLEANUP_TAIL =
  "ignore and remove any frames, borders, website interface, buttons, badges, stickers, logos, watermarks or text from the input image that are not part of the portrait";

// Безопасность / анти-NSFW, чтобы Replicate не ругался
const SAFETY_TAIL =
  "portrait from the shoulders up, person is fully clothed, no nudity, no explicit cleavage, no sexual content, no extra people, no distorted anatomy";

/**
 * API handler
 */
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

    const { style, text, photo, effects, greeting, language } = body || {};

    // 1. Стиль
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // 2. Пользовательский текст (на будущее, сейчас пустой)
    const userPrompt = (text || "").trim();

    // 3. Эффекты → в prompt
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((key) => EFFECT_PROMPTS[key])
        .filter(Boolean)
        .join(", ");
    }

    // 4. Поздравление
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // 5. Итоговый prompt — остаётся только на сервере
    const promptParts = [stylePrefix, IDENTITY_PROMPT];

    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);
    if (userPrompt) promptParts.push(userPrompt);

    // "хвосты" — очистка UI и безопасность
    promptParts.push(UI_CLEANUP_TAIL);
    promptParts.push(SAFETY_TAIL);

    const prompt = promptParts.join(". ").trim();

    // 6. Вход в модель Replicate
    const input = {
      prompt,
      output_format: "jpg"
    };

    // Фото добавляем только если есть
    if (photo) {
      input.input_image = photo;
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      { input }
    );

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
        error: "No image URL returned",
        raw: output
      });
    }

    // На фронт prompt не отдаём
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
