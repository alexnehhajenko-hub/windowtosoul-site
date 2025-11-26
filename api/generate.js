// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / старинные стили

import Replicate from "replicate";

// ───────────── СТИЛИ ─────────────
const STYLE_PREFIX = {
  oil: "oil painting portrait, detailed, soft warm light, artistic",
  anime: "anime style portrait, clean lines, soft pastel shading",
  poster: "cinematic movie poster portrait, dramatic lighting, high contrast",
  classic: "classical old master portrait, realism, warm tones, detailed skin",

  // 🔹 Новые стили
  "old-photo":
    "vintage damaged photograph, sepia faded tones, slight scratches, torn paper texture, looks like an old family portrait from early 1900s",
  "old-painting":
    "antique old master oil painting portrait, cracked paint texture, aged canvas, muted vintage colors, dramatic chiaroscuro lighting",
  "dark-demon":
    "dark gothic horror portrait, eerie lighting, cold desaturated colors, subtle demonic aesthetic like an old engraving, no blood, no gore",

  default: "realistic portrait, detailed face, soft studio lighting"
};

// ───────────── ЭФФЕКТЫ КОЖИ И МИМИКА ─────────────
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "same person, less visible wrinkles, gentle retouch, keep natural pores and skin texture",
  younger:
    "same person, looks slightly younger and more rested, fresher skin but clearly the same face",
  "smooth-skin":
    "same person, smooth even skin, reduced blemishes, realistic texture, no changes to facial features",

  // мимика
  "smile-soft":
    "same person with a subtle soft smile, calm and relaxed expression",
  "smile-big":
    "same person with a big warm smile, expressive and friendly face",
  "smile-hollywood":
    "same person with a wide smile, visible teeth but still natural, confident look",
  laugh:
    "same person laughing joyfully, natural happy expression, no replacement of face",
  neutral:
    "same person with a neutral face expression, relaxed, no strong visible emotion",
  serious:
    "same person with a serious focused look, no smile, same facial structure",
  "eyes-bigger":
    "same person with slightly bigger attentive eyes, no face shape change",
  "eyes-brighter":
    "same person with brighter vivid gaze, same face and features"
};

// ───────────── ДОПОЛНИТЕЛЬНЫЕ ХВОСТЫ PROMPT ─────────────

// Запрет на подмену лица / пола
const IDENTITY_TAIL =
  "STRICTLY edit the SAME person from the input image. Do not change gender, face shape, age category, or attractiveness. Keep at least 80% facial similarity to the input.";

// Убираем мусор (UI, кнопки и подписи)
const CLEANUP_TAIL =
  "remove all interface elements, buttons, captions, gray panels, and text if the image looks like a screenshot. Output only a clean portrait with no text, no borders, no watermarks, and a plain background.";

// Безопасность
const SAFETY_TAIL =
  "portrait from the shoulders up, person is fully clothed, no nudity, no explicit content, no distorted anatomy";

// ───────────── HANDLER ─────────────
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

    const { style, text, photo, effects } = body || {};

    // 1. Стиль
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // 2. Пользовательский текст
    const userPrompt = (text || "").trim();

    // 3. Эффекты
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // 4. Итоговый prompt
    const promptParts = [
      stylePrefix,
      effectsPrompt,
      userPrompt,
      IDENTITY_TAIL,
      CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const prompt = promptParts.join(". ").trim();

    // 5. Вход в модель Replicate
    const input = {
      prompt,
      output_format: "jpg"
    };

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

    // 6. Поиск URL результата
    let imageUrl = null;
    if (Array.isArray(output)) imageUrl = output[0];
    else if (output?.output) {
      if (Array.isArray(output.output)) imageUrl = output.output[0];
      else if (typeof output.output === "string") imageUrl = output.output;
    } else if (typeof output === "string") imageUrl = output;
    else if (output?.url) {
      try {
        imageUrl = output.url();
      } catch {}
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: "No image URL returned",
        raw: output
      });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl,
      prompt
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}