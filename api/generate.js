// api/generate.js
// V2 pipeline (Replicate):
// - Styles -> FLUX-2-Pro
// - Hollywood Pro (button / strong retouch) -> Qwen Upscale + Qwen Skin (identity-safe edit)
// Goal: iPhone/Photoshop-like retouch WITHOUT swapping identity.

import Replicate from "replicate";

// ───────────── MODELS ─────────────
const MODEL_FLUX2_PRO = "black-forest-labs/flux-2-pro";
const MODEL_QWEN_UPSCALE = "qwen-edit-apps/qwen-image-edit-plus-lora-upscale";
const MODEL_QWEN_SKIN = "qwen-edit-apps/qwen-image-edit-plus-lora-skin";

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
  "no-wrinkles",
  "younger",
  "smooth-skin",
  "glow-golden",
  "cinematic-light",
  "beauty-one-touch"
]);

const EFFECT_PROMPTS = {
  // Hollywood Pro — максимально убрать морщины, но НЕ менять лицо
  "hollywood-pro":
    "HOLLYWOOD PRO RETOUCH: remove deep wrinkles and fine lines VERY strongly (forehead, under eyes, crow's feet, nasolabial folds). " +
    "even out skin tone, remove redness/blotches/spots, keep eyelashes/eyebrows/lips/hair/glasses details sharp. " +
    "NO FACE SWAP. Do NOT change facial structure. Do NOT change head shape. Do NOT change age drastically. " +
    "ONLY improve skin texture and tone, keep the same person.",

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

// ───────── GREETINGS ─────────
const GREETING_PROMPTS = {
  "new-year":
    "add a gentle festive New Year atmosphere. keep the person identical. subtle bokeh lights. add small elegant handwritten English text 'Happy New Year' (small, not covering the face)",
  birthday:
    "add a gentle birthday atmosphere. keep the person identical. subtle balloons/confetti in background. add small elegant handwritten English text 'Happy Birthday' (small, not covering the face)",
  funny:
    "add a gentle playful atmosphere. keep the person identical. add small handwritten English text 'You look amazing!' (small, not covering the face)",
  scary:
    "add a gentle spooky atmosphere (no gore). keep the person identical. subtle fog/background. add small handwritten English text 'Happy Halloween' (small, not covering the face)"
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

// Robust FLUX-2-Pro call (models differ in image input naming)
async function runFlux2Pro(replicate, image, prompt) {
  const tries = [
    { input: { prompt, input_images: [image], output_format: "jpg", aspect_ratio: "match_input_image" } },
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

// Qwen edit call (Upscale / Skin)
async function runQwenEdit(replicate, model, image, prompt, opts = {}) {
  const out = await replicate.run(model, {
    input: {
      image,
      prompt,
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      output_quality: 95,

      // quality mode (40 steps) — set go_fast=false for maximum fidelity
      go_fast: false,
      num_inference_steps: opts.num_inference_steps ?? 40,

      // LoRA strength + guidance (stronger retouch without re-drawing)
      lora_scale: opts.lora_scale,
      true_guidance_scale: opts.true_guidance_scale,

      // keep safety checker enabled
      disable_safety_checker: false
    }
  });
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

    // ───────── SPECIAL: HOLLYWOOD PRO = “Photoshop workflow” (Upscale -> Skin) ─────────
    // We do this when hollywood-pro selected (especially via the separate button).
    if (skinKey === "hollywood-pro") {
      // 1) Upscale/Enhance (lets the editor see micro-wrinkles better)
      const upscalePrompt = [
        "ENHANCE ONLY: increase detail clarity and micro-texture, keep the same person identical",
        "do not change face shape, do not change eyes/nose/lips, do not change hair or background",
        IDENTITY_PROMPT,
        SAFETY_TAIL
      ].join(". ");

      const upUrl = await runQwenEdit(replicate, MODEL_QWEN_UPSCALE, photo, upscalePrompt, {
        num_inference_steps: 40,
        lora_scale: 1.2,
        true_guidance_scale: 1.0
      });

      const baseForSkin = upUrl || photo;

      // 2) Strong Skin retouch (two passes to attack deep wrinkles)
      const skinEditPrompt1 = [
        "MINIMAL EDIT: change ONLY skin texture/tone. keep everything else identical",
        stylePrefix,
        skinPrompt,
        "extra focus: remove deep wrinkles under eyes and nasolabial folds, keep pores natural (no plastic)",
        IDENTITY_PROMPT,
        UI_CLEANUP_TAIL,
        SAFETY_TAIL
      ].filter(Boolean).join(". ");

      const skinUrl1 = await runQwenEdit(replicate, MODEL_QWEN_SKIN, baseForSkin, skinEditPrompt1, {
        num_inference_steps: 40,
        lora_scale: 2.0,
        true_guidance_scale: 1.2
      });

      if (!skinUrl1) {
        // fallback to FLUX if Qwen fails for any reason
        const fluxPromptFallback = [
          stylePrefix,
          "MINIMAL EDIT: change ONLY skin/retouch. " + skinPrompt,
          userPrompt,
          IDENTITY_PROMPT,
          UI_CLEANUP_TAIL,
          SAFETY_TAIL
        ].filter(Boolean).join(". ").trim();

        const urlFallback = await runFlux2Pro(replicate, photo, fluxPromptFallback);
        return res.status(200).json({ ok: true, image: urlFallback });
      }

      // Optional second skin pass: finish remaining deep lines (still minimal)
      const skinEditPrompt2 = [
        "MINIMAL EDIT: keep identity 100%. keep hair, eyes, eyebrows, lips and background identical",
        "final polish: remove remaining deep wrinkles and creases while keeping natural texture",
        IDENTITY_PROMPT,
        SAFETY_TAIL
      ].join(". ");

      const skinUrl2 = await runQwenEdit(replicate, MODEL_QWEN_SKIN, skinUrl1, skinEditPrompt2, {
        num_inference_steps: 40,
        lora_scale: 1.6,
        true_guidance_scale: 1.15
      });

      return res.status(200).json({ ok: true, image: skinUrl2 || skinUrl1 });
    }

    // ───────── Default path: style generation/edit via FLUX-2-Pro ─────────
    const promptParts = [
      stylePrefix,
      buildEffectsPrompt(otherEffects),
      skinPrompt ? ("MINIMAL EDIT: change ONLY skin/retouch. " + skinPrompt) : "",
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
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