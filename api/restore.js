// api/restore.js — Photo Restoration (V2 async, single-pass: restore + border cleanup)
// Uses FLUX-Kontext-Pro (Replicate) and returns prediction id (frontend polls).
// ✅ Backward-compatible response fields: predictionId + imageUrl + output

const MODEL_FLUX_KONTEXT_PRO = "black-forest-labs/flux-kontext-pro";

const RESTORE_PROMPT_BASE = [
  "restore and enhance this photo while preserving the original content exactly",
  "keep the same number of people and their positions",
  "preserve each person's facial identity and features (NO face swap, NO replacing faces)",
  "repair blur carefully, improve clarity and fine details",
  "reduce noise, scratches, dust and stains",
  "clean up borders: remove paper frame artifacts, stains and torn edges",
  "crop only minimal to real photo content; if edges are missing, extend background naturally",
  "do NOT invent new subjects, do NOT add objects",
  "no text, no captions, no logos, no watermarks",
  "photorealistic restoration only, no stylization"
].join(", ");

const COLOR_PRESET = [
  "colorize realistically with natural skin tones",
  "avoid oversaturation, keep classic photographic look"
].join(", ");

const BW_PRESET = ["keep it black and white", "improve tonal range and contrast, classic film look"].join(
  ", "
);

function pickImageUrl(output) {
  if (Array.isArray(output)) return output[0] || null;
  if (output?.output) {
    if (Array.isArray(output.output)) return output.output[0] || null;
    if (typeof output.output === "string") return output.output;
  }
  if (typeof output === "string") return output;
  return null;
}

async function createOfficialPrediction(model, input, cancelAfter = "6m") {
  const r = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      // ✅ allow more time on Replicate side (doesn't block Vercel, just prevents early cancel)
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
    res.setHeader("Cache-Control", "no-store");

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { photo, mode } = body || {};
    if (!photo) return res.status(400).json({ error: "Missing photo" });

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    }

    const m = (mode || "colorize").toLowerCase();
    const tonePreset = m === "bw" ? BW_PRESET : COLOR_PRESET;

    const prompt = [RESTORE_PROMPT_BASE, tonePreset].join(". ").trim();

    const input = {
      prompt,
      input_image: photo,
      aspect_ratio: "match_input_image",
      output_format: "jpg"
    };

    const pred = await createOfficialPrediction(MODEL_FLUX_KONTEXT_PRO, input, "6m");

    // ✅ Usually null on create() for async models — that's OK
    const immediateImage = pickImageUrl(pred?.output);

    // ✅ Backward-compatible keys:
    // - predictionId: many frontends look for this name
    // - imageUrl/output: some old code expects a ready url or an array
    return res.status(200).json({
      ok: true,

      // async tracking
      prediction: pred?.id || null,
      predictionId: pred?.id || null,
      id: pred?.id || null,
      status: pred?.status || "starting",
      web: pred?.urls?.web || null,

      // compatible output
      image: immediateImage || null,
      imageUrl: immediateImage || null,
      output: immediateImage ? [immediateImage] : null,

      // meta
      mode: m,
      async: true,
      note: immediateImage
        ? "image ready"
        : "prediction created; poll /api/prediction with predictionId until succeeded"
    });
  } catch (err) {
    console.error("RESTORE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Restore failed",
      details: err?.message || String(err)
    });
  }
}