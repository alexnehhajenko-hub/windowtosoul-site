// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления (EN-надписи)

import Replicate from "replicate";

// Базовые стили
const STYLE_PREFIX = {
  beauty:
    "high-end beauty portrait, realistic photo, soft studio light, clean background",
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
  // 🔹 общий эффект "одной кнопкой" — улучшить кожу (тон, прыщи, мелкие морщины)
  "beauty-one-touch":
    "subtle natural beauty retouch on the same face, even skin tone, remove acne and pimples, reduce dark spots and dark circles, soften fine wrinkles and lines, keep realistic skin texture and pores, do not change the facial structure, keep exactly the same person",

  // кожа — все эффекты теперь явно привязаны к тому же лицу
  "no-wrinkles":
    "same person with fewer visible wrinkles, slightly reduced skin texture, gentle beauty retouch, still natural, do not change facial structure or gender",
  younger:
    "same person looking 10–15 years younger with fresher skin and less tired look, but clearly the same face, do not change gender, ethnicity or main facial features",
  "smooth-skin":
    "smooth and even skin on the same face, reduced blemishes, preserved pores, very natural retouch, do not replace the person with a different model face",
  "glow-golden":
    "soft golden glow on the skin of the same person, warm highlights, healthy radiant look, without changing face shape or gender",
  "cinematic-light":
    "cinematic beauty lighting on the same face, soft key light and gentle rim light, no change to identity or gender",

  // мимика (тоже чуть усилим «same person»)
  "smile-soft":
    "same person with a subtle soft smile, calm and relaxed expression, no change to face structure or gender",
  "smile-big":
    "same person with a big warm smile, expressive and friendly face, keep all main facial features",
  "smile-hollywood":
    "same person with a wide hollywood smile, visible white teeth but still natural, confident look, do not change identity",
  laugh:
    "same person laughing with a bright smile, joyful and natural expression, no replacement with a different person",
  "surprised-wow":
    "same person with a wow surprised expression, eyes a bit wider, eyebrows raised, keep the same facial features",
  neutral:
    "same person with a neutral face expression, relaxed, no strong visible emotion",
  serious:
    "same person with a serious face, no smile, focused thoughtful expression, no change to gender or identity",
  "eyes-bigger":
    "same person with slightly bigger, more open eyes, keep the same eye shape and identity",
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

// Сохраняем одного и того же человека — усилили очень жёстко
const IDENTITY_PROMPT =
  "STRICTLY edit this exact portrait photo of the SAME person from the input image only. " +
  "The final result MUST be clearly recognizable as the same person, at least 80% similar to the input face. " +
  "Keep the same gender, age range, face shape and main facial features. " +
  "Do NOT change gender, do NOT feminize or masculinize the person, do NOT turn a man into a woman or a woman into a man. " +
  "Do NOT replace the face with a different model or a different person, even if the beauty effect is strong.";

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