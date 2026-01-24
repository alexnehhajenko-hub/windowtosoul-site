// api/prediction.js — Replicate prediction status (polling endpoint)
// GET /api/prediction?id=...

function pickImageUrl(output) {
  if (Array.isArray(output)) return output[0] || null;
  if (output?.output) {
    if (Array.isArray(output.output)) return output.output[0] || null;
    if (typeof output.output === "string") return output.output;
  }
  if (typeof output === "string") return output;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const id = (req.query && req.query.id) || "";
    if (!id) return res.status(400).json({ error: "Missing id" });

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    }

    const r = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const details = j?.detail || j?.error || JSON.stringify(j);
      return res.status(r.status).json({ error: "Replicate read failed", details });
    }

    const image = pickImageUrl(j?.output);

    return res.status(200).json({
      ok: true,
      id: j?.id || id,
      status: j?.status || "unknown",
      image: image || null,
      error: j?.error || null,
      logs: j?.logs || null
    });
  } catch (err) {
    console.error("PREDICTION ERROR:", err);
    return res.status(500).json({
      error: "Prediction check failed",
      details: err?.message || String(err)
    });
  }
}