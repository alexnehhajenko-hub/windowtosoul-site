import Replicate from "replicate";

// ВАЖНО: в Vercel должен быть ключ REPLICATE_API_TOKEN
// со значением из https://replicate.com/account/api-tokens

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    return res.status(500).json({
      error: "Missing REPLICATE_API_TOKEN in environment",
    });
  }

  try:
    const { prompt } = req.body || {};
    const finalPrompt =
      (prompt && String(prompt).trim().length > 0)
        ? String(prompt)
        : "oil painting portrait of a person, warm soft light, highly detailed, 4k";

    const replicate = new Replicate({
      auth: apiKey,
    });

    // Простой и надёжный пример модели (SDXL)
    const output = await replicate.run(
      "stability-ai/stable-diffusion-xl-base-1.0",
      {
        input: {
          prompt: finalPrompt,
        },
      }
    );

    // Replicate чаще всего возвращает массив URL
    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      return res.status(502).json({
        error: "No image URL from Replicate",
        raw: output,
      });
    }

    return res.status(200).json({
      output: imageUrl,
      usedPrompt: finalPrompt,
    });
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err),
    });
  }
}