// pages/api/generate.js
// Принимает { image, prompt } и возвращает { ok, imageBase64 }

const Replicate = require("replicate");

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const { image, prompt } = req.body || {};

    if (!image) {
      return res.status(400).json({ ok: false, error: "no_image_provided" });
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // ✨ Модель «лицо → арт-портрет»
    const output = await replicate.run(
      "lucataco/face-to-art:1d0f6e7ef8a4c83bcab9e688bdf00cbaca6e2e38f71269cc4cff9342d6f62a3f",
      {
        input: {
          image: "data:image/png;base64," + image,
          prompt:
            prompt ||
            "oil painting, fantasy scenery, masterpiece, dramatic light, ultra detailed",
          guidance: 7,
          num_inference_steps: 30,
        },
      }
    );

    const url = output?.image || output?.[0];

    if (!url) {
      return res.status(500).json({ ok: false, error: "no_output_from_model" });
    }

    // Скачиваем картинку и кодируем в base64,
    // чтобы фронтенд мог сразу показать <img src="data:image/png;base64,...">
    const imgRes = await fetch(url);
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return res.status(200).json({
      ok: true,
      imageBase64: base64,
    });
  } catch (err) {
    console.error("Replicate error:", err);
    return res.status(500).json({
      ok: false,
      error: "server_error",
      message: String(err?.message || err),
    });
  }
};