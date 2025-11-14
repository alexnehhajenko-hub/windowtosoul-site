// api/generate.js
import Replicate from "replicate";

export default async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Проверяем, есть ли токен
  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(500).json({
      error: "REPLICATE_API_TOKEN is missing",
    });
  }

  try {
    // Инициализируем клиент Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Временный тест: не читаем тело запроса, просто рисуем одну картинку по промпту
    const prompt =
      "oil painting portrait of a person, warm soft light, highly detailed, 4k";

    // Вызываем FLUX-1 через Replicate
    const output = await replicate.run("black-forest-labs/flux-1", {
      input: {
        prompt,
      },
    });

    // Replicate чаще всего возвращает массив url-ов
    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      return res.status(502).json({
        error: "No image URL returned from Replicate",
        raw: output,
      });
    }

    // То, что ждёт фронтенд: поле output — ссылка на картинку
    return res.status(200).json({ output: imageUrl, prompt });
  } catch (e) {
    console.error("API /api/generate ERROR:", e);
    return res.status(500).json({
      error: "Generation failed",
      details: e?.message || String(e),
    });
  }
}