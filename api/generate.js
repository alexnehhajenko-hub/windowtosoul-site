// api/generate.js
// V2 pipeline (Replicate):
// - ALL styles + edits -> FLUX-2-Pro
// - HOLLYWOOD PRO uses 2-pass "zoom face -> retouch -> return to original" via multi-reference
// Goal: iPhone/Photoshop-like retouch WITHOUT identity drift.

import Replicate from "replicate";

// ───────────── MODELS ─────────────
const MODEL_FLUX2_PRO = "black-forest-labs/flux-2-pro";

// ───────────── STYLES ─────────────
const STYLE_PREFIX = {
  beauty:
    "High-quality realistic photo retouch. Premium iPhone portrait quality. Natural colors. Sharp details. Natural skin texture with pores.",
  oil: "Oil painting portrait. Detailed brushwork. Soft warm light. Artistic look. Preserve recognizable facial likeness.",
  anime:
    "Anime style portrait. Clean line art. Soft shading. Preserve recognizable facial likeness.",
  poster:
    "Cinematic movie poster portrait. Dramatic lighting. High contrast. Preserve recognizable facial likeness.",
  classic:
    "Classical old master portrait. Realism. Warm tones. Preserve recognizable facial likeness.",
  default:
    "Realistic photo edit. Soft studio lighting. Natural colors. Preserve recognizable facial likeness."
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
  // Hollywood Pro (strong retouch, identity-safe via 2-pass)
  "hollywood-pro":
    "Hollywood Pro beauty retouch. Remove deep forehead lines, under-eye creases, crow's feet, and nasolabial folds. " +
    "Even out skin tone and texture. Reduce redness, blotches, and spots. " +
    "Keep sharp eyes, eyelashes, eyebrows, lips, hair, and glasses details. " +
    "Natural realistic pores, premium editorial finish, no over-blur.",

  "no-wrinkles":
    "Strong wrinkle reduction. Smooth fine lines while keeping natural texture and pores. Premium retouch finish.",
  younger:
    "Make the same person look fresher and slightly younger (about 5–10 years) by improving skin quality and reducing sagging subtly while keeping the same facial structure.",
  "smooth-skin":
    "Smooth and even skin tone. Reduce blemishes and redness. Keep realistic texture and pores.",
  "beauty-one-touch":
    "Natural beauty retouch. Clean skin, remove small blemishes, soften fine lines, preserve natural texture.",
  "glow-golden":
    "Warm golden glow. Healthy skin highlights. Gentle soft light.",
  "cinematic-light":
    "Cinematic soft key light. Gentle shadows. Better contrast and clarity.",

  // expression
  "smile-soft": "Subtle soft smile. Calm relaxed expression. Preserve identity.",
  "smile-big": "Big warm smile. Friendly expression. Preserve identity.",
  "smile-hollywood": "Wide hollywood smile. Natural teeth. Preserve identity.",
  laugh: "Natural laugh expression. Preserve identity.",
  neutral: "Neutral relaxed expression. Preserve identity.",
  serious: "Serious focused expression. Preserve identity.",
  "eyes-bigger": "Slightly more open attentive eyes. Preserve identity.",
  "eyes-brighter": "Brighter expressive gaze. Preserve identity.",
  "surprised-wow": "Surprised wow expression. Preserve identity."
};

// ───────── GREETINGS ─────────
const GREETING_PROMPTS = {
  "new-year":
    "Add a gentle festive New Year atmosphere. Subtle bokeh lights. Small elegant handwritten English text 'Happy New Year' placed away from the face.",
  birthday:
    "Add a gentle birthday atmosphere. Subtle balloons/confetti in background. Small elegant handwritten English text 'Happy Birthday' placed away from the face.",
  funny:
    "Add a gentle playful atmosphere. Small handwritten English text 'You look amazing!' placed away from the face.",
  scary:
    "Add a gentle spooky atmosphere (no gore). Subtle fog/background. Small handwritten English text 'Happy Halloween' placed away from the face."
};

// ───────── IDENTITY (POSITIVE, NO NEGATIVE PROMPTS) ─────────
const IDENTITY_PROMPT =
  "Preserve the exact identity of the person from the reference image. " +
  "Match facial structure, head shape, eyes, nose, lips, jawline, cheekbones. " +
  "Match hairstyle, hairline, hair color, eyebrows, and glasses. " +
  "Match the same camera angle and the same framing as the reference image.";

