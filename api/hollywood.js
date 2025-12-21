// api/hollywood.js — Hollywood Pro (skin retouch, identity-safe)
// Uses Qwen Image Edit Plus – Skin LoRA (Replicate)

import Replicate from "replicate";

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

const HOLLYWOOD_PROMPT = [
  "Professional high-end beauty retouch (like Photoshop).",
  "Keep the SAME person, keep identity 1:1. Do not change facial structure.",
  "Remove wrinkles strongly (forehead, under eyes, crow’s feet, nasolabial folds), reduce pores visibility slightly but keep natural skin texture (no plastic skin).",
  "Reduce under-eye bags, even skin tone, remove blemishes and redness, keep natural highlights.",
  "Subtle face lift effect: slightly tighter jawline and cheeks, but realistic (no extreme surgery look).",
  "IMPORTANT: keep the same expression (do not change smile, mouth, eyes).",
  "Do not change hair, hairline, eyebrows, glasses, clothes, background.",
  "No new people, no face swap, no replacement, no stylization.",
  "Person is fully clothed, no nudity, no sexual content."
].join(" ");

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
      return res.status(400).json({ error: "Missing photo" });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({
        error: "Missing REPLICATE_API_TOKEN in environment variables"
      });
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    // Qwen Image Edit preset interface (shared inputs):
    // image, prompt, aspect_ratio, go_fast, output_format, output_quality...
    const output = await replicate.run(
      "qwen-edit-apps/qwen-image-edit-plus-lora-skin",
      {
        input: {
          image: photo,
          prompt: HOLLYWOOD_PROMPT,
          aspect_ratio: "match_input_image",
          go_fast: false, // quality pass (slower but better)
          output_format: "jpg",
          output_quality: 95,
          disable_safety_checker: false
        }
      }
    );

    const imageUrl = pickImageUrl(output);
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
    console.error("HOLLYWOOD ERROR:", err);
    return res.status(500).json({
      error: "Hollywood Pro failed",
      details: err?.message || String(err)
    });
  }
}