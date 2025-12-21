// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Portrait generation: style + greetings + (skin as 2nd-pass)
// FIX: much stronger anti-aging for deep wrinkles, Hollywood Pro, better identity locking.

import Replicate from "replicate";

// ───────────── STYLES ─────────────
const STYLE_PREFIX = {
  beauty:
    "high-quality realistic photo edit of the SAME person. professional beauty retouch like Photoshop (natural), clean skin, even tone, improved lighting, but keep identity. keep the same background and clothes",
  oil:
    "oil painting portrait, detailed, soft warm light, artistic, rich colors. keep the same person. keep original background unless it looks like a UI screenshot",
  anime:
    "anime style portrait, clean line art, soft pastel shading, keep the same person",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field, colorful atmosphere. keep the same person",
  classic:
    "classical old master portrait, realism, warm tones, subtle vignette. keep the same person. preserve facial identity",
  default:
    "realistic photo edit, detailed face, soft studio lighting, natural colors. keep the same person and identity. keep original background if not a UI screenshot"
};

// ───────── SKIN EFFECTS ─────────
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
  "hollywood-pro":
    "HOLLYWOOD PRO RETOUCH: strong anti-aging and facelift-like retouch while preserving identity. remove deep wrinkles and folds strongly (forehead, under eyes, crow's feet, nasolabial folds, marionette lines). tighten jawline and neck slightly, lift midface subtly, smoother younger-looking skin, but keep realistic pores and natural texture. do NOT change facial structure",
  "no-wrinkles":
    "remove wrinkles and fine lines strongly (forehead, under eyes, crow's feet, nasolabial folds, marionette lines). smooth deep creases. keep realistic pores and natural texture. do not change identity",
  younger:
    "make the same person look younger by about 15–20 years: fresher skin, reduced sagging, smoother under-eye area, but keep the exact same identity and facial structure",
  "smooth-skin":
    "smooth and even skin tone, reduce blemishes and redness, keep realistic pores. do not change identity",
  "beauty-one-touch":
    "natural beauty retouch: smooth skin, remove small blemishes, reduce wrinkles, keep pores and realism. do not change identity",
  "glow-golden":
    "warm golden healthy glow, soft highlights. do not change identity",
  "cinematic-light":
    "cinematic soft key light, gentle shadows, better contrast. do not change identity"
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
    "add a gentle spooky atmosphere (no gore). keep the person identical. subtle fog/background. add a faint glowing demon silhouette far in the background with bright blue eyes (small, not covering the face). add small handwritten English text 'Happy Halloween' (small, not covering the face)"
};

// ───────── IDENTITY (STRONG) ─────────
const IDENTITY_PROMPT =
  "IMPORTANT IDENTITY RULES: edit the input photo of the SAME person. " +
  "The result must be clearly recognizable as the same person. " +
  "Do NOT change facial structure, skull shape, eye shape, nose shape, lips shape, or face proportions. " +
  "Keep hairstyle, hairline, hair color, eyebrows, and glasses consistent. " +
  "Do NOT replace the face with another person/model. " +
  "Keep the same gender and the same general ethnicity. " +
  "Keep the same camera angle, framing and composition. Do NOT crop, zoom or change head size.";

// ───────── REMOVE UI FROM SCREENSHOTS ─────────
const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot of a website/app (buttons, panels, UI text), remove and repaint all interface elements. " +
  "In that case, keep the person identical and use a simple natural background.";

// ───────── SAFETY ─────────
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

async function runFlux(replicate, prompt, inputImage) {
  // Replicate schema for this model is minimal; we keep inputs minimal too.
  // Try match_input_image first; if model rejects it, retry without.
  try {
    const out = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt,
        input_image: inputImage,
        aspect_ratio: "match_input_image"
      }
    });
    return pickImageUrl(out);
  } catch (e) {
    const out2 = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt,
        input_image: inputImage
      }
    });
    return pickImageUrl(out2);
  }
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

    const greetingPrompt =
      greeting && GREETING_PROMPTS[greeting] ? GREETING_PROMPTS[greeting] : "";

    // ───────── PASS #1: style + greeting (no skin retouch) ─────────
    const pass1Parts = [
      stylePrefix,
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const pass1Prompt = pass1Parts.join(". ").trim();

    const pass1Url = await runFlux(replicate, pass1Prompt, photo);
    if (!pass1Url) {
      return res.status(500).json({
        error: "No image URL returned from pass #1"
      });
    }

    // No skin retouch selected -> return pass1
    if (!skinEffects.length) {
      return res.status(200).json({ ok: true, image: pass1Url });
    }

    // ───────── PASS #2: skin retouch (stronger, not “too minimal”) ─────────
    const skinKey = skinEffects[0];
    const skinPrompt = EFFECT_PROMPTS[skinKey] || "professional skin retouch, keep identity";

    const pass2Prompt = [
      "Apply a professional high-end beauty retouch similar to Photoshop (frequency separation).",
      skinPrompt,
      "Preserve the SAME person identity: same face structure, same eyes, nose, lips, same hair and glasses.",
      "Keep background, clothing, pose and framing identical. Do NOT crop or zoom.",
      "Do not add new people or remove people.",
      SAFETY_TAIL
    ].join(". ");

    const finalUrl = await runFlux(replicate, pass2Prompt, pass1Url);
    if (!finalUrl) {
      return res.status(200).json({
        ok: true,
        image: pass1Url,
        note: "Pass #2 returned no image; returning pass #1 result."
      });
    }

    return res.status(200).json({ ok: true, image: finalUrl });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}