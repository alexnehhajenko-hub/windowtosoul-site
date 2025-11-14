import Replicate from "replicate";

// Vercel Node.js Serverless Function
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Читаем "сырое" тело и парсим JSON
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    let data = {};
    if (body) {
      try {
        data = JSON.parse(body);
      } catch (e) {
        console.error("JSON parse error:", e);
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const extraPrompt = (data.prompt || "").trim();
    const style = (data.style || "oil painting").trim();
    const imageBase64 = data.imageBase64 || null;

    // Пока FLUX — чисто text-to-image, поэтому картинку только логируем.
    if (imageBase64) {
      console.log("Got imageBase64 with length:", imageBase64.length);
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const basePrompt =
      "beautiful oil painting portrait of a person, warm soft light, highly detailed, cinematic, 4k";

    const fullPrompt = extraPrompt
      ? `${basePrompt}, ${extraPrompt}`
      : basePrompt;

    const output = await replicate.run("black-forest-labs/flux-1", {
      input: {
        prompt: fullPrompt,
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
      usedPrompt: fullPrompt,
      usedStyle: style,
      usedPhoto: Boolean(imageBase64),
    });
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err),
    });
  }
}