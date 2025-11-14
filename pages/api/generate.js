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
    const formData = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      req.on("error", reject);
    });

    // Extract file manually
    const boundary = req.headers["content-type"].split("boundary=")[1];
    const parts = formData.toString().split(`--${boundary}`);

    let fileBuffer = null;
    let promptText = "oil painting portrait";

    for (let part of parts) {
      if (part.includes('name="photo"') && part.includes("filename=")) {
        const fileStart = part.indexOf("\r\n\r\n") + 4;
        const fileContent = part.substring(fileStart, part.lastIndexOf("\r\n"));
        fileBuffer = Buffer.from(fileContent, "binary");
      }

      if (part.includes('name="prompt"')) {
        const start = part.indexOf("\r\n\r\n") + 4;
        promptText = part.substring(start, part.lastIndexOf("\r\n"));
      }
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const input = {
      prompt: promptText,
    };

    if (fileBuffer) {
      input.image = fileBuffer;
    }

    const output = await replicate.run(
      "black-forest-labs/flux-1:1cfafb0e0faae7cabd1a7595f3237963",
      { input }
    );

    res.status(200).json({ output });
  } catch (e) {
    console.error("API ERROR:", e);
    res.status(500).json({ error: "Generation failed", details: e.message });
  }
}