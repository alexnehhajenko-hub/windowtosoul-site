// api/generate.js
// V2 pipeline (Replicate):
// - Styles + edits -> FLUX-2-Pro
// - MAGAZINE PRO -> FLUX.1 Kontext [pro] (better identity consistency for edits)
// Goal: iPhone/Photoshop-like retouch WITHOUT swapping identity.

import Replicate from "replicate";

// ───────────── MODELS ─────────────
const MODEL_FLUX2_PRO = "black-forest-labs/flux-2-pro";
const MODEL_FLUX_KONTEXT_PRO = "black-forest-labs/flux-kontext-pro";

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
  "magazine-pro",
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
    "HOLLYWOOD PRO RETOUCH: remove deep wrinkles and fine lines strongly (forehead, under eyes, crow's feet, nasolabial folds). " +
    "make skin smooth, even and clean like premium beauty retouch, but keep natural texture (no plastic). " +
    "reduce blotches/redness/spots. keep all details of eyes, eyelashes, eyebrows, lips, hair, glasses. " +
    "NO FACE SWAP. DO NOT change facial structure. Keep the same person and same expression.",

  // Magazine Pro — editorial retouch (must NOT change identity)
  "magazine-pro":
    "MAGAZINE PRO RETOUCH (EDITORIAL / PHOTOSHOP-LIKE): keep the SAME person 100% recognizable. " +
    "STRONG wrinkle removal (forehead, under eyes, crow's feet, nasolabial folds) while preserving natural skin texture (pores, no plastic). " +
    "Remove blemishes/redness/spots. IMPORTANT: DO NOT ADD new pimples, acne, moles or skin defects. " +
    "Fix skin color: natural healthy skin tone, NO green/cyan cast, correct white balance, avoid oversaturation. " +
    "Lighting: subtle soft key light on face, slightly improved clarity, realistic shadows. " +
    "Subtle slimming ONLY by reducing puffiness: slightly tighten cheeks/jawline/neck WITHOUT changing bone structure or facial proportions. " +
    "EXPRESSION LOCK: keep the same expression, mouth shape and lips (NO forced smile). " +
    "NO FACE SWAP. Do NOT replace the face. Keep hairstyle, eyebrows, glasses identical.",

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

// ───────── GREETINGS / PROPS ─────────
const GREETING_PROMPTS = {
  "new-year":
    "add a gentle festive New Year atmosphere. keep the person identical. subtle bokeh lights. " +
    "add small elegant handwritten English text 'Happy New Year' (small, not covering the face)",
  birthday:
    "add a gentle birthday atmosphere. keep the person identical. subtle balloons/confetti in background. " +
    "add small elegant handwritten English text 'Happy Birthday' (small, not covering the face)",
  funny:
    "add a gentle playful atmosphere. keep the person identical. " +
    "add small handwritten English text 'You look amazing!' (small, not covering the face)",
  scary:
    "add a gentle spooky atmosphere (no gore). keep the person identical. subtle fog/background. " +
    "add small handwritten English text 'Happy Halloween' (small, not covering the face)",

  // props / costumes (no text overlay)
  "devil-eyes":
    "ADD EFFECT ONLY: make the SAME person's eyes glow bright icy blue (subtle realistic glow). " +
    "Do NOT change the eye shape, iris size, face, hair, or expression. No horror, no gore.",
  "santa-hat":
    "ADD ACCESSORY ONLY: add a classic Santa hat on top of the head (realistic fabric, correct perspective). " +
    "Keep face, hairline, hairstyle and identity identical. Do not cover the eyes/face.",
  "viking-helm":
    "ADD ACCESSORY ONLY: add a tasteful Viking-style helmet/crown on the head (no weapons). " +
    "Keep face and identity identical. Keep lighting consistent. Do not change hairstyle or facial structure.",
  "samurai-helm":
    "ADD ACCESSORY ONLY: add a Samurai kabuto helmet and a subtle armor collar/shoulder detail (no weapons). " +
    "Keep the same face and identity 100%. Do not change facial structure, skin, or expression.",
  "blue-demon":
    "ADD BACKGROUND CHARACTER ONLY: add a small glowing blue demon/creature in the BACKGROUND corner (not covering the face). " +
    "Cute-stylized but still fits the photo lighting. No gore. Do NOT change the person."
};

