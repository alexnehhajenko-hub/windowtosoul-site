// api/generate.js — Replicate (default: FLUX-Kontext-Pro)
// Pipeline:
//   PASS #1 (ALWAYS): Hollywood Base retouch (wrinkles off, premium skin, subtle lift, better light) — keep identity.
//   PASS #2 (OPTIONAL): Apply chosen style + expression + greetings on top of beautified image.
//
// Notes:
// - This is the "Photoshop-fast & automatic" foundation for ALL styles.
// - Strong identity constraints + match input aspect ratio.
// - If style === "beauty" AND there are no extra effects/greeting/userPrompt, pass #2 is skipped to save cost.

import Replicate from "replicate";

// You can override models via env to test alternatives without code changes
// Example:
//   GENERATE_MODEL=black-forest-labs/flux-kontext-pro
//   BEAUTIFY_MODEL=black-forest-labs/flux-kontext-pro
const GENERATE_MODEL =
  process.env.GENERATE_MODEL || "black-forest-labs/flux-kontext-pro";
const BEAUTIFY_MODEL =
  process.env.BEAUTIFY_MODEL || "black-forest-labs/flux-kontext-pro";

// ───────────── STYLES ─────────────
// Important: styles here should NOT force cropping.
// We'll keep composition and background unless input is UI screenshot.
const STYLE_PREFIX = {
  beauty:
    "high-quality realistic photo edit, premium portrait look, keep the same person, keep the same background and clothes, natural colors, do not change identity",
  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, keep original background unless it looks like a screenshot",
  anime:
    "anime style portrait, clean line art, soft pastel shading, big expressive eyes, colorful background, keep the same person",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field, colorful atmosphere, keep the same person",
  classic:
    "classical old master portrait, realism, warm tones, detailed, soft vignette, subtle textured background, keep the same person",
  default:
    "realistic photo edit, detailed face, soft flattering light, natural colors, keep original background if it is not a UI screenshot"
};

// ───────── KEYS ─────────
const SKIN_KEYS = new Set([
  "no-wrinkles",
  "younger",
  "smooth-skin",
  "glow-golden",
  "cinematic-light",
  "beauty-one-touch"
]);

// ───────── EFFECT PROMPTS ─────────
const EFFECT_PROMPTS = {
  // skin (user-selected)
  "no-wrinkles":
    "remove wrinkles and fine lines strongly (forehead, under eyes, crow's feet, nasolabial folds), smoother younger-looking skin, but keep realistic pores and natural texture; do not change identity",
  younger:
    "make the same person look younger by about 10–15 years: healthier skin, reduced sagging, fresher look, but keep the exact same identity and facial structure",
  "smooth-skin":
    "smooth and even skin tone, reduce blemishes and redness, keep realistic pores; do not change identity",
  "beauty-one-touch":
    "natural beauty retouch: gently smooth skin, remove acne and small blemishes, reduce fine wrinkles, keep pores and realism; do not change identity",
  "glow-golden":
    "warm golden glow on the face, healthy skin, soft highlights; do not change identity",
  "cinematic-light":
    "cinematic soft key light and gentle shadows, better contrast; do not change identity",

  // expression
  "smile-soft":
    "same person with a subtle soft smile, calm relaxed expression, keep identity",
  "smile-big":
    "same person with a big warm smile, friendly face, keep identity",
  "smile-hollywood":
    "same person with a wide hollywood smile, visible teeth but natural, keep identity",
  laugh:
    "same person laughing with a bright smile, joyful natural expression, keep identity",
  neutral:
    "same person with neutral relaxed face, keep identity",
  serious:
    "same person with a serious focused look, no smile, keep identity",
  "eyes-bigger":
    "slightly more open attentive eyes, keep the same eye shape and identity",
  "eyes-brighter":
    "brighter more vivid expressive gaze, keep identity",
  "surprised-wow":
    "surprised wow expression, eyes a bit wider, eyebrows raised, keep identity"
};

// ───────── GREETINGS ─────────
const GREETING_PROMPTS = {
  "new-year":
    "add a gentle festive New Year atmosphere. keep the person identical. subtle bokeh lights. add small elegant handwritten English text 'Happy New Year' (small, not covering the face)",
  birthday:
    "add a gentle birthday atmosphere. keep the person identical. subtle balloons/confetti in background. add small elegant handwritten English text 'Happy Birthday' (small, not covering the face)",
  funny:
    "add a gentle playful atmosphere. keep the person identical. bright but not chaotic. add small handwritten English text 'You look amazing!' (small, not covering the face)",
  scary:
    "add a gentle spooky atmosphere (no gore). keep the person identical. subtle fog/background. add small handwritten English text 'Happy Halloween' (small, not covering the face)"
};

// ───────── IDENTITY (STRONG) ─────────
const IDENTITY_PROMPT =
  "IMPORTANT IDENTITY RULES: edit the input photo of the SAME person. " +
  "The result must be clearly recognizable as the same person. " +
  "Do NOT replace the face with another person/model. " +
  "Do NOT change facial structure, eye shape, nose shape, lips shape, or face proportions. " +
  "Keep hairstyle, hairline, hair color, eyebrows, and glasses consistent unless explicitly requested. " +
  "Keep the same gender and the same general ethnicity. " +
  "Keep the same camera angle and the same composition. Do NOT crop, do NOT zoom.";

