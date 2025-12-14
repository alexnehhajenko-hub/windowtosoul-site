// api/restore.js — Photo Restoration (2-pass pipeline: identity restore -> border cleanup)
// Uses FLUX-Kontext-Pro (Replicate)

import Replicate from "replicate";

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

  // если края отсутствуют — дорисовать только фон/края, не трогая людей
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

    const m = (mode || "colorize").toLowerCase();
    const tonePreset = m === "bw" ? BW_PRESET : COLOR_PRESET;

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    // ---------- PASS #1 ----------
    const pass1Prompt = [PASS1_PROMPT, tonePreset].join(". ").trim();

    const out1 = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt: pass1Prompt,
        input_image: photo,
        output_format: "jpg"
      }
    });

    const pass1Url = pickImageUrl(out1);
    if (!pass1Url) {
      return res.status(500).json({ error: "Restore pass #1 returned no image URL" });
    }

    // ---------- PASS #2 ----------
    // ВАЖНО: во втором проходе используем результат первого как input_image
    const pass2Prompt = [PASS2_PROMPT].join(". ").trim();

    const out2 = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt: pass2Prompt,
        input_image: pass1Url,
        output_format: "jpg"
      }
    });

    const finalUrl = pickImageUrl(out2);
    if (!finalUrl) {
      // Если вдруг pass2 не вернул — отдаём pass1, чтобы пользователь не остался без результата
      return res.status(200).json({
        ok: true,
        image: pass1Url,
        mode: m,
        note: "Pass #2 failed to return an image; returning pass #1 result."
      });
    }

    return res.status(200).json({
      ok: true,
      image: finalUrl,
      mode: m,
      // не возвращаем промпты на фронт
      pass1: undefined,
      pass2: undefined
    });
  } catch (err) {
    console.error("RESTORE 2-PASS ERROR:", err);
    return res.status(500).json({
      error: "Restore failed",
      details: err?.message || String(err)
    });
  }
}