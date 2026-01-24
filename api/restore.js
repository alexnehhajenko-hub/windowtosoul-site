// api/restore.js — Photo Restoration (V2 async, single-pass: restore + border cleanup)
// Uses FLUX-Kontext-Pro (Replicate) but returns prediction id (frontend polls).

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
  "photorealistic restoration only, no stylization",
  // ✅ anti-green / correct WB
  "CRITICAL COLOR RULES: natural human skin tones, correct white balance, neutral gray balance",
  "remove green/magenta color cast, avoid sickly green faces, avoid gray-green skin",
  "keep lips natural, avoid neon/green shadows on face",
  "keep overall colors realistic"
].join(", ");

const COLOR_NEUTRAL = [
  "colorize realistically with natural skin tones",
  "avoid oversaturation, keep classic photographic look",
  "neutral white balance"
].join(", ");

const COLOR_WARM = [
  "colorize realistically with natural skin tones",
  "avoid oversaturation, keep classic photographic look",
  "slightly warm skin tones (healthy, not orange)",
  "warm white balance, but keep whites neutral"
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

async function createOfficialPrediction(model, input, cancelAfter = "4m") {
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

    const { photo, mode } = body || {};
    if (!photo) return res.status(400).json({ error: "Missing photo" });

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    }

    const m = (mode || "neutral").toLowerCase();
    const tonePreset = m === "bw" ? BW_PRESET : m === "warm" ? COLOR_WARM : COLOR_NEUTRAL;

    const prompt = [RESTORE_PROMPT_BASE, tonePreset].join(". ").trim();

    const input = {
      prompt,
      input_image: photo,
      aspect_ratio: "match_input_image",
      output_format: "jpg"
    };

    const pred = await createOfficialPrediction(MODEL_FLUX_KONTEXT_PRO, input, "4m");
    const immediateImage = pickImageUrl(pred?.output);

    return res.status(200).json({
      ok: true,
      prediction: pred?.id,
      status: pred?.status || "starting",
      web: pred?.urls?.web || null,
      image: immediateImage || null,
      mode: m
    });
  } catch (err) {
    console.error("RESTORE ERROR:", err);
    return res.status(500).json({
      error: "Restore failed",
      details: err?.message || String(err)
    });
  }
}