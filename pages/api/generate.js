// pages/api/generate.js

const Replicate = require("replicate");

// Конфиг для Vercel/Next — пусть не трогает тело запроса сам
module.exports = async (req, res) => {
  // Разрешаем только POST-запросы
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      res.status(500).json({ error: "REPLICATE_API_TOKEN is missing" });
      return;
    }

    const replicate = new Replicate({ auth: token });

    // ВРЕМЕННО игнорируем style и extra description.
    // Просто шлём один жёстко заданный английский промпт.
    const prompt =
      "oil painting, classical art portrait of a woman, warm soft light, highly detailed, 4k";

    // ВАЖНО: prompt — обычная строка!
    const output = await replicate.run(
      "black-forest-labs/flux-1:1cfafb0e0faae7cabd1a7595f3237963",
      {
        input: {
          prompt: prompt
        }
      }
    );

    // Replicate обычно отдаёт массив ссылок
    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      res.status(502).json({
        error: "Model returned no image",
        raw: output
      });
      return;
    }

    // Фронт ждёт поле `output`
    res.status(200).json({ output: imageUrl, prompt });
  } catch (err) {
    console.error("REPLICATE ERROR:", err);
    res.status(500).json({
      error: "Generation failed",
      details: err && err.message ? err.message : String(err)
    });
  }
};