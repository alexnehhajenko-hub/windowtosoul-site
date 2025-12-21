// api/generate.js
// V2 pipeline (Replicate):
// - ALL styles + edits -> FLUX-2-Pro
// Goal: iPhone/Photoshop-like retouch WITHOUT swapping identity.
// Fixes in this version:
// - Stronger identity preservation for ALL people (group photos)
// - Hollywood Pro: stronger wrinkle removal but no "generic face"
// - More robust output URL parsing
// - Optional refs[] support (up to 8 reference images total)
// - Vercel maxDuration increased (so it can wait longer)

import Replicate from "replicate";

// Vercel Serverless Function config (if your plan supports it)
export const config = {
  maxDuration: 60
};

// ───────────── MODELS ─────────────
const MODEL_FLUX2_PRO = "black-forest-labs/flux-2-pro";

// ───────────── STYLES ─────────────
const STYLE_PREFIX = {
  beauty:
    "high-quality realistic photo retouch, preserve the original photo realism, natural colors, realistic skin texture, keep the same people, keep the same background and clothes",
  oil:
    "oil painting look, visible brush strokes, warm artistic color grading, keep the same people and recognizable faces, do not turn faces into generic models",
  anime:
    "anime portrait look, clean line art, soft shading, keep the same people and recognizable faces, do not replace faces",
  poster:
    "cinematic movie poster look, dramatic lighting, high contrast, keep the same people and recognizable faces",
  classic:
    "classical old master portrait look, realism, warm tones, keep the same people and recognizable faces",
  default:
    "realistic photo edit, detailed face, soft studio lighting, natural colors, keep the same people and recognizable faces"
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
  // Hollywood Pro — strong retouch, but must keep identity
  "hollywood-pro":
    "HOLLYWOOD PRO RETOUCH (IDENTITY SAFE): remove deep wrinkles and fine lines strongly (forehead, under eyes, crow's feet, nasolabial folds). " +
    "even out skin tone, remove redness/spots/blotches. " +
    "keep natural pores and realistic texture (NO plastic skin). " +
    "DO NOT beautify into a different person. DO NOT change facial geometry. " +
    "keep eyes, eyelids, eyebrows, nose, lips, jawline exactly the same. " +
    "keep glasses, hairstyle, hairline identical. " +
    "NO FACE SWAP. Keep the same age impression (do NOT make a different age), only skin quality improvement.",

  "no-wrinkles":
    "remove wrinkles and fine lines strongly, keep natural texture and pores, do not change identity",
  younger:
    "make the same person look slightly fresher (subtle, 3–5 years), but keep exact identity and facial structure",
  "smooth-skin":
    "smooth and even skin tone, reduce blemishes and redness, keep realistic texture; do not change identity",
  "beauty-one-touch":
    "natural beauty retouch: gently smooth skin, remove small blemishes, reduce fine wrinkles, keep realism; do not change identity",
  "glow-golden":
    "warm golden glow on the face, healthy skin, soft highlights; do not change identity",
  "cinematic-light":
    "cinematic soft key light and gentle shadows on the face, better contrast; do not change identity",

  // expression
  "smile-soft": "same people with a subtle soft smile, keep identity",
  "smile-big": "same people with a big warm smile, keep identity",
  "smile-hollywood": "same people with a wide hollywood smile, keep identity",
  laugh: "same people laughing, keep identity",
  neutral: "same people with neutral relaxed face, keep identity",
  serious: "same people with a serious focused look, keep identity",
  "eyes-bigger": "slightly more open attentive eyes, keep identity",
  "eyes-brighter": "brighter expressive gaze, keep identity",
  "surprised-wow": "surprised wow expression, keep identity"
};

// ───────── GREETINGS ─────────
const GREETING_PROMPTS = {
  "new-year":
    "add a gentle festive New Year atmosphere. keep all people identical. subtle bokeh lights. add small elegant handwritten English text 'Happy New Year' (small, not covering faces)",
  birthday:
    "add a gentle birthday atmosphere. keep all people identical. subtle balloons/confetti in background. add small elegant handwritten English text 'Happy Birthday' (small, not covering faces)",
  funny:
    "add a gentle playful atmosphere. keep all people identical. add small handwritten English text 'You look amazing!' (small, not covering faces)",
  scary:
    "add a gentle spooky atmosphere (no gore). keep all people identical. subtle fog/background. add small handwritten English text 'Happy Halloween' (small, not covering faces)"
};

// ───────── IDENTITY (VERY STRONG) ─────────
const IDENTITY_PROMPT =
  "IDENTITY RULES (VERY IMPORTANT): Edit the input image, do not create new people. " +
  "If there are multiple people in the photo, preserve ALL people: same number of people, same positions, same faces, same expressions. " +
  "Do NOT swap faces. Do NOT replace anyone with a different person. " +
  "Do NOT change facial structure: head shape, eye shape, nose, lips, jawline, cheekbones. " +
  "Keep hairstyle, hairline, hair color, eyebrows, glasses consistent. " +
  "Keep the same camera angle and composition. Do NOT crop or zoom.";

// ───────── UI SCREENSHOT CLEANUP ─────────
const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot of a website/app (buttons, panels, UI text), remove and repaint all interface elements and restore a natural background while keeping all people identical.";

// ───────── SAFETY ─────────
const SAFETY_TAIL =
  "fully clothed, no nudity, no sexual content, keep realism, avoid distorted anatomy";

// ───────── helpers ─────────
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

function buildEffectsPrompt(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return "";
  return keys
    .map((k) => EFFECT_PROMPTS[k])
    .filter(Boolean)
    .join(". ");
}

// Robust FLUX-2-Pro call
async function runFlux2Pro(replicate, image, refs, prompt) {
  const refImages = Array.isArray(refs) ? refs.filter(Boolean) : [];
  // FLUX-2-Pro: up to 8 reference images total
  const inputImages = [image, ...refImages].slice(0, 8);

  const tries = [
    {
      input: {
        prompt,
        input_images: inputImages,
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
    { input: { prompt, input_images: inputImages } },
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

    // One-skin-effect behavior
    const skinKey = skinEffects[0] || null;
    const skinPrompt = skinKey ? (EFFECT_PROMPTS[skinKey] || "") : "";

    // Stronger "retouch only" constraint when skin is selected
    const retouchOnlyTail = skinPrompt
      ? "MINIMAL EDIT: apply ONLY skin retouch on faces. Keep everything else (background, clothes, hair) identical. Do not repaint the whole scene."
      : "";

    const promptParts = [
      stylePrefix,
      buildEffectsPrompt(otherEffects),
      skinPrompt ? skinPrompt : "",
      retouchOnlyTail,
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const finalPrompt = promptParts.join(". ").trim();

    const url = await runFlux2Pro(replicate, photo, refs, finalPrompt);
    return res.status(200).json({ ok: true, image: url });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}