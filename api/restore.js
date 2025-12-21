// api/restore.js — Photo Restoration (2-pass pipeline + optional beautify pass #3)
// Uses Replicate image-edit model (default: FLUX-Kontext-Pro)
//
// BODY params:
//   photo: base64 data url OR image url (required)
//   mode: "colorize" | "bw" (optional; default "colorize")
//   beautify: boolean (optional; default false)
//   beautifyLevel: "soft" (optional; default "soft")
//
// Response:
//   { ok: true, image: <finalUrl>, restored: <restore2passUrl>, mode, beautifyApplied }

import Replicate from "replicate";

// You can override model via env if you want to test another Replicate model later
const RESTORE_MODEL =
  process.env.RESTORE_MODEL || "black-forest-labs/flux-kontext-pro";
const BEAUTIFY_MODEL =
  process.env.BEAUTIFY_MODEL || "black-forest-labs/flux-kontext-pro";

// PASS #1: максимально сохранить людей/лица/композицию, восстановить качество
const PASS1_PROMPT = [
  "restore and enhance this photo while preserving the original content exactly",

  "DO NOT remove any people",
  "DO NOT add new people",
  "keep the same number of people and their positions",
  "preserve each person's facial identity and features",
  "do NOT replace faces, do NOT swap faces, do NOT change people",

  "repair blur carefully, improve clarity and fine details",
  "reduce noise, scratches, dust and stains",
  "recover missing details subtly without changing the scene",
  "keep original composition and camera perspective",
  "keep clothing style and era consistent with the original photo",
  "do NOT modernize clothing",

  "no text, no captions, no logos, no watermarks",
  "photorealistic restoration only, no stylization"
].join(", ");

// PASS #2: убрать рамки/обрывки краёв, но лица/людей не менять
const PASS2_PROMPT = [
  "clean up the photo borders and remove paper frame artifacts",
  "remove torn edges, stains on the border, and leftover paper margins",
  "crop to the real photo content",

  "if parts near the border are missing, extend the background naturally",
  "do NOT invent new subjects",
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

// OPTIONAL PASS #3: мягкая “Photoshop-like” ретушь после реставрации
// ВАЖНО: это НЕ “сильное омоложение/операция”, а премиум ретушь.
// Сильное омоложение (Hollywood Pro) лучше делать в /api/generate.
const BEAUTIFY_SOFT_PROMPT = [
  "high-end natural photo retouch, like professional photoshop, keep the SAME people and identities",
  "reduce wrinkles and fine lines noticeably (forehead, under eyes, crow's feet, nasolabial folds) but keep realistic skin texture and pores",
  "even skin tone, remove mild blemishes and redness, keep realism",
  "subtle lifting effect only: slightly tighten jawline and neck area without changing facial structure or proportions",
  "improve light gently: softer flattering key light, natural contrast, no harsh shadows",
  "keep hair, glasses, clothing, background, and composition identical",
  "do NOT change age drastically; just a fresher healthier look",
  "no text, no captions, no logos, no watermarks"
].join(", ");

function pickImageUrl(output) {
  let imageUrl = null;

  if (Array.isArray(output)) {
    imageUrl = output[0];
  } else if (output?.output) {
    if (Array.isArray(output.output)) imageUrl = output.output[0];
    else if (typeof output.output === "string") imageUrl = output.output;
  } else if (typeof output === "string") {
    imageUrl = output;
  } else if (output?.url) {
    try {
      imageUrl = output.url();
    } catch {
      // ignore
    }
  }

  return imageUrl;
}

async function runReplicate(replicate, model, input) {
  const out = await replicate.run(model, { input });
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

    const { photo, mode, beautify, beautifyLevel } = body || {};

    if (!photo) {
      return res.status(400).json({ error: "Missing photo" });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({
        error: "Missing REPLICATE_API_TOKEN in environment variables"
      });
    }

    const m = (mode || "colorize").toLowerCase();
    const tonePreset = m === "bw" ? BW_PRESET : COLOR_PRESET;

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    // ---------- PASS #1 ----------
    const pass1Prompt = [PASS1_PROMPT, tonePreset].join(". ").trim();

    const pass1Url = await runReplicate(replicate, RESTORE_MODEL, {
      prompt: pass1Prompt,
      input_image: photo,
      output_format: "jpg",
      aspect_ratio: "match_input_image",
      safety_tolerance: 2,
      prompt_upsampling: false
    });

    if (!pass1Url) {
      return res
        .status(500)
        .json({ error: "Restore pass #1 returned no image URL" });
    }

    // ---------- PASS #2 ----------
    const pass2Prompt = [PASS2_PROMPT].join(". ").trim();

    const pass2Url = await runReplicate(replicate, RESTORE_MODEL, {
      prompt: pass2Prompt,
      input_image: pass1Url,
      output_format: "jpg",
      aspect_ratio: "match_input_image",
      safety_tolerance: 2,
      prompt_upsampling: false
    });

    const restoredUrl = pass2Url || pass1Url;

    // ---------- OPTIONAL PASS #3 (Beautify) ----------
    const wantBeautify = !!beautify;
    const level = (beautifyLevel || "soft").toLowerCase();

    if (!wantBeautify) {
      return res.status(200).json({
        ok: true,
        image: restoredUrl,
        restored: restoredUrl,
        mode: m,
        beautifyApplied: false
      });
    }

    // For now only "soft" is supported (safe for identity). We can add "pro" later.
    const beautifyPromptCore =
      level === "soft" ? BEAUTIFY_SOFT_PROMPT : BEAUTIFY_SOFT_PROMPT;

    // Keep BW if user asked BW
    const beautifyPrompt =
      m === "bw"
        ? [beautifyPromptCore, BW_PRESET].join(", ")
        : [beautifyPromptCore].join(", ");

    const beautifiedUrl = await runReplicate(replicate, BEAUTIFY_MODEL, {
      prompt: beautifyPrompt,
      input_image: restoredUrl,
      output_format: "jpg",
      aspect_ratio: "match_input_image",
      safety_tolerance: 2,
      prompt_upsampling: false
    });

    // If beautify failed — still return restored result (user must not lose output)
    return res.status(200).json({
      ok: true,
      image: beautifiedUrl || restoredUrl,
      restored: restoredUrl,
      mode: m,
      beautifyApplied: !!beautifiedUrl
    });
  } catch (err) {
    console.error("RESTORE ERROR:", err);
    return res.status(500).json({
      error: "Restore failed",
      details: err?.message || String(err)
    });
  }
}