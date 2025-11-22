// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления
// Без возврата prompt на фронт

import Replicate from "replicate";

const STYLE_PREFIX = {
  oil: "oil painting portrait, detailed, soft warm light, artistic",
  anime: "anime style portrait, clean lines, soft pastel shading",
  poster: "cinematic movie poster portrait, dramatic lighting, high contrast",
  classic: "classical old master portrait, realism, warm tones, detailed skin",
  default: "realistic portrait, detailed face, soft studio lighting"
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "reduced wrinkles, gentle beauty retouch, keep natural skin texture",
  younger:
    "slightly younger look, fresher and healthier skin, but clearly the same person",
  "smooth-skin":
    "smoother even skin tone, soft beauty retouch, no plastic look",

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

// Поздравления — ТОЛЬКО антураж, БЕЗ текста на картинке
const GREETING_PROMPTS = {
  "new-year":
    "subtle New Year atmosphere, warm glowing lights, soft winter background, festive mood, but no text on the image",
  birthday:
    "birthday mood, balloons or confetti in the background, soft festive colors, but no text on the image",
  funny:
    "playful humorous atmosphere, bright colors, fun composition, but no text on the image",
  scary:
    "dark cinematic horror atmosphere, spooky lighting, eerie background, but no text on the image"
};

// Общий кусок, чтобы модель держала того же человека и не рисовала надписи
const IDENTITY_AND_NO_TEXT =
  "portrait of the SAME person from the input photo, same face shape, same gender, same main facial features, clearly recognizable, " +
  "do not turn into a different person. no text, no logos, no watermarks, no ui elements, no instagram layout, no frames, no captions";

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

    // 4. Поздравление
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // 5. Итоговый prompt (остаётся только на сервере)
    const promptParts = [stylePrefix, IDENTITY_AND_NO_TEXT];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const prompt = promptParts.join(". ").trim();

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
      process.env.REPLICATE_MODEL_ID || "black-forest-labs/flux-kontext-pro",
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
        error: "No image URL returned"
      });
    }

    // prompt НЕ отдаём на фронт
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
