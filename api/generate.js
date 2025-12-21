// api/generate.js
// V2 pipeline (Replicate):
// - ALL styles + edits -> FLUX-2-Pro
// Goal: iPhone/Photoshop-like retouch WITHOUT swapping identity.

import Replicate from "replicate";

// ───────────── MODELS ─────────────
const MODEL_FLUX2_PRO = "black-forest-labs/flux-2-pro";

// ───────────── STYLES ─────────────
const STYLE_PREFIX = {
  beauty:
    "high-quality realistic iPhone/DSLR photo retouch. keep the same person. keep the same background and clothes. natural colors. realistic skin texture. do not change identity",
  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, keep the same person and recognizable face",
  anime:
    "anime style portrait, clean line art, soft pastel shading, keep the same person and recognizable face",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, keep the same person and recognizable face",
  classic:
    "classical old master portrait, realism, warm tones, keep the same person and recognizable face",
  default:
    "realistic photo edit, detailed face, soft studio lighting, natural colors, keep the same person and recognizable face"
};

// ───────── SKIN + EXPRESSION EFFECTS ─────────
const SKIN_KEYS = new Set([
  "hollywood-pro",
  "no-wrinkles",
  "younger",
  "smooth-skin",
  "glow-golden",
  "cinematic-light",
  "beauty-one-touch"
]);

const EFFECT_PROMPTS = {
  // ✅ Hollywood Pro — stronger wrinkle removal but NO identity swap
  "hollywood-pro":
    "HOLLYWOOD PRO RETOUCH (VERY STRONG): remove deep wrinkles and fine lines almost completely " +
    "(forehead lines, under-eye lines, crow's feet, nasolabial folds, marionette lines, neck lines). " +
    "remove under-eye darkness and bags strongly. smooth skin to an even premium beauty look, BUT keep natural texture and pores (no wax/plastic skin). " +
    "remove blotches/redness/spots, even skin tone, keep sharp details of eyes, eyelashes, eyebrows, lips, hair, glasses. " +
    "NO FACE SWAP. DO NOT change facial structure. DO NOT change head shape. DO NOT change age into a different person. " +
    "The person must remain clearly the same person from the input photo.",

  "no-wrinkles":
    "remove wrinkles and fine lines strongly (forehead, under eyes, crow's feet, nasolabial folds). smoother skin, keep natural texture and pores. do not change identity",
  younger:
    "make the same person look fresher (about 5–10 years). reduce sagging a bit. keep exact identity and facial structure",
  "smooth-skin":
    "smooth and even skin tone, reduce blemishes and redness, keep realistic texture. do not change identity",
  "beauty-one-touch":
    "natural beauty retouch: gently smooth skin, remove small blemishes, reduce fine wrinkles, keep realism and texture. do not change identity",
  "glow-golden":
    "warm golden glow on the face, healthy skin, soft highlights. do not change identity",
  "cinematic-light":
    "cinematic soft key light and gentle shadows on the face, better contrast. do not change identity",

  // expression
  "smile-soft": "same person with a subtle soft smile, keep identity",
  "smile-big": "same person with a big warm smile, keep identity",
  "smile-hollywood": "same person with a wide hollywood smile, keep identity",
  laugh: "same person laughing, keep identity",
  neutral: "same person with neutral relaxed face, keep identity",
  serious: "same person with a serious focused look, keep identity",
  "eyes-bigger": "slightly more open attentive eyes, keep identity",
  "eyes-brighter": "brighter expressive gaze, keep identity",
  "surprised-wow": "surprised wow expression, keep identity"
};

// ───────── GREETINGS ─────────
const GREETING_PROMPTS = {
  "new-year":
    "add a gentle festive New Year atmosphere. keep the person identical. subtle bokeh lights. add small elegant handwritten English text 'Happy New Year' (small, not covering the face)",
  birthday:
    "add a gentle birthday atmosphere. keep the person identical. subtle balloons/confetti in background. add small elegant handwritten English text 'Happy Birthday' (small, not covering the face)",
  funny:
    "add a gentle playful atmosphere. keep the person identical. add small handwritten English text 'You look amazing!' (small, not covering the face)",
  scary:
    "add a gentle spooky atmosphere (no gore). keep the person identical. subtle fog/background. add small handwritten English text 'Happy Halloween' (small, not covering the face)"
};

