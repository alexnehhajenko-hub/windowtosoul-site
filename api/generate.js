// api/generate.js — FLUX Kontext Pro, работает с фото

import Replicate from "replicate";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { style, text, photo } = body;

    // --- Prompt ---
    const styleMap = {
      oil: "oil painting portrait, detailed, warm light",
      anime: "anime portrait, clean lines, pastel colors",
      poster: "cinematic movie poster portrait",
      classic: "classical realism portrait",
    };
    const prompt = `${styleMap[style] || "realistic portrait"}. ${text || ""}`;

    // --- Convert base64 → Blob ---
    let input_image = null;
    if (photo) {
      const base64 = photo.split(",")[1];
      const buffer = Buffer.from(base64, "base64");
      input_image = new Blob([buffer], { type: "image/jpeg" });
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt,
          input_image,
          output_format: "jpg",
        }
      }
    );

    const imageUrl = output?.url?.();
    if (!imageUrl) {
      return res.status(500).json({ error: "No output returned from Replicate", raw: output });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl,
      prompt,
    });

  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err.message || String(err),
    });
  }
}