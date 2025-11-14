import Replicate from "replicate";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const { prompt, imageBase64 } = req.body;

    let imageUrl = null;

    // Если пользователь загрузил фото — загружаем его на Replicate Files API
    if (imageBase64) {
      const uploadResponse = await fetch(
        "https://api.replicate.com/v1/files",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ content: imageBase64 })
        }
      );

      const uploadJson = await uploadResponse.json();
      imageUrl = uploadJson.url;
    }

    // Формируем запрос в FLUX
    const input = {
      prompt: prompt || "oil painting portrait of a woman",
    };

    if (imageUrl) {
      input.image = imageUrl;
    }

    const output = await replicate.run(
      "black-forest-labs/flux-1.1-pro", // или твоя модель
      { input }
    );

    res.status(200).json({ output });

  } catch (err) {
    console.error("GEN ERROR:", err);
    res.status(500).json({ error: err.message || "Generation failed" });
  }
}