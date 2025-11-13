import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const replicate_api_key = process.env.REPLICATE_API_TOKEN;
  if (!replicate_api_key) {
    return res.status(500).json({ ok: false, error: "missing_replicate_key" });
  }

  const replicate = new Replicate({
    auth: replicate_api_key,
  });

  try {
    const { source, style, prompt, imageBase64 } = req.body;

    if (!prompt || prompt.length < 3) {
      return res.status(400).json({ ok: false, error: "missing_prompt" });
    }

    let imageInput = null;

    if (source === "photo" && imageBase64) {
      imageInput = `data:image/png;base64,${imageBase64}`;
    }

    // ЛОГИКА ВЫБОРА МОДЕЛИ

    // 1️⃣ ФОТО → ФОТО (улучшение)
    if (style === "photo") {
      const output = await replicate.run(
        "black-forest-labs/flux-schnell", // БЫСТРАЯ И КРАСИВАЯ МОДЕЛЬ
        {
          input: {
            prompt,
            image: imageInput,
            guidance: 3,
            steps: 20,
            width: 1024,
            height: 1024
          }
        }
      );

      return res.status(200).json({
        ok: true,
        image: output[0],
        model: "flux-schnell"
      });
    }

    // 2️⃣ ФОТО → КАРТИНА МАСЛОМ
    if (style === "painting" && source === "photo") {
      const output = await replicate.run(
        "tencentarc/gfpgan", // улучшение лица
        {
          input: {
            img: imageInput
          }
        }
      );

      const improvedFace = output;

      const painted = await replicate.run(
        "fofr/p3-paint", // модель картины маслом
        {
          input: {
            prompt: prompt + ", oil painting, dramatic light, masterpiece",
            image: improvedFace,
            style: "oil",
            resolution: "1024"
          }
        }
      );

      return res.status(200).json({
        ok: true,
        image: painted[0],
        model: "p3-paint"
      });
    }

    // 3️⃣ ТЕКСТ → КАРТИНА МАСЛОМ (без фото)
    if (style === "painting" && source === "text") {
      const created = await replicate.run(
        "fofr/p3-paint",
        {
          input: {
            prompt: prompt + ", cinematic oil painting, dramatic sky, beautiful environment, masterpiece",
            style: "oil",
            resolution: "1024"
          }
        }
      );

      return res.status(200).json({
        ok: true,
        image: created[0],
        model: "p3-paint"
      });
    }

    // 4️⃣ ТЕКСТ → ФОТО (портрет с нуля)
    if (style === "photo" && source === "text") {
      const output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt,
            guidance: 3,
            steps: 22,
            width: 1024,
            height: 1024
          }
        }
      );

      return res.status(200).json({
        ok: true,
        image: output[0],
        model: "flux-schnell"
      });
    }

    return res.status(400).json({
      ok: false,
      error: "unmatched_mode"
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      message: e.message || String(e)
    });
  }
}