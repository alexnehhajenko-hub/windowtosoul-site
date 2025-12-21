// api/restore.js — Photo Restoration (2-pass pipeline: gentle restore -> border cleanup)
// Uses FLUX-Kontext-Pro (Replicate)
// Fixes in this version:
// - Stronger identity/face preservation (no "beauty face")
// - Gentler prompts (less chance to "invent" faces)
// - Vercel maxDuration increased

import Replicate from "replicate";

export const config = {
  maxDuration: 60
};

const PASS1_PROMPT = [
  "restore and enhance this photo while preserving the original content exactly",
  "keep the same number of people and their positions",
  "preserve each person's facial identity and expression exactly",
  "do NOT replace faces, do NOT swap faces, do NOT beautify faces into a different person",
  "repair blur carefully, improve clarity and fine details",
  "reduce noise, scratches, dust and stains gently",
  "recover missing details subtly without changing the scene",
  "keep original composition and camera perspective",
  "keep clothing and era consistent with the original photo (do not modernize)",
  "no text, no captions, no logos, no watermarks",
  "photorealistic restoration only, no stylization"
].join(", ");

const PASS2_PROMPT = [
  "clean up photo borders and remove paper frame artifacts carefully",
  "remove torn edges, stains on the border, and leftover paper margins",
  "do NOT crop aggressively; keep the same framing unless the border is clearly outside the real photo",
  "if parts near the border are missing, extend background naturally without inventing new subjects",
  "do NOT change any faces, do NOT change any people",
  "keep all people identical and in the same positions",
  "keep the same lighting and photographic realism",
  "no text, no captions, no logos, no watermarks"
].join(", ");

const COLOR_PRESET = [
  "colorize realistically with natural skin tones",
  "avoid oversaturation, keep classic photographic look"
].join(", ");

const BW_PRESET = [
  "keep it black and white",
  "improve tonal range and contrast, classic film look"
].join(", ");

function pickImageUrl(output) {
  if (!output) return null;
  if (Array.isArray(output)) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first?.url) {
      try {
        return typeof first.url === "function" ? first.url() : first.url;
      } catch {
        return null;
      }
    }
    return null;
  }
  if (output?.output) {
    if (Array.isArray(output.output)) return pickImageUrl(output.output);
    if (typeof output.output === "string") return output.output;
  }
  if (typeof output === "string") return output;
  if (output?.url) {
    try {
      return typeof output.url === "function" ? output.url() : output.url;
    } catch {
      return null;
    }
  }
  return null;
}

async function runFlux(replicate, prompt, inputImage) {
  // Keep payload minimal + match_input_image where possible
  try {
    const out = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt,
        input_image: inputImage,
        aspect_ratio: "match_input_image",
        output_format: "jpg",
        prompt_upsampling: false
      }
    });
    return pickImageUrl(out);
  } catch (e) {
    const out2 = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: { prompt, input_image: inputImage }
    });
    return pickImageUrl(out2);
  }
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

    if (!photo) {
      return res.status(400).json({ error: "Missing photo" });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    }

    const m = (mode || "colorize").toLowerCase();
    const tonePreset = m === "bw" ? BW_PRESET : COLOR_PRESET;

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const pass1Prompt = [PASS1_PROMPT, tonePreset].join(". ").trim();
    const pass1Url = await runFlux(replicate, pass1Prompt, photo);
    if (!pass1Url) {
      return res.status(500).json({ error: "Restore pass #1 returned no image URL" });
    }

    const pass2Prompt = PASS2_PROMPT.trim();
    const finalUrl = await runFlux(replicate, pass2Prompt, pass1Url);

    if (!finalUrl) {
      return res.status(200).json({
        ok: true,
        image: pass1Url,
        mode: m,
        note: "Pass #2 failed; returning pass #1."
      });
    }

    return res.status(200).json({
      ok: true,
      image: finalUrl,
      mode: m
    });
  } catch (err) {
    console.error("RESTORE 2-PASS ERROR:", err);
    return res.status(500).json({
      error: "Restore failed",
      details: err?.message || String(err)
    });
  }
}