// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Portrait generation: style + skin + expression + greetings

import Replicate from "replicate";

// ───────────── STYLES ─────────────
const STYLE_PREFIX = {
  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, keep original background unless it looks like a screenshot",
  anime:
    "anime style portrait, clean line art, soft pastel shading, big expressive eyes, colorful background, keep the same person",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field, colorful atmosphere, keep the same person",
  classic:
    "classical old master portrait, realism, warm tones, detailed skin, soft vignette, subtle textured background",

  "old-photo":
    "vintage old photo portrait, slightly faded colors, soft warm tone, subtle film grain, gentle vignette, keep the same person and keep the original background and clothes, do not erase the background",

  "dark-demon":
    "dark fantasy horror portrait of the same person, dramatic moody lighting, strong contrast, subtle demonic elements like glowing eyes, dark aura or small horns, highly detailed realistic face, cinematic horror atmosphere. keep the head and shoulders and keep a slightly visible dark background or smoke, not solid pure black, no blood, no gore",

  default:
    "realistic portrait, detailed face, soft studio lighting, natural colors, keep original background if it is not a UI screenshot"
};

// ───────── SKIN + EXPRESSION EFFECTS ─────────
const EFFECT_PROMPTS = {
  // skin
  "no-wrinkles":
    "reduce wrinkles visibly, especially forehead and eye area, smoother skin but still realistic pores and texture, do not change identity",
  younger:
    "make the same person look clearly younger by about 10–15 years, fresher skin and face, keep identity and face structure",
  "smooth-skin":
    "smoother and more even skin, reduced blemishes, preserved pores, realistic skin texture",

  "beauty-one-touch":
    "keep exactly the same person and the same face, gently smooth skin, remove acne and small blemishes, reduce fine wrinkles, keep natural pores, realistic skin",
  "glow-golden":
    "warm golden glow on the face, healthy skin, soft highlights",
  "cinematic-light":
    "cinematic soft key light and gentle shadows on the face, better contrast, no change of identity",

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
    "festive bright New Year portrait, cozy winter atmosphere, colorful lights and bokeh, fireworks in the distance, vivid contrast, elegant handwritten English text 'Happy New Year' on the image",
  birthday:
    "colorful birthday celebration portrait, balloons and confetti, party lights, bright and happy mood, elegant handwritten English text 'Happy Birthday' on the image",
  funny:
    "playful fun portrait, very bright colors, dynamic neon shapes, comic-style details, bold handwritten English text like 'You look amazing!' on the image",
  scary:
    "dark spooky horror-style portrait, cold dramatic lighting, subtle fog and spooky background details, creepy but readable handwritten English text 'Happy Halloween' on the image"
};

// ───────── IDENTITY (NOT TOO STRICT) ─────────
const IDENTITY_PROMPT =
  "Edit the input photo of the SAME person. " +
  "The result must be clearly recognizable as the same person. " +
  "Do NOT replace the face with another person/model. " +
  "Keep the same gender and the same general ethnicity. " +
  "Face shape and key features must remain consistent. " +
  "If the user selected 'younger' or 'no-wrinkles', you ARE allowed to make the person look younger (up to about 10–15 years) and reduce wrinkles, while keeping identity. " +
  "If the user selected a smile/expression effect, you ARE allowed to change facial expression while keeping identity.";

// ───────── REMOVE UI FROM SCREENSHOTS ─────────
const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot of a website or app (with panels, buttons, menus, or long text below and around the face), remove and repaint all interface elements and text. " +
  "In that case generate only a clean portrait of the person with a simple background and no UI.";

// ───────── SAFETY ─────────
const SAFETY_TAIL =
  "portrait from the shoulders up, person is fully clothed, no nudity, no sexual content, no extra people, no distorted anatomy";

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

    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;
    const userPrompt = (text || "").trim();

    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((key) => EFFECT_PROMPTS[key])
        .filter(Boolean)
        .join(". ");
    }

    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    const promptParts = [
      stylePrefix,
      effectsPrompt,
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const prompt = promptParts.join(". ").trim();

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({
        error: "Missing REPLICATE_API_TOKEN in environment variables"
      });
    }

    const input = {
      prompt,
      output_format: "jpg"
    };

    if (photo) input.input_image = photo;

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input
    });

    let imageUrl = null;

    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (output?.output) {
      if (Array.isArray(output.output)) imageUrl = output.output[0];
      else if (typeof output.output === "string") imageUrl = output.output;
    } else if (typeof output === "string") {
      imageUrl = output;
    } else if (output?.url) {
      try {
        imageUrl = output.url();
      } catch {
        // ignore
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: "No image URL returned",
        raw: output
      });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl,
      prompt
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}