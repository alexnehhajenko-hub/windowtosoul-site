// api/generate.js
// СТАБИЛЬНАЯ версия: работаем по стилю + тексту.
// Фото (imageBase64) принимаем, но пока НЕ используем в модели (чтобы не ловить ошибки формата).
// Следующим шагом отдельно прикрутим img2img-модель.

import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return res
        .status(500)
        .json({ error: "missing_REPLICATE_API_TOKEN_on_server" });
    }

    const body = req.body || {};
    const style = body.style || "oil";
    const userPrompt = (body.prompt || "").trim();
    const imageBase64 = body.imageBase64 || null; // пока не используем, но поле есть

    const stylePrompts = {
      oil:
        "beautiful oil painting portrait of a person, warm soft light, brush strokes, highly detailed, 4k",
      anime:
        "anime style portrait of a person, soft cel shading, detailed eyes, studio light, clean lines, 4k illustration",
      fantasy:
        "fantasy art portrait of a person, magical atmosphere, dramatic lighting, epic background, 4k digital painting",
      realistic:
        "ultra realistic portrait photo of a person, soft natural daylight, clean background, 4k, sharp details",
    };

    const basePrompt = stylePrompts[style] || stylePrompts.oil;
    const finalPrompt = userPrompt
      ? `${basePrompt}, ${userPrompt}`
      : basePrompt;

    const replicate = new Replicate({ auth: token });

    const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
      input: {
        prompt: finalPrompt,
      },
    });

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      return res.status(502).json({
        error: "no_image_from_replicate",
        raw: output,
      });
    }

    return res.status(200).json({
      ok: true,
      imageUrl,
      usedPrompt: finalPrompt,
      usedStyle: style,
      usedPhoto: Boolean(imageBase64),
    });
  } catch (err) {
    console.error("REPLICATE ERROR:", err);
    return res.status(500).json({
      error: "server_error",
      details: err?.message || String(err),
    });
  }
}