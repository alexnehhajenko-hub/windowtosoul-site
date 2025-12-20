// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Portrait generation: style + skin + wow + expression + greetings

import Replicate from "replicate";

// ───────────── STYLES ─────────────
const STYLE_PREFIX = {
  beauty:
    "high-end beauty portrait, sharp eyes, natural skin tones, soft studio lighting, editorial look, subtle background, keep the same person and overall photo composition",

  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, keep the same person and composition",
  anime:
    "anime style portrait, clean line art, soft pastel shading, expressive eyes, keep the same person and composition",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field, colorful atmosphere, keep the same person and composition",
  classic:
    "classical old master portrait, realism, warm tones, detailed skin, soft vignette, keep the same person and composition",

  default:
    "realistic portrait, detailed face, soft studio lighting, natural colors, keep the same person and overall photo composition"
};

// ───────── SKIN + WOW + EXPRESSION EFFECTS ─────────
const EFFECT_PROMPTS = {
  // skin (retouch / younger)
  "no-wrinkles":
    "more youthful skin with reduced fine lines, realistic pores, natural texture, keep identity",
  younger:
    "make the same person look clearly younger by about 10–20 years, fresher face, smoother skin, keep identity and key facial structure",
  "smooth-skin":
    "smoother and more even skin, reduced blemishes, preserved pores, realistic skin texture",
  "beauty-one-touch":
    "beauty retouch: gently smooth skin, remove acne and small blemishes, reduce fine wrinkles, keep natural pores, keep identity",

  // wow (lighting / atmosphere)
  "glow-golden":
    "warm golden glow on the face, healthy luminous skin, soft highlights, gentle bokeh",
  "cinematic-light":
    "cinematic soft key light and gentle shadows, stronger depth, tasteful contrast, premium look",
  "studio-glam":
    "studio glam lighting, clean beauty highlights, subtle speculars on skin, makeup-ready editorial look",
  "luxury-editorial":
    "luxury editorial lighting, magazine-grade portrait, crisp details, elegant contrast, premium fashion mood",
  "neon-pop":
    "vibrant neon pop lighting, colorful glow accents, trendy modern look, keep face realistic and recognizable",

  // expression
  "smile-soft":
    "subtle soft smile, calm relaxed expression, keep identity",
  "smile-big":
    "big warm smile, friendly face, keep identity",
  "smile-hollywood":
    "wide hollywood smile, natural teeth, keep identity",
  laugh:
    "laughing expression with a bright smile, joyful natural look, keep identity",
  neutral:
    "neutral relaxed face, keep identity",
  serious:
    "serious focused look, keep identity",
  "eyes-bigger":
    "slightly more open attentive eyes, keep the same eye shape and identity",
  "eyes-brighter":
    "brighter vivid expressive gaze, keep identity",
  "surprised-wow":
    "wow surprised expression: eyes a bit wider, eyebrows raised, keep identity"
};

// ───────── GREETINGS ─────────
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year portrait with cozy winter atmosphere, colorful lights and bokeh, fireworks in the distance, elegant handwritten English text 'Happy New Year' integrated naturally",
  birthday:
    "birthday celebration portrait with balloons and confetti, party lights, bright happy mood, elegant handwritten English text 'Happy Birthday' integrated naturally",
  funny:
    "playful fun portrait with bright colors, dynamic neon shapes, comic-style details, bold handwritten English text 'You look amazing!' integrated naturally",
  scary:
    "spooky Halloween portrait with cold dramatic lighting, subtle fog, eerie background details, handwritten English text 'Happy Halloween' integrated naturally"
};

// ───────── IDENTITY (POSITIVE) ─────────
const IDENTITY_PROMPT =
  "Edit the input photo and preserve the same person's identity. " +
  "Keep key facial features consistent so the person remains clearly recognizable. " +
  "Maintain the overall framing and composition (shoulders-up portrait). " +
  "If an age/skin effect is selected, apply it subtly while keeping identity. " +
  "If an expression effect is selected, adjust expression while keeping identity.";

// ───────── UI CLEANUP (POSITIVE) ─────────
const UI_CLEANUP_TAIL =
  "If the input contains app or website UI elements, replace them with a clean, simple portrait background while keeping the person in the same position.";

// ───────── SAFETY (POSITIVE) ─────────
const SAFETY_TAIL =
  "single person portrait, fully clothed, natural anatomy, clean professional portrait result";

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
        .map((key) => EFFECT_PROMPTS[key])
        .filter(Boolean)
        .join(". ");
    }

    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    const promptParts = [
      stylePrefix,
      effectsPrompt,
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const prompt = promptParts.join(". ").trim();

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({
        error: "Missing REPLICATE_API_TOKEN in environment variables"
      });
    }

    const input = {
      prompt,
      output_format: "jpg"
    };

    if (photo) input.input_image = photo;

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
      image: imageUrl,
      prompt
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}