// ───────── UI SCREENSHOT CLEANUP (POSITIVE) ─────────
const UI_CLEANUP_TAIL =
  "If the reference image contains app or website UI elements, recreate the scene as a clean natural photo background while preserving the same person, pose, clothing, and framing.";

// ───────── QUALITY / SAFETY ─────────
const QUALITY_TAIL =
  "High detail. Sharp focus. Natural skin texture. Clean edges. Realistic anatomy. Fully clothed.";

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

// Robust FLUX-2-Pro call (supports multi-reference images)
async function runFlux2Pro(replicate, images, prompt) {
  const arr = Array.isArray(images) ? images.filter(Boolean) : [images].filter(Boolean);
  if (!arr.length) throw new Error("No reference images provided");

  const tries = [
    {
      input: {
        prompt,
        input_images: arr,
        output_format: "jpg",
        aspect_ratio: "match_input_image"
      }
    },
    {
      input: {
        prompt,
        input_images: arr
      }
    },
    // fallback for single-image variants (just in case)
    ...(arr.length === 1
      ? [
          {
            input: {
              prompt,
              input_image: arr[0],
              output_format: "jpg",
              aspect_ratio: "match_input_image"
            }
          },
          { input: { prompt, input_image: arr[0] } },
          { input: { prompt, image: arr[0] } }
        ]
      : [])
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

function jsonPrompt(obj) {
  return JSON.stringify(obj);
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
    if (!photo) {
      return res.status(400).json({ error: "Missing photo" });
    }

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

    // ───────── HOLLYWOOD PRO: 2-pass zoom workflow ─────────
    if (styleKey === "beauty" && skinKey === "hollywood-pro") {
      // PASS A: close-up face retouch (forces model to really "see" wrinkles)
      const closeup = jsonPrompt({
        scene: "A tight close-up headshot crop of the face from reference image 1",
        subjects: ["The exact same person as reference image 1 with the same facial likeness"],
        style: "Photorealistic premium beauty retouch, iPhone portrait quality",
        edits: skinPrompt,
        lighting: "Match the original lighting, slightly improved clarity",
        camera: "Very close distance, face fills the frame",
        output: "Close-up face crop"
      });

      const closeupUrl = await runFlux2Pro(replicate, [photo], closeup);

      // PASS B: return to original framing, use close-up as identity/skin detail anchor
      const final = jsonPrompt({
        scene: "Same full scene and framing as reference image 1",
        subjects: [
          "The same person as reference image 1, facial likeness guided by reference image 2"
        ],
        style: "Photorealistic premium iPhone portrait retouch, Photoshop-quality beauty edit",
        edits:
          "Apply the skin and wrinkle retouch quality from reference image 2 onto the face in reference image 1 while keeping the same full composition",
        lighting: "Match reference image 1, slightly improved clarity and micro-contrast",
        camera: "Match reference image 1 angle and distance",
        notes:
          "Preserve the same hair, glasses, clothing, background, and overall composition as reference image 1"
      });

      const finalUrl = await runFlux2Pro(replicate, [photo, closeupUrl], final);
      return res.status(200).json({ ok: true, image: finalUrl });
    }

    // ───────── Non-beauty styles: add an identity anchor close-up to reduce face drift ─────────
    // (oil/anime/poster/classic) often changes face; anchor helps keep likeness.
    let referenceImages = [photo];

    if (styleKey !== "beauty") {
      const anchor = jsonPrompt({
        scene: "A tight close-up headshot crop from reference image 1",
        subjects: ["The exact same person as reference image 1 with the same facial likeness"],
        style: "Photorealistic neutral identity anchor (no stylization)",
        edits: "Enhance clarity slightly while preserving exact facial likeness",
        lighting: "Neutral natural light",
        camera: "Close distance, face fills the frame",
        output: "Close-up identity anchor"
      });

      const anchorUrl = await runFlux2Pro(replicate, [photo], anchor);
      referenceImages = [photo, anchorUrl];
    }

    // ───────── Single-pass default for everything else ─────────
    const promptParts = [
      stylePrefix,
      buildEffectsPrompt(otherEffects),
      skinPrompt ? `Skin retouch: ${skinPrompt}` : "",
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      styleKey !== "beauty"
        ? "Use reference image 1 for full composition. Use reference image 2 to preserve facial likeness and identity."
        : "",
      UI_CLEANUP_TAIL,
      QUALITY_TAIL
    ].filter(Boolean);

    const finalPrompt = promptParts.join(". ").trim();

    const url = await runFlux2Pro(replicate, referenceImages, finalPrompt);
    return res.status(200).json({ ok: true, image: url });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}