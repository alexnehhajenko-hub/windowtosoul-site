import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64, style, promptText } = req.body;

    // Формируем общий промпт
    let finalPrompt = `${style}, ${promptText || ""}`.trim();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const input = {
      prompt: finalPrompt,
    };

    // если есть фото — отправляем base64
    if (imageBase64) {
      input.image = `data:image/png;base64,${imageBase64}`;
    }

    const output = await replicate.run(
      "black-forest-labs/flux-1:1cfafb0e0faae7cabd1a7595f3237963",
      { input }
    );

    // Replicate возвращает массив URL — берём первый
    const imageUrl = Array.isArray(output) ? output[0] : output;

    res.status(200).json({ output: imageUrl });
  } catch (e) {
    console.error("API ERROR:", e);
    res.status(500).json({ error: "Generation failed", details: e.message });
  }
}

export const config = {
  api: {
    bodyParser: true, // теперь включаем JSON-парсер
  },
};