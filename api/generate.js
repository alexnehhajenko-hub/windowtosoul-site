// api/generate.js — FLUX-KONTEXT-PRO (Stable)
//
// Работает с текстом и фото. Возвращает image URL стабильно.

import Replicate from "replicate";

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

    const { style, text, photo } = body;

    // Стиль
    const stylePrefix = {
      oil: "oil painting portrait, detailed, soft warm light, artistic",
      anime: "anime style portrait, clean lines, soft pastel shading",
      poster: "cinematic movie poster portrait, dramatic lighting",
      classic: "classical old master portrait, realism, warm tones"
    }[style] || "realistic portrait";

    const userPrompt = text?.trim() || "";
    const prompt = `${stylePrefix}. ${userPrompt}`.trim();

    // Входные данные для Replicate
    const input = {
      prompt,
      input_image: photo || null, // ВАЖНО
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
      } catch {}
    }

    // Проверка
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