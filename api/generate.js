// api/generate.js — стабильная версия: только текст → картинка

import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "REPLICATE_API_TOKEN is missing" });
    }

    // Читаем «сырое» тело как текст
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
    }

    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("JSON parse error:", e);
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const userPrompt = (data.prompt || "").trim();

    const basePrompt =
      "beautiful oil painting portrait of a person, soft warm light, highly detailed, 4k";

    const finalPrompt = userPrompt
      ? `${basePrompt}, ${userPrompt}`
      : basePrompt;

    const replicate = new Replicate({ auth: token });

    // Модель: быстрая версия FLUX
    const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
      input: {
        prompt: finalPrompt,
      },
    });

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      return res.status(502).json({
        error: "No image URL from Replicate",
        raw: output,
      });
    }

    return res.status(200).json({
      ok: true,
      imageUrl,
      usedPrompt: finalPrompt,
    });
  } catch (err) {
    console.error("REPLICATE ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err),
    });
  }
}