// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления (EN-надписи)

import Replicate from "replicate";

// Базовые стили
const STYLE_PREFIX = {
  beauty:
    "high-end portrait, realistic photo, soft studio light, clean background",
  oil: "oil painting portrait, detailed, soft warm light, artistic brush strokes",
  anime:
    "anime style portrait, clean line art, soft pastel shading, big expressive eyes",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field",
  classic:
    "classical old master portrait, realism, warm tones, detailed skin, subtle vignette",
  default: "realistic portrait, detailed face, soft studio lighting"
};

// Эффекты обработки кожи + мимика
// (ключи совпадают с EFFECT_CHIP_LABELS_EN из state.js)
const EFFECT_PROMPTS = {
  // 🔹 один эффект "одной кнопкой":
  // НЕ делаем человека красивее, НЕ меняем лицо,
  // только убираем морщины/прыщи и выравниваем кожу.
  "beauty-one-touch":
    "keep exactly the same person and the same face. do not make the person more beautiful, do not stylize the face, do not change attractiveness. only reduce the visibility of wrinkles and fine lines, gently smooth and even the skin texture, remove acne and small blemishes, keep natural pores and realistic skin, keep the same gender and facial structure",

  // кожа — переформулировано мягко, без слова 'beauty'
  "no-wrinkles":
    "same person with slightly reduced visibility of wrinkles, a bit softer skin texture, still natural and realistic, keep the same face and gender",
  younger:
    "same person looking slightly more rested and a bit younger, with fresher skin, but clearly the same face and gender, no replacement with a different model",
  "smooth-skin":
    "same person with smoother and more even skin, reduced blemishes, preserved pores, realistic texture, no change to facial features or gender",
  "glow-golden":
    "soft warm golden light on the same face, healthy look, without changing face shape, age or gender",
  "cinematic-light":
    "cinematic soft light on the same face, better contrast and shading, no changes to identity or gender",

  // мимика — усиливаем 'same person'
  "smile-soft":
    "same person with a subtle soft smile, calm and relaxed expression, no change to face structure or gender",
  "smile-big":
    "same person with a big warm smile, expressive and friendly face, keep all main facial features",
  "smile-hollywood":
    "same person with a wide smile, visible teeth but still natural, confident look, do not change identity",
  laugh:
    "same person laughing with a bright smile, joyful and natural expression, no replacement with a different person",
  "surprised-wow":
    "same person with a surprised wow expression, eyes a bit wider, eyebrows raised, same facial features",
  neutral:
    "same person with a neutral face expression, relaxed, no strong visible emotion",
  serious:
    "same person with a serious face, no smile, focused thoughtful expression, same gender and identity",
  "eyes-bigger":
    "same person with slightly more open and attentive eyes, keep the same eye shape and identity",
  "eyes-brighter":
    "same person with brighter, more vivid and expressive gaze, no change to facial structure"
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

// Сохраняем одного и того же человека — жёсткий запрет менять лицо/пол
const IDENTITY_PROMPT =
  "STRICTLY edit this exact portrait photo of the SAME person from the input image only. " +
  "The final result MUST be clearly recognizable as the same person, at least 80 percent similar to the input face. " +
  "Keep the same gender, age range, face shape and main facial features. " +
  "Do NOT change gender, do NOT turn a man into a woman and do NOT turn a woman into a man. " +
  "Do NOT replace the face with a different model or a different more beautiful person. " +
  "Do NOT change the attractiveness level, only apply the requested skin and expression corrections.";

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
    const promptParts = [
      stylePrefix,
      effectsPrompt,
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

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