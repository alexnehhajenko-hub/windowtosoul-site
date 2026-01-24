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
    "high-quality realistic photo retouch, keep the same person, keep the same background and clothes, natural colors, realistic texture, do not change identity, correct white balance and keep natural skin tones",
  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, keep the same person and recognizable face",
  anime:
    "anime style portrait, clean line art, soft pastel shading, keep the same person and recognizable face",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, keep the same person and recognizable face",
  classic:
    "classical old master portrait, realism, warm tones, keep the same person and recognizable face",
  default:
    "realistic photo edit, detailed face, soft studio lighting, natural colors, keep the same person and recognizable face, correct white balance and keep natural skin tones"
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
    "reduce blotches/redness/spots. correct white balance and remove any green/magenta cast from skin. " +
    "keep all details of eyes, eyelashes, eyebrows, lips, hair, glasses. " +
    "NO FACE SWAP. DO NOT change facial structure. Keep the same person and same expression.",

  // ✅ NEW: Magazine Pro — “journal cover” retouch (NO identity change)
  "magazine-pro":
    "MAGAZINE PRO RETOUCH: create a magazine-cover quality portrait of the SAME person. " +
    "strong professional retouch: remove wrinkles and fine lines, reduce under-eye darkness, remove skin discoloration and redness, " +
    "even skin tone with natural texture (keep pores, not plastic). " +
    "correct white balance, ensure natural skin tones (no green/magenta cast). " +
    "make the face look fresher and slightly lifted via retouch and lighting, but do NOT change bone structure. " +
    "reduce the appearance of puffiness/sagging subtly (cheeks/jaw area) WITHOUT changing head shape or jawline geometry. " +
    "NO FACE SWAP. Keep the same eyes, nose, lips, eyebrows, hairline, glasses, and overall facial geometry 1:1.",

  "no-wrinkles":
    "remove wrinkles and fine lines strongly, smoother younger-looking skin, keep natural texture, correct white balance, do not change identity",
  younger:
    "make the same person look fresher (about 5–10 years), reduce sagging a bit by retouch and lighting, but keep exact identity and facial structure",
  "smooth-skin":
    "smooth and even skin tone, reduce blemishes and redness, keep realistic texture; correct white balance; do not change identity",
  "beauty-one-touch":
    "natural beauty retouch: gently smooth skin, remove small blemishes, reduce fine wrinkles, keep realism; correct white balance; do not change identity",
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
  // classic greetings
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
  "NO FACE SWAP. Do NOT replace the face with another person/model. " +
  "Do NOT change facial geometry: head shape, eye shape/position, nose, lips, jawline, cheekbones. " +
  "Keep hairstyle, hairline, hair color, eyebrows, and glasses consistent. " +
  "Keep the same camera angle and the same composition. Do NOT crop or zoom.";

// Extra lock when retouch is active (prevents “wrinkles coming back” on Oil/Poster/etc.)
const RETOUCH_LOCK =
  "If any retouch/skin effect is selected, keep the retouch result: do NOT re-introduce wrinkles, pores artifacts, aging texture, or dirty color casts. " +
  "Skin must stay clean and natural, with correct white balance and realistic skin tones.";

// Global color sanity (fix greenish faces)
const COLOR_TONE_LOCK =
  "Color rule: natural skin tones only. Neutralize any green/magenta cast on skin. Correct white balance. Avoid oversaturation.";

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

// Robust FLUX-2-Pro call (different models sometimes name image input differently)
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

    // Only one skin key at a time (as before)
    const skinKey = skinEffects[0] || null;
    const skinPrompt = skinKey ? (EFFECT_PROMPTS[skinKey] || "") : "";

    const hasRetouch = Boolean(skinPrompt);
    const retouchLock = hasRetouch ? RETOUCH_LOCK : "";

    // One final prompt (keeps your current structure):
    const promptParts = [
      stylePrefix,
      buildEffectsPrompt(otherEffects),

      hasRetouch
        ? ("MINIMAL EDIT: change ONLY retouch/skin. " + skinPrompt)
        : "",

      greetingPrompt
        ? ("MINIMAL EDIT: if greeting/prop is selected, apply ONLY that prop/atmosphere without changing the person's face. " + greetingPrompt)
        : "",

      userPrompt,

      // global locks
      IDENTITY_PROMPT,
      COLOR_TONE_LOCK,
      retouchLock,

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