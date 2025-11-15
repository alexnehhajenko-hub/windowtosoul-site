// api/generate.js — FLUX KONTEKT PRO (FULL)
// Работает с текстом + фото

import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // --- Парсим тело запроса ---
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { style, text, photo } = body;

    // --- Строим prompt ---
    const userPrompt = text?.trim() || "";
    const stylePrefix = {
      oil: "oil painting portrait, detailed, soft warm light, artistic",
      anime: "anime style portrait, clean lines, soft pastel shading",
      poster: "cinematic movie poster portrait, dramatic lighting",
      classic: "classical old master portrait, realism, warm tones"
    }[style] || "realistic portrait";

    const prompt = `${stylePrefix}. ${userPrompt}`.trim();

    // --- Собираем input для Replicate ---
    const input = {
      prompt,
      input_image: photo || null,   // <-- ВАЖНО! Правильное поле
      output_format: "jpg"
    };

    console.log("INPUT TO REPLICATE:", input);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      { input }
    );

    // output = объект, у которого есть .url()
    const imageUrl = output?.url ? output.url() : null;

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