// pages/api/generate.js

import Replicate from "replicate";

// Отключаем стандартный bodyParser — мы принимаем form-data,
// но в этой тестовой версии вообще не читаем тело запроса.
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

  // Проверяем, что есть ключ
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: "Missing REPLICATE_API_TOKEN",
    });
  }

  try {
    // Инициализируем Replicate
    const replicate = new Replicate({
      auth: token,
    });

    // Пока игнорируем фото/форму и шлём простой тестовый промпт
    const prompt =
      "oil painting portrait of a person, warm soft light, highly detailed, cinematic, 4k";

    // ⚠️ ВАЖНО:
    // здесь ОБЯЗАТЕЛЬНО должна быть СТРОКА вида owner/model:version
    // без этого и была ошибка "The string did not match the expected pattern"
    const output = await replicate.run(
      "black-forest-labs/flux-1:1cfafb0e0faae7cabd1a7595f3237963",
      {
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
        },
      }
    );

    // Replicate обычно возвращает массив URL
    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(502).json({
        error: "No image URL from Replicate",
        raw: output,
      });
    }

    // То, что ждёт фронт: поле output — ссылка на картинку
    return res.status(200).json({
      output: imageUrl,
      prompt,
    });
  } catch (e) {
    console.error("REPLICATE ERROR:", e);
    return res.status(500).json({
      error: "Generation failed",
      details: e?.message || String(e),
    });
  }
}