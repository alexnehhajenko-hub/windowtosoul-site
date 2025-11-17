// api/generate.js — FLUX-Kontext-Pro (Replicate)
import Replicate from "replicate";

const STYLE_PREFIX = {
  beauty: "soft beauty portrait, studio lighting, bright airy tones, smooth flawless skin, no wrinkles, gentle high-end retouch",
  oil: "dramatic oil painting portrait, impasto style",
  anime: "anime style portrait, clean lines",
  poster: "cinematic movie poster portrait",
  classic: "classical old master portrait",
  default: "realistic portrait, soft studio lighting"
};

const EFFECT_PROMPTS = {
  "no-wrinkles": "no wrinkles",
  younger: "younger skin",
  "smooth-skin": "smooth skin",
  "smile-soft": "soft smile",
  "smile-big": "big smile",
  "smile-hollywood": "hollywood smile",
  laugh: "laughing",
  neutral: "neutral expression",
  serious: "serious expression",
  "eyes-bigger": "bigger eyes",
  "eyes-brighter": "brighter eyes"
};

const GREETING_PROMPTS = {
  "new-year": "festive winter atmosphere",
  birthday: "birthday mood",
  funny: "fun colorful atmosphere",
  scary: "dark horror atmosphere"
};

const NO_TEXT_BASE_PROMPT =
  "clean portrait, remove text, remove watermarks, no logos, no overlays";
const NEGATIVE_TEXT_PROMPT =
  "text, watermark, logo, subtitles, captions, ui elements";

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

    const { style, text, photo, effects, greeting } = body || {};
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;
    const userPrompt = (text || "").trim();

    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    const promptParts = [stylePrefix, NO_TEXT_BASE_PROMPT];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const prompt = promptParts.join(". ").trim();

    const input = {
      prompt,
      negative_prompt: NEGATIVE_TEXT_PROMPT,
      output_format: "jpg"
    };

    if (photo) {
      input.input_image = photo;
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input
    });

    let imageUrl = null;

    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (output?.output) {
      if (Array.isArray(output.output)) imageUrl = output.output[0];
      else if (typeof output.output === "string") imageUrl = output.output;
    } else if (typeof output === "string") {
      imageUrl = output;
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "No image URL returned" });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}

