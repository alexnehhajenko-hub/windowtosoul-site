import Replicate from "replicate";

// ОДНА функция для всех 4 стилей.
// Фото пока игнорируем — работаем только с текстовым prompt.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.json({ error: "Method not allowed" });
  }

  try {
    // ----- Читаем тело запроса как текст -----
    let bodyText = "";
    for await (const chunk of req) {
      bodyText += chunk;
    }

    let payload = {};
    try {
      payload = JSON.parse(bodyText || "{}");
    } catch (e) {
      res.statusCode = 400;
      return res.json({ error: "Invalid JSON body" });
    }

    const style = payload.style || "oil";
    const prompt = (payload.prompt || "").trim();

    if (!prompt) {
      res.statusCode = 400;
      return res.json({ error: "Prompt is required" });
    }

    // ----- Replicate -----
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Используем одну модель FLUX-1.
    // Разные стили уже зашиты во фронтенде в prompt.
    const output = await replicate.run("black-forest-labs/flux-1", {
      input: {
        prompt,
      },
    });

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      res.statusCode = 502;
      return res.json({
        error: "No image URL from Replicate",
        raw: output,
      });
    }

    res.statusCode = 200;
    return res.json({
      ok: true,
      style,
      prompt,
      imageUrl,
    });
  } catch (e) {
    console.error("API /api/generate ERROR:", e);
    res.statusCode = 500;
    return res.json({
      error: "Generation failed",
      details: e?.message || String(e),
    });
  }
}