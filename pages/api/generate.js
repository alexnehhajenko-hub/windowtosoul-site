// api/generate.js

const Replicate = require("replicate");

module.exports = async (req, res) => {
  // Разрешаем только POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Ждём JSON: { prompt: "...", style: "..." }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      let data = {};
      try {
        data = JSON.parse(body || "{}");
      } catch (e) {
        // если пришёл кривой JSON
        return res.status(400).json({ error: "Invalid JSON" });
      }

      const style = data.style || "oil painting";
      const extra = data.prompt || "";
      const fullPrompt = `${style} portrait, ${extra} cinematic, highly detailed, 4k`;

      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });

      if (!process.env.REPLICATE_API_TOKEN) {
        return res
          .status(500)
          .json({ error: "REPLICATE_API_TOKEN is not set in environment" });
      }

      // простейший вызов FLUX-1
      const output = await replicate.run(
        "black-forest-labs/flux-1:1cfafb0e0faae7cabd1a7595f3237963",
        {
          input: {
            prompt: fullPrompt,
          },
        }
      );

      const imageUrl = Array.isArray(output) ? output[0] : output;

      if (!imageUrl) {
        return res
          .status(502)
          .json({ error: "No image URL from Replicate", raw: output });
      }

      res.status(200).json({ imageUrl, usedPrompt: fullPrompt });
    });
  } catch (err) {
    console.error("API ERROR:", err);
    res.status(500).json({
      error: "Server error",
      details: err.message || String(err),
    });
  }
};