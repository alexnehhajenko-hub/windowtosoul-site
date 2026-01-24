// api/generate.js
// V2 pipeline (Replicate):
// - Styles + edits -> FLUX-2-Pro
// - MAGAZINE PRO (one-click editorial retouch) -> FLUX-Kontext-Pro (better text-guided editing)
// Goal: iPhone/Photoshop-like retouch WITHOUT swapping identity.

import Replicate from "replicate";

// ───────────── MODELS ─────────────
const MODEL_FLUX2_PRO = "black-forest-labs/flux-2-pro";
const MODEL_FLUX_KONTEXT_PRO = "black-forest-labs/flux-kontext-pro";

// ───────────── STYLES ─────────────
const STYLE_PREFIX = {
  beauty:
    "high-quality realistic photo retouch, keep the same person, keep the same background and clothes, natural colors, realistic texture, preserve identity",
  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, keep the same person and recognizable face",
  anime: "anime style portrait, clean line art, soft pastel shading, keep the same person and recognizable face",
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
    "HOLLYWOOD PRO RETOUCH: strong wrinkle reduction (forehead, under eyes, crow's feet, nasolabial). " +
    "Clean, even skin with realistic texture. Reduce redness/spots. Keep eyes, eyebrows, lips, hair and glasses identical. " +
    "Preserve facial structure and expression.",

  // ✅ Magazine Pro — editorial retouch (positive wording to avoid FLUX-2-Pro 'negative prompt' issues)
  "magazine-pro":
    "MAGAZINE PRO RETOUCH (EDITORIAL): keep the SAME person fully recognizable with the same facial features and proportions. " +
    "Create clean, healthy skin: remove wrinkles and fine lines strongly while keeping natural pores/texture. " +
    "Remove blemishes, spots, redness, under-eye shadows; keep skin CLEAR (do not introduce acne or new marks). " +
    "Correct white balance for natural skin tones (no green/cyan cast), keep classic photo colors. " +
    "Improve soft face lighting (editorial beauty light), slightly increase clarity and micro-contrast. " +
    "Subtle slimming by reducing puffiness only: gently tighten cheeks/jawline/neck a little, without changing bone structure. " +
    "Keep the same expression (no forced smile), keep hairstyle, eyebrows, glasses identical.",

  "no-wrinkles":
    "remove wrinkles and fine lines strongly, smoother younger-looking skin with realistic texture, preserve identity",
  younger:
    "make the same person look fresher (about 5–10 years), reduce sagging slightly, preserve identity and facial structure",
  "smooth-skin":
    "smooth and even skin tone, reduce blemishes and redness, keep realistic texture, preserve identity",
  "beauty-one-touch":
    "natural beauty retouch: gently smooth skin, remove small blemishes, reduce fine wrinkles, keep realism, preserve identity",
  "glow-golden": "warm golden glow, healthy skin, soft highlights, preserve identity",
  "cinematic-light": "cinematic soft key light and gentle shadows, better contrast, preserve identity",

  // expression
  "smile-soft": "same person with a subtle soft smile, preserve identity",
  "smile-big": "same person with a big warm smile, preserve identity",
  "smile-hollywood": "same person with a wide hollywood smile, preserve identity",
  laugh: "same person laughing, preserve identity",
  neutral: "same person with neutral relaxed face, preserve identity",
  serious: "same person with a serious focused look, preserve identity",
  "eyes-bigger": "slightly more open attentive eyes, preserve identity",
  "eyes-brighter": "brighter expressive gaze, preserve identity",
  "surprised-wow": "surprised wow expression, preserve identity"
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

  "devil-eyes":
    "ADD EFFECT ONLY: make the SAME person's eyes glow bright icy blue (subtle realistic glow). keep eye shape identical.",
  "santa-hat":
    "ADD ACCESSORY ONLY: add a classic Santa hat on top of the head (realistic fabric, correct perspective). keep face identical.",
  "viking-helm":
    "ADD ACCESSORY ONLY: add a tasteful Viking-style helmet/crown (no weapons). keep face identical.",
  "samurai-helm":
    "ADD ACCESSORY ONLY: add a Samurai kabuto helmet and subtle armor collar detail (no weapons). keep face identical.",
  "blue-demon":
    "ADD BACKGROUND CHARACTER ONLY: add a small glowing blue creature in the BACKGROUND corner (not covering the face). Keep the person unchanged."
};

// ───────── IDENTITY (positive wording) ─────────
const IDENTITY_PROMPT =
  "Identity lock: keep the same person. Keep facial structure, head shape, eye shape, nose, lips, jawline and cheekbones unchanged. " +
  "Keep hairstyle, hairline, hair color, eyebrows and glasses consistent. Keep the same camera angle, framing and composition.";

// ───────── UI SCREENSHOT CLEANUP ─────────
const UI_CLEANUP_TAIL =
  "If the input is a screenshot with UI elements, repaint the UI away and restore a natural background while keeping the person unchanged.";

// ───────── SAFETY ─────────
const SAFETY_TAIL = "fully clothed, keep realism, avoid distorted anatomy";

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
      input: { prompt, input_images: [image], output_format: "jpg", aspect_ratio: "match_input_image" }
    },
    { input: { prompt, input_image: image, output_format: "jpg", aspect_ratio: "match_input_image" } },
    { input: { prompt, image, output_format: "jpg", aspect_ratio: "match_input_image" } },
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

// Robust FLUX-Kontext-Pro call (image editing)
async function runKontextPro(replicate, image, prompt) {
  const tries = [
    {
      input: { prompt, input_image: image, output_format: "jpg", aspect_ratio: "match_input_image" }
    },
    { input: { prompt, image, output_format: "jpg", aspect_ratio: "match_input_image" } },
    { input: { prompt, input_image: image } },
    { input: { prompt, image } }
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
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

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

    // ✅ If MAGAZINE PRO selected -> Kontext-Pro (more stable editing)
    const isMagazine = skinKey === "magazine-pro";

    const promptParts = [
      // For Magazine Pro we keep stylePrefix minimal (beauty retouch), no art styles.
      isMagazine ? STYLE_PREFIX.beauty : stylePrefix,
      buildEffectsPrompt(otherEffects),
      skinPrompt ? ("Edit scope: apply only the described retouch while keeping identity. " + skinPrompt) : "",
      greetingPrompt
        ? ("Edit scope: apply only the selected atmosphere/prop while keeping the person unchanged. " + greetingPrompt)
        : "",
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const finalPrompt = promptParts.join(". ").trim();

    const url = isMagazine
      ? await runKontextPro(replicate, photo, finalPrompt)
      : await runFlux2Pro(replicate, photo, finalPrompt);

    return res.status(200).json({ ok: true, image: url });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({ error: "Generation failed", details: err?.message || String(err) });
  }
}