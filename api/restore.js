// api/restore.js — Old Photo Restoration (Replicate / FLUX-Kontext-Pro)
// Цель: аккуратная реставрация старых фото без “перерисовки людей”.
// Важно: сохраняем всех людей в кадре, не убираем персонажей, убираем рамки/остатки фото.

import Replicate from "replicate";

const RESTORE_PROMPT =
  "RESTORE this exact old photo while preserving the original scene and ALL people. " +
  "Do NOT remove, crop out, replace, or merge people. Keep the same number of people and their positions. " +
  "Keep faces recognizable and consistent with the input (identity preservation). " +
  "Remove scratches, cracks, dust, stains, and noise. Improve clarity and contrast gently, keep it realistic. " +
  "Preserve original clothing style and era. Do NOT modernize outfits, haircuts, or background. " +
  "If the photo contains paper borders, torn edges, frame remnants, or background table/carpet around the photo, " +
  "CROP or INPAINT so the final output shows ONLY the photo content (the image area), " +
  "with clean natural edges. Remove visible white/dirty border and leftover paper frame. " +
  "Do NOT add new decorative frames. " +
  "For group photos: keep every face intact, do not replace faces, do not invent new persons. " +
  "Do not turn the result into a studio portrait. Keep the original composition. " +
  "If the input is black-and-white or sepia, keep it mostly natural; " +
  "you MAY add very subtle historical colorization only if it looks plausible and not artificial. " +
  "No text, no watermarks, no logos, no UI elements, no captions. " +
  "Do not hallucinate extra hands/limbs. Keep anatomy correct.";

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
    if (!photo) {
      return res.status(400).json({ error: "No photo provided" });
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const input = {
      prompt: RESTORE_PROMPT,
      input_image: photo,
      output_format: "jpg"
    };

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      { input }
    );

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

    if (!imageUrl) {
      return res.status(500).json({
        error: "No image URL returned",
        raw: output
      });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl
    });
  } catch (err) {
    console.error("RESTORE ERROR:", err);
    return res.status(500).json({
      error: "Restore failed",
      details: err?.message || String(err)
    });
  }
}