// ───────── IDENTITY (VERY STRONG) ─────────
const IDENTITY_PROMPT =
  "IMPORTANT: edit the input photo of the SAME person. " +
  "The result must be clearly recognizable as the same person. " +
  "Do NOT change facial structure, head shape, eye shape, nose, lips, jawline, cheekbones. " +
  "Do NOT replace the face with another person/model. " +
  "Keep hairstyle, hairline, hair color, eyebrows, and glasses consistent. " +
  "Keep the same camera angle and the same composition. Do NOT crop or zoom.";

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
  return keys.map((k) => EFFECT_PROMPTS[k]).filter(Boolean).join(". ");
}

// Robust FLUX-2-Pro call
async function runFlux2Pro(replicate, image, prompt) {
  const tries = [
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
    },
    { input: { prompt, input_images: [image] } },
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

// Robust FLUX Kontext Pro call (better for true edits / identity consistency)
async function runFluxKontextPro(replicate, image, prompt) {
  const tries = [
    {
      input: {
        prompt,
        input_image: image,
        aspect_ratio: "match_input_image",
        output_format: "jpg"
      }
    },
    {
      input: {
        prompt,
        input_images: [image],
        aspect_ratio: "match_input_image",
        output_format: "jpg"
      }
    },
    { input: { prompt, input_image: image } },
    { input: { prompt, input_images: [image] } }
  ];

  let lastErr = null;
  for (const payload of tries) {
    try {
      const out = await replicate.run(MODEL_FLUX_KONTEXT_PRO, payload);
      const url = pickImageUrl(out);
      if (url) return url;
      lastErr = new Error("No image URL in model output");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("FLUX-Kontext-Pro failed");
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
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN in environment variables" });
    }
    if (!photo) return res.status(400).json({ error: "Missing photo" });

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const styleKey = style || "beauty";
    const stylePrefix = STYLE_PREFIX[styleKey] || STYLE_PREFIX.default;
    const userPrompt = (text || "").trim();

    const effectsArr = Array.isArray(effects) ? effects : [];
    const skinEffects = effectsArr.filter((k) => SKIN_KEYS.has(k));
    const otherEffects = effectsArr.filter((k) => !SKIN_KEYS.has(k));

    const greetingPrompt = greeting && GREETING_PROMPTS[greeting] ? GREETING_PROMPTS[greeting] : "";

    const skinKey = skinEffects[0] || null;
    const skinPrompt = skinKey ? (EFFECT_PROMPTS[skinKey] || "") : "";

    const isMagazinePro = skinKey === "magazine-pro";

    // For MAGAZINE PRO we want the cleanest "edit" prompt possible
    const magazineLockTail =
      "MAGAZINE PRO RULES: do NOT change identity, do NOT change expression, do NOT add any new skin defects (pimples/acne). " +
      "Keep everything else unchanged.";

    const promptParts = [
      // keep your structure, but allow MAGAZINE PRO to focus on edit-quality
      stylePrefix,
      buildEffectsPrompt(otherEffects),
      skinPrompt ? ("MINIMAL EDIT: " + skinPrompt) : "",
      greetingPrompt
        ? ("MINIMAL EDIT: if greeting/prop is selected, apply ONLY that prop/atmosphere without changing the person's face. " +
            greetingPrompt)
        : "",
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL,
      isMagazinePro ? magazineLockTail : ""
    ].filter(Boolean);

    const finalPrompt = promptParts.join(". ").trim();

    const url = isMagazinePro
      ? await runFluxKontextPro(replicate, photo, finalPrompt)
      : await runFlux2Pro(replicate, photo, finalPrompt);

    return res.status(200).json({ ok: true, image: url });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}