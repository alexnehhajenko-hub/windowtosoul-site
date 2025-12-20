// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Portrait generation: style + expression + greetings + (skin as 2nd-pass)
// FIX: stronger identity preservation, no forced cropping ("shoulders up"), 2-pass skin retouch.

import Replicate from "replicate";

// ───────────── STYLES ─────────────
const STYLE_PREFIX = {
  beauty:
    "high-quality realistic photo edit, keep the same person, keep the same background and clothes, natural colors, clean skin, but do not change identity",
  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, keep original background unless it looks like a screenshot",
  anime:
    "anime style portrait, clean line art, soft pastel shading, big expressive eyes, colorful background, keep the same person",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field, colorful atmosphere, keep the same person",
  classic:
    "classical old master portrait, realism, warm tones, detailed skin, soft vignette, subtle textured background",
  default:
    "realistic photo edit, detailed face, soft studio lighting, natural colors, keep original background if it is not a UI screenshot"
};

// ───────── SKIN + EXPRESSION EFFECTS ─────────
const SKIN_KEYS = new Set([
  "no-wrinkles",
  "younger",
  "smooth-skin",
  "glow-golden",
  "cinematic-light",
  "beauty-one-touch"
]);

const EFFECT_PROMPTS = {
  // skin
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
    "cinematic soft key light and gentle shadows on the face, better contrast; do not change identity",

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
  "Do NOT change facial structure, eye shape, nose shape, lips shape, or face proportions. " +
  "Keep hairstyle, hairline, hair color, eyebrows, and glasses consistent unless explicitly requested. " +
  "Do NOT replace the face with another person/model. " +
  "Keep the same gender and the same general ethnicity. " +
  "Keep the same camera angle and the same composition. Do NOT crop or zoom.";

// ───────── REMOVE UI FROM SCREENSHOTS ─────────
const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot of a website/app (buttons, panels, menus, UI text), remove and repaint all interface elements. " +
  "In that case, keep the person identical and use a simple natural background.";

// ───────── SAFETY (NO FORCED CROP) ─────────
const SAFETY_TAIL =
  "person is fully clothed, no nudity, no sexual content, keep realism, avoid distorted anatomy";

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

    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;
    const userPrompt = (text || "").trim();

    const effectsArr = Array.isArray(effects) ? effects : [];
    const skinEffects = effectsArr.filter((k) => SKIN_KEYS.has(k));
    const otherEffects = effectsArr.filter((k) => !SKIN_KEYS.has(k));

    // GREETING
    const greetingPrompt = greeting && GREETING_PROMPTS[greeting] ? GREETING_PROMPTS[greeting] : "";

    // ───────── PASS #1: style + expression + greeting (NO skin) ─────────
    const pass1Parts = [
      stylePrefix,
      buildEffectsPrompt(otherEffects),
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const pass1Prompt = pass1Parts.join(". ").trim();

    const out1 = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt: pass1Prompt,
        input_image: photo,
        output_format: "jpg",
        aspect_ratio: "match_input_image",
        safety_tolerance: 2,
        prompt_upsampling: false
      }
    });

    const pass1Url = pickImageUrl(out1);
    if (!pass1Url) {
      return res.status(500).json({
        error: "No image URL returned from pass #1",
        raw: out1
      });
    }

    // If no skin effect — return pass1
    if (!skinEffects.length) {
      return res.status(200).json({
        ok: true,
        image: pass1Url,
        prompt: pass1Prompt
      });
    }

    // ───────── PASS #2: ONLY skin retouch, minimal change ─────────
    // (use only the first skin effect, since UI already enforces one, but keep safe)
    const skinKey = skinEffects[0];
    const skinPrompt = EFFECT_PROMPTS[skinKey] || "natural skin retouch, keep identity";

    const pass2Prompt = [
      "MINIMAL EDIT: apply ONLY the following change and keep everything else identical",
      skinPrompt,
      IDENTITY_PROMPT,
      "Do not change the background, do not change clothing, do not change hair, do not change age unless the effect explicitly says younger",
      SAFETY_TAIL
    ].join(". ");

    const out2 = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt: pass2Prompt,
        input_image: pass1Url,
        output_format: "jpg",
        aspect_ratio: "match_input_image",
        safety_tolerance: 2,
        prompt_upsampling: false
      }
    });

    const finalUrl = pickImageUrl(out2);
    if (!finalUrl) {
      // fallback to pass1 if pass2 fails
      return res.status(200).json({
        ok: true,
        image: pass1Url,
        note: "Pass #2 returned no image; returning pass #1 result."
      });
    }

    return res.status(200).json({
      ok: true,
      image: finalUrl
      // deliberately not returning prompts to frontend
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}