// ───────── REMOVE UI FROM SCREENSHOTS ─────────
const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot of a website/app (buttons, panels, menus, UI text), remove and repaint all interface elements. " +
  "In that case, keep the person identical and use a simple natural background.";

// ───────── SAFETY ─────────
const SAFETY_TAIL =
  "person is fully clothed, no nudity, no sexual content, keep realism, avoid distorted anatomy, no extra people";

// ───────── HOLLYWOOD BASE (ALWAYS ON) ─────────
// This is the "fast photoshop" pass applied for ALL styles.
// We keep it realistic (pores remain), but wrinkles are reduced strongly.
// Subtle lift is allowed, but we forbid changes to facial structure/proportions.
function buildHollywoodBasePrompt({ skinKeySelected }) {
  const base = [
    "high-end hollywood portrait retouch, premium editorial beauty look, like professional photoshop",
    "reduce wrinkles and fine lines strongly (forehead, under eyes, crow's feet, nasolabial folds) but keep realistic skin texture and pores",
    "even skin tone, remove mild blemishes and redness, keep realism (no plastic skin)",
    "subtle lifting effect only: slightly tighten jawline and neck area without changing facial structure or proportions",
    "improve light gently: flattering soft key light, natural contrast, no harsh shadows",
    "keep hair, glasses, clothing, background, and composition identical"
  ];

  // If user explicitly chose 'younger' — allow a bit more age change (still keep identity)
  if (skinKeySelected === "younger") {
    base.push(
      "ALLOW younger look by about 10–15 years ONLY (fresher skin, less sagging), keep exact same identity and face structure"
    );
  } else {
    base.push("do NOT change age drastically; just a fresher healthier look");
  }

  // If user selected glow/cinematic, we can integrate it into base pass
  if (skinKeySelected === "glow-golden") {
    base.push("add a subtle warm golden glow, healthy skin highlights");
  }
  if (skinKeySelected === "cinematic-light") {
    base.push("cinematic soft key light and gentle shadows, better contrast");
  }

  // If user selected explicit skin prompt besides the default base — add it as a hint
  if (skinKeySelected && EFFECT_PROMPTS[skinKeySelected]) {
    base.push("apply also: " + EFFECT_PROMPTS[skinKeySelected]);
  }

  base.push(IDENTITY_PROMPT);
  base.push(UI_CLEANUP_TAIL);
  base.push(SAFETY_TAIL);

  return base.join(". ").trim();
}

// ───────── helpers ─────────
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

function buildEffectsPrompt(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return "";
  return keys
    .map((k) => EFFECT_PROMPTS[k])
    .filter(Boolean)
    .join(". ");
}

async function runModel(replicate, model, input) {
  const out = await replicate.run(model, { input });
  return pickImageUrl(out);
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

    const chosenStyle = style || "beauty";
    const stylePrefix = STYLE_PREFIX[chosenStyle] || STYLE_PREFIX.default;
    const userPrompt = (text || "").trim();

    const effectsArr = Array.isArray(effects) ? effects : [];

    // Choose ONE skin effect (UI enforces one, but we keep it safe)
    const skinEffects = effectsArr.filter((k) => SKIN_KEYS.has(k));
    const skinKey = skinEffects[0] || null;

    // Other (expression etc.)
    const otherEffects = effectsArr.filter((k) => !SKIN_KEYS.has(k));

    const greetingPrompt =
      greeting && GREETING_PROMPTS[greeting] ? GREETING_PROMPTS[greeting] : "";

    // ───────── PASS #1: HOLLYWOOD BASE (ALWAYS) ─────────
    const pass1Prompt = buildHollywoodBasePrompt({ skinKeySelected: skinKey });

    const beautifiedUrl = await runModel(replicate, BEAUTIFY_MODEL, {
      prompt: pass1Prompt,
      input_image: photo,
      output_format: "jpg",
      aspect_ratio: "match_input_image",
      safety_tolerance: 2,
      prompt_upsampling: false
    });

    if (!beautifiedUrl) {
      return res.status(500).json({
        error: "No image URL returned from Hollywood Base pass",
        raw: null
      });
    }

    // If style is beauty AND no extra effects/greeting/user text → return pass #1
    const needsSecondPass =
      chosenStyle !== "beauty" ||
      (otherEffects && otherEffects.length > 0) ||
      !!greetingPrompt ||
      !!userPrompt;

    if (!needsSecondPass) {
      return res.status(200).json({
        ok: true,
        image: beautifiedUrl
      });
    }

    // ───────── PASS #2: STYLE + EXPRESSION + GREETING on top ─────────
    // IMPORTANT: we do NOT re-apply strong skin smoothing here (already done in pass #1),
    // to avoid identity drift. We only apply style / expression / greeting / userPrompt.
    const pass2Parts = [
      stylePrefix,
      buildEffectsPrompt(otherEffects),
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const pass2Prompt = pass2Parts.join(". ").trim();

    const finalUrl = await runModel(replicate, GENERATE_MODEL, {
      prompt: pass2Prompt,
      input_image: beautifiedUrl,
      output_format: "jpg",
      aspect_ratio: "match_input_image",
      safety_tolerance: 2,
      prompt_upsampling: false
    });

    if (!finalUrl) {
      // fallback: return beautified result
      return res.status(200).json({
        ok: true,
        image: beautifiedUrl,
        note: "Style pass returned no image; returning Hollywood Base result."
      });
    }

    return res.status(200).json({
      ok: true,
      image: finalUrl
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}