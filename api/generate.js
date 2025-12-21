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
    "high-quality realistic photo retouch, keep the same person, keep the same background and clothes, natural colors, realistic texture, do not change identity",
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
  // Hollywood Pro — stronger wrinkle removal, but MUST keep identity
  "hollywood-pro":
    "HOLLYWOOD PRO RETOUCH (IDENTITY SAFE): strongly reduce deep wrinkles and fine lines " +
    "(forehead, under eyes, crow's feet, nasolabial folds) using skin texture smoothing and tone blending, " +
    "NOT by redrawing facial features. Keep natural pores and realistic skin texture (no plastic). " +
    "Even out skin tone, remove redness/blotches/spots. Improve clarity and micro-contrast gently. " +
    "DO NOT change facial geometry: keep exact eye shape, eyelids, eyebrows, nose shape, lips shape, jawline, cheeks. " +
    "DO NOT change hairline, hairstyle, glasses. NO FACE SWAP. Keep the same person.",

  "no-wrinkles":
    "remove wrinkles and fine lines strongly, smoother younger-looking skin, keep natural texture, do not change identity",
  younger:
    "make the same person look fresher (about 5–10 years), reduce sagging a bit, but keep exact identity and facial structure",
  "smooth-skin":
    "smooth and even skin tone, reduce blemishes and redness, keep realistic texture; do not change identity",
  "beauty-one-touch":
    "natural beauty retouch: gently smooth skin, remove small blemishes, reduce fine wrinkles, keep realism; do not change identity",
  "glow-golden":
    "warm golden glow on the face, healthy skin, soft highlights; do not change identity",
  "cinematic-light":
    "cinematic soft key light and gentle shadows on the face, better contrast; do not change identity",

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
  "IMPORTANT: edit the input photo of the SAME people. " +
  "If there are multiple people, preserve EACH person's identity (do not replace or merge faces). " +
  "The result must be clearly recognizable as the same people. " +
  "Do NOT change facial structure, head shape, eye shape, nose, lips, jawline, cheekbones. " +
  "Do NOT replace faces with another person/model. NO FACE SWAP. " +
  "Keep hairstyle, hairline, hair color, eyebrows, and glasses consistent. " +
  "Keep the same camera angle and the same composition. Do NOT crop or zoom. " +
  "Keep the same number of people and their positions.";

// ───────── DETAIL (simulate photoshop zoom-retouch, without changing composition) ─────────
const DETAIL_TAIL =
  "RETUCH DETAIL: do the retouch with very high facial detail as if the face is zoomed-in 4x internally, " +
  "then keep the final image in the SAME original composition (no zoom, no crop).";

// ───────── UI SCREENSHOT CLEANUP ─────────
const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot of a website/app (buttons, panels, UI text), remove and repaint all interface elements and restore a natural background while keeping the people identical.";

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

// Robust FLUX-2-Pro call (models may name image input differently)
// We try: input_images[] then input_image then image.
async function runFlux2Pro(replicate, image, prompt, extraImages = null) {
  const images = Array.isArray(extraImages) && extraImages.length
    ? [image, ...extraImages].slice(0, 8)
    : [image];

  const tries = [
    {
      input: {
        prompt,
        input_images: images,
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
    },
    { input: { prompt, input_images: images } },
    { input: { prompt, input_image: image } },
    { input: { prompt, image } }
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

    // NOTE: refs is optional (future: multi-reference for group faces)
    const { style, text, photo, effects, greeting, refs } = body || {};

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

    const skinKey = skinEffects[0] || null;
    const skinPrompt = skinKey ? (EFFECT_PROMPTS[skinKey] || "") : "";

    // Strong “minimal edit” guardrail for retouch:
    const minimalEdit =
      skinPrompt
        ? "MINIMAL EDIT: change ONLY skin/retouch (wrinkles, texture, tone, gentle light). Do NOT redraw facial features."
        : "";

    // Build one strong prompt:
    const promptParts = [
      stylePrefix,
      buildEffectsPrompt(otherEffects),
      minimalEdit,
      skinPrompt,
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      DETAIL_TAIL,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const finalPrompt = promptParts.join(". ").trim();

    const extraRefs = Array.isArray(refs) ? refs : null;
    const url = await runFlux2Pro(replicate, photo, finalPrompt, extraRefs);

    return res.status(200).json({ ok: true, image: url });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}