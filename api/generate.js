// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Работает с текстом и/или фото, поддерживает эффекты кожи (морщины, омоложение и т.п.)

import Replicate from "replicate";

// Базовые стили
const STYLE_PREFIX = {
  oil: "oil painting portrait, detailed, soft warm light, artistic",
  anime: "anime style portrait, clean lines, soft pastel shading",
  poster: "cinematic movie poster portrait, dramatic lighting, high contrast",
  classic: "classical old master portrait, realism, warm tones, detailed skin",
  default: "realistic portrait, detailed face, soft studio lighting"
};

// Эффекты ретуши кожи
const EFFECT_PROMPTS = {
  "no-wrinkles": "no wrinkles, reduced skin texture, gentle beauty retouch",
  younger: "looks 10 years younger, fresh and rested face, lively eyes",
  "smooth-skin": "smooth flawless skin, even skin tone, subtle beauty lighting"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Парсим тело запроса
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { style, text, photo, effects } = body || {};

    // --- 1. Стиль ---
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // --- 2. Пользовательский текст ---
    const userPrompt = (text || "").trim();

    // --- 3. Эффекты кожи (кнопки) ---
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((key) => EFFECT_PROMPTS[key])
        .filter(Boolean)
        .join(", ");
    }

    // --- 4. Итоговый prompt ---
    const promptParts = [stylePrefix];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);

    const prompt = promptParts.join(". ").trim();

    // --- 5. Вход для Replicate ---
    const input = {
      prompt,
      output_format: "jpg"
    };

    // ВАЖНО: не передаём input_image, если фото нет (режим "только текст")
    if (photo) {
      input.input_image = photo;
    }

    console.log("INPUT TO REPLICATE:", input);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      { input }
    );

    console.log("RAW OUTPUT FROM REPLICATE:", output);

    // ------ Универсальный поиск URL в ответе ------
    let imageUrl = null;

    if (Array.isArray(output)) {
      // Если массив URL (частый случай)
      imageUrl = output[0];
    } else if (output?.output) {
      // Если объект с полем output
      if (Array.isArray(output.output)) {
        imageUrl = output.output[0];
      } else if (typeof output.output === "string") {
        imageUrl = output.output;
      }
    } else if (typeof output === "string") {
      // Если просто строка
      imageUrl = output;
    } else if (output?.url) {
      // Иногда Replicate имеет метод url()
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