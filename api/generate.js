// api/generate.js
// V2 pipeline (Replicate):
// - ALL styles + edits -> FLUX-2-Pro
// - Async prediction + polling (prevents long request hangs/timeouts)
// Goal: iPhone/Photoshop-like retouch WITHOUT swapping identity.

const MODEL_FLUX2_PRO = "black-forest-labs/flux-2-pro";

// ───────────── STYLES ─────────────
const STYLE_PREFIX = {
  beauty:
    "high-quality realistic photo retouch, keep the same person, keep the same background and clothes, natural colors, realistic texture, do not change identity",
  oil: "oil painting portrait, detailed brush strokes, artistic, rich colors, keep the same people and recognizable faces",
  anime: "anime style portrait, clean line art, soft shading, keep the same people and recognizable faces",
  poster: "cinematic movie poster portrait, dramatic lighting, high contrast, keep the same people and recognizable faces",
  classic: "classical old master portrait, realism, warm tones, keep the same people and recognizable faces",
  default:
    "realistic photo edit, detailed face, soft studio lighting, natural colors, keep the same people and recognizable faces"
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
  // Hollywood Pro — stronger but identity-safe
  "hollywood-pro":
    "HOLLYWOOD PRO RETOUCH: remove deep wrinkles and fine lines STRONGLY (forehead, under eyes, crow's feet, nasolabial folds). " +
    "smooth skin to an even premium beauty look, but keep realistic pores and natural texture (NO plastic). " +
    "remove redness, blotches, spots. improve clarity and micro-contrast. " +
    "DO NOT change facial structure, proportions, age, weight, jawline, cheekbones. " +
    "keep the same eyes, eyelids, eyebrows, eyelashes, nose, lips, teeth, hair, glasses. " +
    "NO FACE SWAP.",

  "no-wrinkles":
    "remove wrinkles and fine lines strongly, keep realistic texture, do not change identity",
  younger:
    "make the same person look fresher about 5–10 years, but keep exact identity and facial structure",
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
    "add a gentle festive New Year atmosphere. keep the people identical. subtle bokeh lights. add small elegant handwritten English text 'Happy New Year' (small, not covering faces)",
  birthday:
    "add a gentle birthday atmosphere. keep the people identical. subtle balloons/confetti in background. add small elegant handwritten English text 'Happy Birthday' (small, not covering faces)",
  funny:
    "add a gentle playful atmosphere. keep the people identical. add small handwritten English text 'You look amazing!' (small, not covering faces)",
  scary:
    "add a gentle spooky atmosphere (no gore). keep the people identical. subtle fog/background. add small handwritten English text 'Happy Halloween' (small, not covering faces)"
};

// ───────── IDENTITY (VERY STRONG, multi-person safe) ─────────
const IDENTITY_PROMPT =
  "IDENTITY LOCK (VERY IMPORTANT): edit the input photo of the SAME PEOPLE. " +
  "The result must be clearly recognizable as the same people. " +
  "Do NOT replace faces. Do NOT merge faces. Do NOT change who is who. " +
  "Keep each person's facial structure: head shape, eye shape, eyelids, nose, lips, jawline, cheekbones, ears. " +
  "Keep hairstyle, hairline, hair color, eyebrows, glasses consistent. " +
  "Keep the same camera angle, perspective, and composition. Do NOT crop or zoom. " +
  "If there are multiple people, preserve ALL faces and their identities.";

// Helps stop “wrinkles coming back” when user stylizes after retouch
const KEEP_RETOUCH_TAIL =
  "IMPORTANT: if skin/retouch effect is requested, DO NOT re-introduce wrinkles or aging during stylization. " +
  "Keep the same smooth, retouched skin as in the input, while applying the selected style.";

// ───────── UI SCREENSHOT CLEANUP ─────────
const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot (buttons, panels, UI text), remove and repaint interface elements and restore a natural background while keeping all people identical.";

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
  return keys
    .map((k) => EFFECT_PROMPTS[k])
    .filter(Boolean)
    .join(". ");
}

async function createOfficialPrediction(model, input, cancelAfter = "4m") {
  const r = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      // Cancel runaway jobs on Replicate side (deadline).  [oai_citation:1‡Replicate](https://replicate.com/docs/topics/predictions/create-a-prediction)
      "Cancel-After": cancelAfter
    },
    body: JSON.stringify({ input })
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const details = j?.detail || j?.error || JSON.stringify(j);
    throw new Error(`Replicate create failed (${r.status}): ${details}`);
  }
  return j;
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

    const styleKey = style || "beauty";
    const stylePrefix = STYLE_PREFIX[styleKey] || STYLE_PREFIX.default;
    const userPrompt = (text || "").trim();

    const effectsArr = Array.isArray(effects) ? effects : [];
    const skinEffects = effectsArr.filter((k) => SKIN_KEYS.has(k));
    const otherEffects = effectsArr.filter((k) => !SKIN_KEYS.has(k));

    const greetingPrompt =
      greeting && GREETING_PROMPTS[greeting] ? GREETING_PROMPTS[greeting] : "";

    const skinKey = skinEffects[0] || null;
    const skinPrompt = skinKey ? EFFECT_PROMPTS[skinKey] || "" : "";

    const promptParts = [
      stylePrefix,
      buildEffectsPrompt(otherEffects),

      // For beauty: keep minimal edit vibe.
      // For other styles: allow style, but force "keep retouch" if skin requested.
      skinPrompt
        ? styleKey === "beauty"
          ? `MINIMAL RETOUCH ONLY: change only skin/retouch. ${skinPrompt}`
          : `Apply the requested skin/retouch to faces while keeping the selected style. ${skinPrompt}`
        : "",

      skinPrompt && styleKey !== "beauty" ? KEEP_RETOUCH_TAIL : "",

      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const finalPrompt = promptParts.join(". ").trim();

    // Build input payload (keep it minimal/robust).
    const modelInput = {
      prompt: finalPrompt,

      // FLUX 2 Pro supports reference images; we pass one.
      // (Your previous calls with input_images worked.)
      input_images: [photo],

      aspect_ratio: "match_input_image",
      output_format: "jpg"
    };

    // Async prediction (returns fast; frontend polls).  [oai_citation:2‡Replicate](https://replicate.com/docs/topics/predictions/create-a-prediction)
    const pred = await createOfficialPrediction(MODEL_FLUX2_PRO, modelInput, "4m");

    const immediateImage = pickImageUrl(pred?.output);

    return res.status(200).json({
      ok: true,
      prediction: pred?.id,
      status: pred?.status || "starting",
      web: pred?.urls?.web || null,
      image: immediateImage || null
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}