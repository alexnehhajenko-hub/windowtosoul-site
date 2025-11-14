// pages/api/generate.js

// Отключаем стандартный парсер — у нас multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Читаем весь body как буфер
    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.*)$/);

    if (!boundaryMatch) {
      return res.status(400).json({ error: "No multipart boundary" });
    }

    const boundary = boundaryMatch[1];
    const parts = buffer.toString("utf8").split(`--${boundary}`);

    let userPrompt = "";
    let style = "oil painting"; // стиль по умолчанию

    for (const part of parts) {
      if (!part || part === "--\r\n") continue;

      // поле "prompt"
      if (part.includes('name="prompt"')) {
        const start = part.indexOf("\r\n\r\n");
        if (start !== -1) {
          userPrompt = part
            .slice(start + 4)
            .trim()
            .replace(/\r\n--$/, "")
            .trim();
        }
      }

      // поле "style"
      if (part.includes('name="style"')) {
        const start = part.indexOf("\r\n\r\n");
        if (start !== -1) {
          style = part
            .slice(start + 4)
            .trim()
            .replace(/\r\n--$/, "")
            .trim() || style;
        }
      }

      // поле "photo" пока НЕ используем — игнорируем
      // if (part.includes('name="photo"') && part.includes("filename=")) { ... }
    }

    // Строим английский prompt, чтобы он НЕ был пустой
    // и всегда подходил модели Replicate (иначе "The string did not match the expected pattern").
    let finalPrompt = "";

    const stylePrefixMap = {
      "oil painting":
        "oil painting portrait of a person, soft brush strokes, warm light, highly detailed, elegant",
      "fantasy art":
        "fantasy art portrait of a person, magical atmosphere, glowing light, epic composition, highly detailed",
      realistic:
        "highly realistic portrait photo of a person, natural lighting, 85mm lens, depth of field, detailed skin",
    };

    const baseStyle = stylePrefixMap[style] || stylePrefixMap["oil painting"];

    if (userPrompt && userPrompt.trim().length > 0) {
      finalPrompt = `${baseStyle}, ${userPrompt.trim()}`;
    } else {
      finalPrompt = baseStyle;
    }

    // На всякий случай — если что-то пошло совсем не так
    if (!finalPrompt || finalPrompt.trim().length === 0) {
      finalPrompt =
        "oil painting portrait of a person, soft warm light, highly detailed, elegant";
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // ⚠️ ВРЕМЕННО работаем ТОЛЬКО по описанию (без фото),
    // чтобы всё стабильно запускалось и не было ошибок формата.
    const output = await replicate.run("black-forest-labs/flux-1", {
      input: {
        prompt: finalPrompt,
      },
    });

    // flux-1 обычно возвращает массив URL
    const imageUrl = Array.isArray(output) ? output[0] : output;

    return res.status(200).json({ output: imageUrl, prompt: finalPrompt });
  } catch (e) {
    console.error("API ERROR:", e);
    return res.status(500).json({
      error: "Generation failed",
      details: e?.message || String(e),
    });
  }
}