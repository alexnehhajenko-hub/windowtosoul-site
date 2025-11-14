// pages/api/generate.js

import Replicate from "replicate";

// bodyParser отключаем, чтобы Next не пытался разбирать form-data.
// Мы пока вообще игнорируем тело запроса и просто тестово рисуем картину.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Инициализируем Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Очень простой тестовый промпт — без учёта формы, фото и стилей
    const prompt =
      "oil painting portrait of a person, warm soft light, highly detailed, cinematic, 4k";

    // Вызываем FLUX-модель
    const output = await replicate.run("black-forest-labs/flux-1", {
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
  } catch (e) {
    console.error("API ERROR:", e);
    return res.status(500).json({
      error: "Generation failed",
      details: e?.message || String(e),
    });
  }
}