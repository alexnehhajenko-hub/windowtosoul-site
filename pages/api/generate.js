import Replicate from "replicate";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Получаем данные формы
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    const boundary = req.headers["content-type"].split("boundary=")[1];
    const parts = body.toString().split(`--${boundary}`);

    let prompt = "portrait, beautiful artwork";
    let style = "oil painting";
    let imageBase64 = null;

    for (const part of parts) {
      if (part.includes('name="prompt"')) {
        prompt = part.split("\r\n\r\n")[1]?.trim() || prompt;
      }
      if (part.includes('name="style"')) {
        style = part.split("\r\n\r\n")[1]?.trim() || style;
      }
      if (part.includes('name="photo"') && part.includes("Content-Type")) {
        const img = part.split("\r\n\r\n")[1];
        imageBase64 = img?.trim();
      }
    }

    const fullPrompt = `${style}, ${prompt}`;

    const model = "black-forest-labs/flux-1.1-pro";

    const output = await replicate.run(model, {
      input: {
        prompt: fullPrompt,
        image: imageBase64 ? `data:image/png;base64,${imageBase64}` : undefined
      }
    });

    res.status(200).json({ output: output[0] });

  } catch (e) {
    console.error("API error:", e);
    res.status(500).json({ error: e.message });
  }
}