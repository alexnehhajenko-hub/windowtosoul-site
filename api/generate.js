// api/generate.js
//
// Генерация портретов через Replicate.
//  - без фото  -> FLUX (text-to-image)
//  - с фото    -> SDXL (image-to-image, примерная модель)
//
// ВАЖНО: если Replicate вернёт ошибку про модель или параметры,
// смотри текст ошибки в логах Vercel и пришли мне скрин — подправим slug/поля.

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ---------- Помощник для сборки промпта ----------

function buildPrompt(style, userText) {
  const styleKey = style || "oil";

  const STYLE_PROMPTS = {
    oil: "oil painting portrait of a person, soft warm light, rich brush strokes, highly detailed, 4k, artstation, dramatic lighting",
    anime: "anime style portrait, delicate line art, soft pastel colors, big expressive eyes, clean background, highly detailed illustration",
    poster: "cinematic movie poster portrait, dramatic lighting, sharp contrast, realistic skin, subtle film grain, 4k",
    classic: "classical oil painting portrait in the style of old masters, realistic skin tones, soft shadows, warm colors, detailed brushwork, 4k",
  };

  const base = STYLE_PROMPTS[styleKey] || STYLE_PROMPTS.oil;

  const userPart =
    userText && String(userText).trim().length > 0
      ? String(userText).trim()
      : "beautiful portrait of an adult person, front view, soft background";

  return `${base}. ${userPart}`;
}

// ---------- Ветки генерации ----------

// 1) FLUX: текст → картинка (как у нас уже работало)
async function generateWithFlux(prompt) {
  const input = {
    prompt,
    steps: 24,
    guidance: 3.5,
    aspect_ratio: "3:4",
    output_format: "png",
  };

  const output = await replicate.run("black-forest-labs/flux-1", { input });

  let imageUrl = null;
  if (Array.isArray(output) && output.length > 0) {
    imageUrl = output[0];
  } else if (typeof output === "string") {
    imageUrl = output;
  } else if (output && output.output && Array.isArray(output.output)) {
    imageUrl = output.output[0];
  }

  if (!imageUrl) {
    throw new Error("No image URL from FLUX");
  }

  return imageUrl;
}

// 2) SDXL (пример): фото + текст → картинка
// здесь мы пробуем использовать фото как референс.
// Если модель / поля отличаются — Replicate вернёт понятную ошибку.
async function generateWithPhoto(prompt, photoDataUrl) {
  // photoDataUrl — это data:image/jpeg;base64,....
  // Большинство моделей Replicate ждут просто image (URL или base64).
  const input = {
    prompt,
    image: photoDataUrl,
    strength: 0.7,          // насколько сильно менять фото (0.0–1.0)
    negative_prompt:
      "blurry, distorted face, extra limbs, deformed, low quality, text, watermark",
  };

  // ⚠️ Пример модели. Если в логах будет ошибка MODEL_NOT_FOUND или про input,
  // пришли скрин — подберём другой slug/поля.
  const output = await replicate.run("stability-ai/sdxl", { input });

  let imageUrl = null;
  if (Array.isArray(output) && output.length > 0) {
    imageUrl = output[0];
  } else if (typeof output === "string") {
    imageUrl = output;
  } else if (output && output.output && Array.isArray(output.output)) {
    imageUrl = output.output[0];
  }

  if (!imageUrl) {
    throw new Error("No image URL from SDXL");
  }

  return imageUrl;
}

// ---------- HTTP-обработчик ----------

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Vercel иногда даёт body строкой — аккуратно парсим
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    // с фронта мы шлём: { style, extra, photo }
    const { style, extra, photo } = body;

    const promptBase = buildPrompt(style, extra);

    let finalPrompt = promptBase;
    let imageUrl;

    if (photo) {
      // Ветка с фото: пробуем сохранить похожесть лица
      finalPrompt =
        promptBase +
        ". Keep the same person and facial features as in the reference photo, same age and general appearance.";
      imageUrl = await generateWithPhoto(finalPrompt, photo);
    } else {
      // Ветка без фото: обычная текстовая генерация
      imageUrl = await generateWithFlux(finalPrompt);
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl,
      prompt: finalPrompt,
      usedPhoto: !!photo,
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