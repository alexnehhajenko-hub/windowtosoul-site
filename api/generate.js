// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Portrait generation: style + effects + expression + greetings
// ✅ 2-pass pipeline: pass1 = main portrait, pass2 = strong skin retouch (wrinkles removal)

import Replicate from "replicate";

// ───────────── STYLES ─────────────
const STYLE_PREFIX = {
  beauty:
    "high-end beauty portrait, clean studio look, natural colors, sharp eyes, realistic skin texture, keep the same person",
  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, keep the same person",
  anime:
    "anime style portrait, clean line art, soft pastel shading, big expressive eyes, keep the same person",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, colorful atmosphere, keep the same person",
  classic:
    "classical old master portrait, realism, warm tones, detailed skin, subtle vignette, keep the same person",
  default:
    "realistic portrait, detailed face, soft studio lighting, natural colors, keep the same person"
};

// ───────── EFFECTS ─────────
const EFFECT_PROMPTS = {
  // skin
  "no-wrinkles":
    "STRONG RETOUCH: remove wrinkles and fine lines very noticeably (forehead, under eyes, crow's feet, nasolabial lines). " +
    "keep identity, keep pores lightly visible, do not make plastic skin, do not change face shape",

  younger:
    "AGE REGRESSION: make the same person look clearly younger by about 15–25 years while keeping identity. " +
    "reduce deep wrinkles, reduce sagging, fresher skin, reduce under-eye bags, slightly tighter jawline, keep natural look",

  "smooth-skin":
    "beauty skin smoothing: more even skin tone, reduce blemishes, keep pores and realistic texture, keep identity",

  "beauty-one-touch":
    "beauty retouch: remove acne/small blemishes, reduce fine wrinkles, keep pores, keep identity",

  "glow-golden":
    "warm golden glow on the face, healthy luminous skin, soft highlights",

  "cinematic-light":
    "cinematic soft key light and gentle shadows, tasteful contrast, keep identity",

  // expression
  "smile-soft": "subtle soft smile, calm relaxed expression, keep identity",
  "smile-big": "big warm smile, friendly face, keep identity",
  "smile-hollywood": "wide hollywood smile, natural teeth, keep identity",
  laugh: "laughing expression with a bright smile, keep identity",
  neutral: "neutral relaxed face, keep identity",
  serious: "serious focused look, keep identity",
  "eyes-bigger": "slightly more open attentive eyes, keep identity",
  "eyes-brighter": "brighter expressive gaze, keep identity",
  "surprised-wow": "wow surprised expression, keep identity"
};

// ───────── GREETINGS ─────────
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year portrait, cozy winter atmosphere, colorful lights and bokeh, elegant handwritten English text 'Happy New Year'",
  birthday:
    "birthday celebration portrait, balloons and confetti, party lights, elegant handwritten English text 'Happy Birthday'",
  funny:
    "playful fun portrait, bright colors, comic vibe, bold handwritten English text 'You look amazing!'",
  scary:
    "spooky Halloween portrait, cold dramatic lighting, fog, handwritten English text 'Happy Halloween'"
};

// ───────── IDENTITY / CLEANUP / SAFETY ─────────
const IDENTITY_PROMPT =
  "Edit the input photo of the SAME person. The result must be clearly recognizable as the same person. " +
  "Do NOT replace the face with another person. Keep the same gender. Keep key facial features consistent.";

const CONSISTENCY_TAIL =
  "Keep hairstyle direction, clothing, and background feeling consistent. " +
  "Do NOT add eyeglasses if they are not present in the original. Do NOT make the person older than in the input.";

const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot with UI panels/buttons/text, remove and repaint all UI elements and generate only a clean portrait background.";

const SAFETY_TAIL =
  "portrait from shoulders up, single person, fully clothed, no nudity, no extra people, no distorted anatomy";

// Skin effects that should trigger PASS #2
const SKIN_KEYS = new Set([
  "no-wrinkles",
  "younger",
  "smooth-skin",
  "beauty-one-touch"
]);

function pickImageUrl(output) {
  if (!output) return null;

  if (typeof output === "string") return output;

  if (Array.isArray(output)) return output[0];

  if (output?.output) {
    if (typeof output.output === "string") return output.output;
    if (Array.isArray(output.output)) return output.output[0];
  }

  if (output?.url) {
    try {
      return output.url();
    } catch {
      return null;
    }
  }

  return null;
}

function buildPass2RetouchPrompt(skinKey) {
  // PASS #2 — делаем ретушь отдельно, очень явно
  if (skinKey === "no-wrinkles") {
    return (
      "HIGH-END BEAUTY RETOUCH: remove wrinkles and deep lines clearly, smooth under-eye area, soften nasolabial folds, " +
      "reduce forehead lines, fresher skin. Keep pores lightly visible. Keep identity. Do not change face shape."
    );
  }
  if (skinKey === "younger") {
    return (
      "AGE REGRESSION RETOUCH: make the same person look noticeably younger by 15–25 years while keeping identity. " +
      "reduce sagging, reduce wrinkles strongly, fresher cheeks, cleaner neck area. Keep natural realism."
    );
  }
  if (skinKey === "smooth-skin" || skinKey === "beauty-one-touch") {
    return (
      "BEAUTY RETOUCH: smooth skin, remove blemishes, reduce fine lines, keep pores and realistic texture, keep identity."
    );
  }
  return null;
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

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;
    const userPrompt = (text || "").trim();

    const effectsArr = Array.isArray(effects) ? effects : [];
    const skinKey = effectsArr.find((k) => SKIN_KEYS.has(k)) || null;

    const effectsPrompt = effectsArr
      .map((key) => EFFECT_PROMPTS[key])
      .filter(Boolean)
      .join(". ");

    const greetingPrompt = greeting && GREETING_PROMPTS[greeting] ? GREETING_PROMPTS[greeting] : "";

    // PASS #1
    const prompt1 = [
      stylePrefix,
      effectsPrompt,
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      CONSISTENCY_TAIL,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ]
      .filter(Boolean)
      .join(". ")
      .trim();

    const out1 = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt: prompt1,
        input_image: photo,
        output_format: "jpg",
        aspect_ratio: "match_input_image"
      }
    });

    const url1 = pickImageUrl(out1);
    if (!url1) {
      return res.status(500).json({ error: "No image URL returned (pass #1)", raw: out1 });
    }

    // Если выбраны поздравления (текст на картинке), PASS #2 может испортить текст.
    // Поэтому: при greeting — возвращаем pass1.
    if (greeting) {
      return res.status(200).json({ ok: true, image: url1, prompt: prompt1, note: "Greeting enabled: skipping pass #2 retouch." });
    }

    // PASS #2 (ретушь морщин/омоложение) — только если выбран skin-эффект
    const pass2Core = skinKey ? buildPass2RetouchPrompt(skinKey) : null;
    if (!pass2Core) {
      return res.status(200).json({ ok: true, image: url1, prompt: prompt1 });
    }

    const prompt2 = [
      pass2Core,
      IDENTITY_PROMPT,
      CONSISTENCY_TAIL,
      SAFETY_TAIL
    ]
      .filter(Boolean)
      .join(". ")
      .trim();

    const out2 = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt: prompt2,
        input_image: url1,
        output_format: "jpg",
        aspect_ratio: "match_input_image"
      }
    });

    const url2 = pickImageUrl(out2);
    const finalUrl = url2 || url1;

    return res.status(200).json({
      ok: true,
      image: finalUrl,
      prompt: prompt1
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}