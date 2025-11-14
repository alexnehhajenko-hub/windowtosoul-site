import Replicate from "replicate";

export const config = {
  api: {
    bodyParser: false,
  },
};

function readFile(req) {
  return new Promise((resolve, reject) => {
    let data = Buffer.alloc(0);

    req.on("data", chunk => {
      data = Buffer.concat([data, chunk]);
    });

    req.on("end", () => {
      resolve(data);
    });

    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  try {
    const rawBody = await readFile(req);

    const contentType = req.headers["content-type"] || "";
    const isMultipart = contentType.startsWith("multipart/form-data");

    let prompt = "oil painting portrait";
    let extra = "";
    let imageDataUrl = null;

    if (isMultipart) {
      // Разбираем multipart вручную
      const boundary = contentType.split("boundary=")[1];
      const parts = rawBody.toString().split(`--${boundary}`);

      for (const part of parts) {
        if (part.includes('name="prompt"')) {
          prompt = part.split("\r\n\r\n")[1]?.trim() || prompt;
        }

        if (part.includes('name="extra"')) {
          extra = part.split("\r\n\r\n")[1]?.trim() || "";
        }

        if (part.includes('name="photo"') && part.includes("filename=")) {
          const start = part.indexOf("\r\n\r\n") + 4;
          const fileBytes = part.slice(start, part.lastIndexOf("\r\n"));
          const base64 = Buffer.from(fileBytes, "binary").toString("base64");
          imageDataUrl = `data:image/jpeg;base64,${base64}`;
        }
      }
    } else {
      // JSON (fallback)
      const json = JSON.parse(rawBody.toString());
      prompt = json.prompt || prompt;
      extra = json.extra || "";
      imageDataUrl = json.image || null;
    }

    const finalPrompt = `${prompt}. ${extra}`;

    // 🔥 ВАЖНО: Если фото есть — отправляем dataURL, иначе только текст
    const input = {
      prompt: finalPrompt,
    };

    if (imageDataUrl) {
      input.image = imageDataUrl;
    }

    const output = await replicate.run(
      "black-forest-labs/flux-1.1-pro",
      { input }
    );

    res.status(200).json({
      ok: true,
      output,
    });

  } catch (err) {
    console.error("GENERATION ERROR:", err);
    res.status(500).json({ error: String(err) });
  }
}