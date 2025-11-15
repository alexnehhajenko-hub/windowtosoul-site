// /api/generate.js — FLUX Kontext PRO — FULL WORKING VERSION
import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { style, text, photo } = body;

    const stylePrefix = {
      oil: "oil painting portrait, warm, detailed",
      anime: "anime style portrait, cute, clean lines",
      poster: "cinematic dramatic movie portrait",
      classic: "classical master painting, realism, warm light",
    }[style] || "realistic portrait";

    const prompt = `${stylePrefix}. ${text || ""}`.trim();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // 🔥 ПРАВИЛЬНЫЙ ВЫЗОВ ДЛЯ FLUX KONTEXT PRO
    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-kontext-pro",
      input: {
        prompt,
        input_image: photo, // URL фото
        output_format: "jpg",
      },
    });

    console.log("PREDICTION:", prediction);

    // prediction.output появится сразу, если модель синхронная
    if (prediction.output && prediction.output[0]) {
      return res.status(200).json({
        ok: true,
        image: prediction.output[0],
        prompt,
      });
    }

    // Если нет output — ошибка
    return res.status(500).json({
      error: "No output returned from Replicate",
      full: prediction,
    });

  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err),
    });
  }
}