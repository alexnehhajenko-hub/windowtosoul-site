import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { style, text, photo } = body;

    const stylePrefix = {
      oil: "oil painting portrait, detailed, warm light",
      anime: "anime portrait, clean pastel lines",
      poster: "cinematic movie poster, dramatic contrast",
      classic: "classical old master painting"
    }[style] || "realistic portrait";

    const prompt = `${stylePrefix}. ${text || ""}`.trim();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    console.log("START PREDICTION FOR:", prompt);

    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-kontext-pro",
      input: {
        prompt,
        input_image: photo,
        output_format: "jpg"
      },
    });

    console.log("PREDICTION CREATED:", prediction.id);

    // Ждём завершения
    let result = prediction;
    while (!["succeeded", "failed", "canceled"].includes(result.status)) {
      await new Promise(r => setTimeout(r, 1500));
      result = await replicate.predictions.get(result.id);
    }

    if (result.status !== "succeeded") {
      return res.status(500).json({
        error: "Generation failed",
        details: result
      });
    }

    const imageUrl = result.output?.[0];

    if (!imageUrl) {
      return res.status(500).json({
        error: "No output returned from Replicate",
        details: result
      });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl,
      prompt
    });

  } catch (err) {
    console.error("GEN ERROR:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message || err
    });
  }
}