// ───────── IDENTITY (VERY STRONG) ─────────
const IDENTITY_PROMPT =
  "IMPORTANT: edit the input photo of the SAME person. " +
  "The result must be clearly recognizable as the same person. " +
  "Do NOT change facial structure, head shape, eye shape, nose, lips, jawline, cheekbones. " +
  "Do NOT replace the face with another person/model. " +
  "Keep hairstyle, hairline, hair color, eyebrows, and glasses consistent. " +
  "Keep the same camera angle and the same composition. Do NOT crop or zoom. " +
  "Do NOT beautify by changing identity. Only retouch skin/lighting when requested.";

// ───────── UI SCREENSHOT CLEANUP ─────────
const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot of a website/app (buttons, panels, UI text), remove and repaint all interface elements and restore a natural background while keeping the person identical.";

// ───────── SAFETY ─────────
const SAFETY_TAIL =
  "fully clothed, no nudity, no sexual content, keep realism, avoid distorted anatomy";

// ───────── helpers ─────────
function pickImageUrl(output) {
  if (Array.isArray(output)) return output[0] || null;
  if (output?.output) {
    if (Array.isArray(output.output)) return output.output[0] || null;
    if (typeof output.output === "string") return output.output;
  }
  if (typeof output === "string") return output;
  return null;
}

function buildEffectsPrompt(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return "";
  return keys
    .map((k) => EFFECT_PROMPTS[k])
    .filter(Boolean)
    .join(". ");
}

// Robust FLUX-2-Pro call (different models sometimes name image input differently)
// We try: input_images[] then input_image then image.
async function runFlux2Pro(replicate, image, prompt) {
  const tries = [
    // safest: only prompt + input_images (Flux-2-Pro supports up to 8 reference images)  [oai_citation:1‡Replicate](https://replicate.com/black-forest-labs/flux-2-pro/api)
    { input: { prompt, input_images: [image] } },

    // common alternates
    { input: { prompt, input_image: image } },
    { input: { prompt, image } },

    // if model supports these options, they help. If not — fallbacks above will work.
    {
      input: {
        prompt,
        input_images: [image],
        output_format: "jpg",
        aspect_ratio: "match_input_image"
      }
    },
    {
      input: {
        prompt,
        input_image: image,
        output_format: "jpg",
        aspect_ratio: "match_input_image"
      }
    },
    {
      input: {
        prompt,
        image,
        output_format: "jpg",
        aspect_ratio: "match_input_image"
      }
    }
  ];

  let lastErr = null;
  for (const payload of tries) {
    try {
      const out = await replicate.run(MODEL_FLUX2_PRO, payload);
      const url = pickImageUrl(out);
      if (url) return url;
      lastErr = new Error("No image URL in model output");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("FLUX-2-Pro failed");
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

    const { style, text, photo, effects, greeting } = body || {};

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({
        error: "Missing REPLICATE_API_TOKEN in environment variables"
      });
    }

    if (!photo) {
      return res.status(400).json({ error: "Missing photo" });
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const styleKey = style || "beauty";
    const stylePrefix = STYLE_PREFIX[styleKey] || STYLE_PREFIX.default;
    const userPrompt = (text || "").trim();

    const effectsArr = Array.isArray(effects) ? effects : [];
    const skinEffects = effectsArr.filter((k) => SKIN_KEYS.has(k));
    const otherEffects = effectsArr.filter((k) => !SKIN_KEYS.has(k));

    const greetingPrompt =
      greeting && GREETING_PROMPTS[greeting] ? GREETING_PROMPTS[greeting] : "";

    // one skin effect
    const skinKey = skinEffects[0] || null;
    const skinPrompt = skinKey ? (EFFECT_PROMPTS[skinKey] || "") : "";

    // Build one strong prompt:
    const promptParts = [
      stylePrefix,
      buildEffectsPrompt(otherEffects),

      // Skin retouch: minimal edit, only skin/lighting changes
      skinPrompt
        ? (
            "MINIMAL EDIT: change ONLY skin retouch and minor lighting/shadows on the face. " +
            "Do NOT change hair, glasses, background, clothes, body shape. " +
            skinPrompt
          )
        : "",

      greetingPrompt,
      userPrompt,

      // Repeat identity rules strongly (important for Flux edits)
      IDENTITY_PROMPT,
      "Keep the same face. keep the same eyes and eye spacing. keep the same nose and lips. keep the same glasses.",

      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const finalPrompt = promptParts.join(". ").trim();

    const url = await runFlux2Pro(replicate, photo, finalPrompt);
    return res.status(200).json({ ok: true, image: url });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}