// api/generate.js

import Replicate from "replicate";

// Очень простой тестовый endpoint: по POST-запросу
// генерирует один портрет по фиксированному prompt.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return res.status(500).json({
        error: "Missing REPLICATE_API_TOKEN on server",
      });
    }

    // Инициализируем Replicate SDK
    const replicate = new Replicate({ auth: token });

    // Тестовый prompt — один красивый портрет
    const prompt =
      "oil painting portrait of a thoughtful person, warm soft light, highly detailed, 4k";

    // ВАЖНО: используем актуальный ID модели без хэшей версии
    const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
      input: {
        prompt,
      },
    });

    // Replicate обычно возвращает массив URL
    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      return res.status(502).json({
        error: "No image URL from Replicate",
        raw: output,
      });
    }

    // То, что ждёт фронт: поле output — ссылка на картинку
    return res.status(200).json({ output: imageUrl, prompt });
  } catch (err) {
    console.error("REPLICATE ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err),
    });
  }
}