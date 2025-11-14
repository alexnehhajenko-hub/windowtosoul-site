// api/generate.js

const Replicate = require("replicate");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      let data = {};
      try {
        data = JSON.parse(body || "{}");
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON" });
      }

      const style = data.style || "oil painting";
      const extra = data.prompt || "";
      const fullPrompt = `${style}, ${extra}, highly detailed, cinematic, 4k`;

      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });

      if (!process.env.REPLICATE_API_TOKEN) {
        return res
          .status(500)
          .json({ error: "REPLICATE_API_TOKEN is missing" });
      }

      // ВАЖНО: prompt должен быть СТРОКОЙ!
      const output = await replicate.run(
        "black-forest-labs/flux-1:1cfafb0e0faae7cabd1a7595f3237963",
        {
          input: {
            prompt: fullPrompt
          }
        }
      );

      const imageUrl = Array.isArray(output) ? output[0] : output;

      if (!imageUrl) {
        return res.status(502).json({ error: "Model returned no image" });
      }

      res.status(200).json({ imageUrl });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
      details: err.message || String(err),
    });
  }
};