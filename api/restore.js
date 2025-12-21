// api/restore.js — Photo Restoration (V2: Qwen Light Restoration -> Qwen Upscale)
// Goal: improve old photo quality WITHOUT changing identity (no new people, no face swap)

import Replicate from "replicate";

const MODEL_QWEN_LIGHT_RESTORE = "qwen-edit-apps/qwen-image-edit-plus-lora-light-restoration";
const MODEL_QWEN_UPSCALE = "qwen-edit-apps/qwen-image-edit-plus-lora-upscale";

const IDENTITY_GUARD =
  "IMPORTANT: preserve the original people and facial identity exactly. " +
  "Do NOT replace faces. Do NOT change the number of people. Do NOT add new people. " +
  "Do NOT change facial structure (eyes/nose/lips/jaw). Keep composition and perspective.";

const RESTORE_PROMPT_BASE = [
  "restore and enhance this photo while preserving the original content exactly",
  "repair blur carefully, improve clarity and fine details",
  "reduce noise, scratches, dust, stains",
  "recover missing details subtly without changing the scene",
  "keep original composition and camera perspective",
  "no text, no captions, no logos, no watermarks",
  "photorealistic restoration only, no stylization",
  IDENTITY_GUARD
].join(". ");

const COLOR_PRESET = [
  "colorize realistically with natural skin tones",
  "avoid oversaturation, keep classic photographic look"
].join(". ");

const BW_PRESET = [
  "keep it black and white",
  "improve tonal range and contrast, classic film look"
].join(". ");

function pickImageUrl(output) {
  if (Array.isArray(output)) return output[0] || null;
  if (output?.output) {
    if (Array.isArray(output.output)) return output.output[0] || null;
    if (typeof output.output === "string") return output.output;
  }
  if (typeof output === "string") return output;
  if (output?.url) {
    try {
      return output.url();
    } catch {
      return null;
    }
  }
  return null;
}

async function runQwen(replicate, model, image, prompt, opts = {}) {
  const out = await replicate.run(model, {
    input: {
      image,
      prompt,
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      output_quality: 95,

      go_fast: false,
      num_inference_steps: opts.num_inference_steps ?? 40,
      lora_scale: opts.lora_scale,
      true_guidance_scale: opts.true_guidance_scale,

      disable_safety_checker: false
    }
  });
  return pickImageUrl(out);
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

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const m = (mode || "colorize").toLowerCase();
    const tonePreset = m === "bw" ? BW_PRESET : COLOR_PRESET;

    // PASS #1: light restoration (identity-safe)
    const pass1Prompt = [RESTORE_PROMPT_BASE, tonePreset].join(". ").trim();
    const pass1Url = await runQwen(replicate, MODEL_QWEN_LIGHT_RESTORE, photo, pass1Prompt, {
      lora_scale: 1.0,
      true_guidance_scale: 1.0,
      num_inference_steps: 40
    });

    if (!pass1Url) {
      return res.status(500).json({ error: "Restore pass #1 returned no image URL" });
    }

    // PASS #2: upscale / detail enhancement
    const pass2Prompt = [
      "enhance details and clarity, keep identity exactly, do not change faces",
      "reduce remaining noise and artifacts, keep photographic realism",
      IDENTITY_GUARD
    ].join(". ");

    const finalUrl = await runQwen(replicate, MODEL_QWEN_UPSCALE, pass1Url, pass2Prompt, {
      lora_scale: 1.0,
      true_guidance_scale: 1.0,
      num_inference_steps: 40
    });

    return res.status(200).json({
      ok: true,
      image: finalUrl || pass1Url,
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