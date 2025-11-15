// api/generate.js
// Генерация портрета по фото + тексту через FLUX Kontext Pro (Replicate).

import fs from "fs";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Преобразуем dataURL из браузера во временный файл в /tmp
async function dataUrlToTempFile(dataUrl) {
  // Если это уже обычный URL (https://...), просто вернём строку
  if (typeof dataUrl === "string" && dataUrl.startsWith("http")) {
    return dataUrl;
  }

  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("Invalid photo format");
  }

  const [meta, base64] = dataUrl.split(",");
  if (!base64) {
    throw new Error("Invalid data URL");
  }

  const match = /data:image\/([^;]+);base64/.exec(meta);
  const ext = match?.[1] || "jpg";

  const buffer = Buffer.from(base64, "base64");
  const filePath = `/tmp/wts-photo-${Date.now()}.${ext}`;

  await fs.promises.writeFile(filePath, buffer);
  return fs.createReadStream(filePath);
}

// Строим prompt под выбранный стиль
function buildPrompt(style, text) {
  const stylePrefix =
    {
      oil: "oil painting portrait, detailed, soft warm light, artistic",
      anime: "anime style portrait, clean lines, soft pastel shading, anime style, big expressive eyes",
      poster: "cinematic movie poster portrait, dramatic lighting, film look, highly detailed",
      classic:
        "classical old master portrait, realism, warm tones, detailed brushwork, soft shadows",
    }[style] || "realistic portrait, soft light, highly detailed";

  const userPrompt = (text && String(text).trim()) || "";
  const merged = `${stylePrefix}. ${userPrompt}`.trim();

  return merged.length > 0
    ? merged
    : "realistic portrait of the same person as on the photo, soft light, detailed skin texture";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // --- Безопасный парсинг тела ---
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const { style, text, photo } = body;

    // Для Kontext фото ОБЯЗАТЕЛЬНО
    if (!photo) {
      return res.status(400).json({
        error: "Photo is required for this mode",
      });
    }

    const prompt = buildPrompt(style, text);

    // Подготовим файл для input_image
    const inputImage = await dataUrlToTempFile(photo);

    const input = {
      prompt,
      input_image: inputImage,
      output_format: "jpg",
    };

    console.log("WTS /api/generate → input:", {
      hasPhoto: !!photo,
      style,
      prompt,
    });

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      { input }
    );

    // В новых клиентах Replicate для Kontext возвращается объект с .url()
    let imageUrl = null;
    if (output && typeof output.url === "function") {
      imageUrl = output.url();
    } else if (typeof output === "string") {
      imageUrl = output;
    }

    if (!imageUrl) {
      console.error("No image URL returned from Replicate:", output);
      return res.status(502).json({
        error: "No image URL returned from Replicate",
      });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl,
      prompt,
    });
  } catch (err) {
    console.error("GENERATION ERROR /api/generate:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err),
    });
  }
}