// api/magazine-pro.js — Magazine Pro (ASYNC) via Replicate Predictions
// Model: black-forest-labs/flux-kontext-pro
// Returns prediction id; frontend polls /api/prediction

const MODEL_FLUX_KONTEXT_PRO = "black-forest-labs/flux-kontext-pro";

const MAGAZINE_PROMPT = [
  "MAGAZINE PRO RETOUCH (EDITORIAL): edit the input photo, same person, same face identity",
  "NO face swap, NO replacing face, keep the same head shape, facial structure, eye/nose/lips/jaw/cheekbones unchanged",
  "Retouch like Photoshop beauty: remove deep wrinkles and fine lines strongly, reduce under-eye shadows, remove blemishes, redness, spots",
  "Correct skin tone: natural healthy skin, NO green/cyan cast, correct white balance, avoid oversaturation",
  "Light: soft studio key light and gentle shadows, improve contrast slightly, keep pores/texture (not plastic skin)",
  "Subtle slimming only by reducing puffiness: slightly tighten cheeks/jawline/neck without changing proportions",
  "Expression lock: keep the exact same expression, NO forced smile, NO mouth changes",
  "Keep hairstyle, hairline, eyebrows, glasses, clothing and background consistent",
  "No text, no captions, no logos, no watermarks",
  "Photorealistic edit only, no stylization"
].join(", ");

async function createPrediction(model, input, cancelAfter = "4m") {
  const r = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      "Cancel-After": cancelAfter
    },
    body: JSON.stringify({ input })
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const details = j?.detail || j?.error || JSON.stringify(j);
    throw new Error(`Replicate create failed (${r.status}): ${details}`);
  }
  return j;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { photo } = body || {};
    if (!photo) return res.status(400).json({ error: "Missing photo" });

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    }

    const input = {
      prompt: MAGAZINE_PROMPT,
      input_image: photo,
      aspect_ratio: "match_input_image",
      output_format: "jpg"
    };

    const pred = await createPrediction(MODEL_FLUX_KONTEXT_PRO, input, "4m");

    return res.status(200).json({
      ok: true,
      prediction: pred?.id,
      status: pred?.status || "starting",
      web: pred?.urls?.web || null
    });
  } catch (err) {
    console.error("MAGAZINE PRO ERROR:", err);
    return res.status(500).json({
      error: "Magazine Pro failed",
      details: err?.message || String(err)
    });
  }
}
