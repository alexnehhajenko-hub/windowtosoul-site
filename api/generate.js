// api/generate.js
//
// Серверная функция Vercel для генерации портретов через Replicate + FLUX.
// Сейчас работаем только по текстовому описанию (фото игнорируем),
// но поле photo можно уже слать — дальше подключим стиль по фото.

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

function buildPrompt(style, userText) {
  const styleKey = style || "oil";

  const STYLE_PROMPTS = {
    oil: "oil painting portrait of a person, soft warm light, rich brush strokes, highly detailed, 4k, artstation, dramatic lighting",
    anime: "anime style portrait, delicate line art, soft pastel colors, big expressive eyes, clean background, highly detailed illustration",
    poster: "cinematic movie poster portrait, dramatic lighting, sharp contrast, realistic skin, subtle film grain, 4k",
    classic: "classical oil painting portrait in the style of old masters, realistic skin tones, soft shadows, warm colors, detailed brushwork, 4k",
  };

  const base = STYLE_PROMPTS[styleKey] || STYLE_PROMPTS.oil;

  const userPart = (userText && String(userText).trim())
    ? String(userText).trim()
    : "beautiful portrait of a person, front view, soft background";

  // Итоговый prompt: стиль + пользовательский текст.
  return `${base}. ${userPart}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // --- Безопасно читаем тело запроса (Vercel может прислать строку) ---
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const { style, text, photo } = body;

    // Пока фото игнорируем, но оставляем на будущее.
    // Если фото есть — просто усиливаем prompt фразой про сохранение лица.
    const prompt = buildPrompt(style, text) +
      (photo ? ". Keep the same person and overall appearance as in the reference photo." : "");

    // ВАЖНО: здесь всегда есть prompt, поэтому ошибка "Prompt is required"
    // от Replicate больше появляться не должна.
    const input = {
      prompt,
      // Немного параметров качества / скорости
      steps: 24,
      guidance: 3.5,
      aspect_ratio: "3:4",
      output_format: "png",
    };

    const output = await replicate.run("black-forest-labs/flux-1", { input });

    // Replicate обычно возвращает массив URL
    let imageUrl = null;
    if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0];
    } else if (typeof output === "string") {
      imageUrl = output;
    } else if (output && output.output && Array.isArray(output.output)) {
      imageUrl = output.output[0];
    }

    if (!imageUrl) {
      return res.status(502).json({
        error: "No image URL from Replicate",
        raw: output,
      });
    }

    return res.status(200).json({
      ok: true,
      imageUrl,
      prompt,
    });
  } catch (err) {
    console.error("API /api/generate ERROR:", err);

    const msg = err?.message || String(err || "");
    return res.status(500).json({
      error: "Generation failed",
      details: msg,
    });
  }
}