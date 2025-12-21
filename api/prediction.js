// api/prediction.js
// GET /api/prediction?id=...  -> returns status + image (when ready)
// Used by frontend polling to avoid long-hanging requests.

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
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    }

    const id = (req.query?.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing prediction id" });

    const r = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      return res.status(r.status).json({
        error: "Replicate GET failed",
        details: j?.detail || j?.error || JSON.stringify(j)
      });
    }

    const image = pickImageUrl(j?.output);
    return res.status(200).json({
      ok: true,
      id: j?.id,
      status: j?.status || "unknown",
      image: image || null,
      replicateError: j?.error || null,
      web: j?.urls?.web || null
    });
  } catch (err) {
    console.error("PREDICTION POLL ERROR:", err);
    return res.status(500).json({
      error: "Prediction poll failed",
      details: err?.message || String(err)
    });
  }
}