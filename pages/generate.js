export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const REP_KEY = process.env.REPLICATE_API_TOKEN;
    if (!REP_KEY) {
      return res.status(500).json({ ok: false, error: "missing_REPLICATE_API_TOKEN" });
    }

    const body = req.body || {};
    const img = body.imageBase64;
    const style = body.style || "oil";
    const userPrompt = (body.prompt || "").trim();

    if (!img) {
      return res.status(400).json({ ok: false, error: "missing_image" });
    }

    // ---- 🎨 Стили -----
    let stylePrompt = "";
    if (style === "oil") {
      stylePrompt = "oil painting, rich texture, masterful brush strokes, warm colors, dramatic lighting, museum quality artwork";
    }
    if (style === "fantasy") {
      stylePrompt = "fantasy portrait, glowing light, magical atmosphere, enchanted forest, cinematic epic style, incredibly detailed";
    }
    if (style === "location") {
      stylePrompt = "beautiful scenery background, breathtaking landscape, sunset glow, professional photography, depth of field";
    }

    const finalPrompt =
      `${stylePrompt}. Transform the uploaded photo into this style. Face must stay the same. ` +
      (userPrompt ? `Extra details: ${userPrompt}.` : "");

    // ---- 📡 Replicate request ----
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${REP_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "a7a5b2711d4aa83caaa3c862a73740763c7b61ad1187dca5c7ff280df8d3f5cb", // Face-to-Many
        input: {
          image: `data:image/jpeg;base64,${img}`,
          prompt: finalPrompt,
          guidance_scale: 3,
          num_inference_steps: 28,
        }
      })
    });

    const prediction = await response.json();

    // Если ошибка
    if (prediction.error) {
      return res.status(500).json({ ok: false, error: prediction.error });
    }

    // Ждём результат
    let resultUrl = null;

    while (!resultUrl) {
      await new Promise(r => setTimeout(r, 1500));

      const r2 = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        { headers: { Authorization: `Token ${REP_KEY}` } }
      );

      const p2 = await r2.json();

      if (p2.status === "succeeded") {
        resultUrl = p2.output[0];
      } else if (p2.status === "failed") {
        return res.status(500).json({ ok: false, error: "generation_failed" });
      }
    }

    return res.status(200).json({
      ok: true,
      image: resultUrl
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      message: String(e)
    });
  }
}