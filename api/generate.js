import Replicate from "replicate";

// Отключаем встроенный bodyParser, сами читаем JSON.
export const config = {
  api: {
    bodyParser: false,
  },
};

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const prompt = (body && body.prompt) || "";
    const imageDataUrl = body && body.imageDataUrl;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const input = {
      prompt,
      num_inference_steps: 28,
      guidance_scale: 3.5,
    };

    // Если пришло фото — включаем режим image-to-image
    if (imageDataUrl && typeof imageDataUrl === "string") {
      // Replicate принимает data: URL или https-ссылку
      input.image = imageDataUrl;
      input.strength = 0.65; // 0–1: чем меньше, тем больше похоже на исходное фото
    }

    const output = await replicate.run("black-forest-labs/flux-1", {
      input,
    });

    let imageUrl = null;

    if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0];
    } else if (typeof output === "string") {
      imageUrl = output;
    } else if (
      output &&
      typeof output === "object" &&
      Array.isArray(output.output)
    ) {
      imageUrl = output.output[0];
    }

    if (!imageUrl) {
      return res.status(502).json({
        error: "No image URL returned from Replicate",
        raw: output,
      });
    }

    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error("API /api/generate error:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err && err.message ? err.message : String(err),
    });
  }
}