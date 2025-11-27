// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления (EN-надписи)

import Replicate from "replicate";

// ───────────── СТИЛИ ─────────────
const STYLE_PREFIX = {
  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, keep original background unless it looks like a screenshot",
  anime:
    "anime style portrait, clean line art, soft pastel shading, big expressive eyes, colorful background, keep the same person",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field, colorful atmosphere, keep the same person",
  classic:
    "classical old master portrait, realism, warm tones, detailed skin, soft vignette, subtle textured background",

  // 🔹 ВИНТАЖ / СТАРОЕ ФОТО
  "old-photo":
    "vintage old photo portrait, slightly faded colors, soft warm tone, subtle film grain, gentle vignette, keep the same person and keep the original background and clothes, do not erase the background",

  // 🔥 ТЁМНЫЙ ДЕМОН
  "dark-demon":
    "dark fantasy horror portrait of the same person, dramatic moody lighting, strong contrast, subtle demonic elements like glowing eyes, dark aura or small horns, highly detailed realistic face, cinematic horror atmosphere. keep the head and shoulders and keep a slightly visible dark background or smoke, not solid pure black, no blood, no gore",

  // по умолчанию — обычный реалистичный портрет
  default:
    "realistic portrait, detailed face, soft studio lighting, natural colors, keep original background if it is not a UI screenshot"
};

// ───────── ЭФФЕКТЫ КОЖИ + МИМИКА ─────────
const EFFECT_PROMPTS = {
  // кожа — «старые»
  "no-wrinkles":
    "same person with slightly reduced visibility of wrinkles, a bit softer skin texture, still natural and realistic",
  younger:
    "same person looking a bit younger and more rested, fresher skin, but clearly the same face and gender",
  "smooth-skin":
    "same person with smoother and more even skin, reduced blemishes, preserved pores, realistic skin texture",

  // кожа — «новые»
  "beauty-one-touch":
    "keep exactly the same person and the same face, only gently smooth the skin, remove acne and small blemishes, reduce fine wrinkles, keep natural pores and realistic skin",
  "glow-golden":
    "same person with warm golden glow on the face, healthy skin, soft highlights",
  "cinematic-light":
    "same person with cinematic soft key light and gentle shadows on the face, better contrast, no change of identity",

  // мимика
  "smile-soft":
    "same person with a subtle soft smile, calm and relaxed expression, no change to face structure",
  "smile-big":
    "same person with a big warm smile, expressive and friendly face",
  "smile-hollywood":
    "same person with a wide hollywood smile, visible teeth but still natural, confident look",
  laugh:
    "same person laughing with a bright smile, joyful and natural expression",
  neutral:
    "same person with neutral face expression, relaxed, no visible strong emotion",
  serious:
    "same person with a serious face, no smile, focused thoughtful expression",
  "eyes-bigger":
    "same person with slightly more open and attentive eyes, keep the same eye shape and identity",
  "eyes-brighter":
    "same person with brighter, more vivid and expressive gaze, no change to facial structure",
  "surprised-wow":
    "same person with a surprised wow expression, eyes a bit wider, eyebrows raised"
};

// ───────── ПОЗДРАВЛЕНИЯ ─────────
const GREETING_PROMPTS = {
  "new-year":
    "festive bright New Year portrait, cozy winter atmosphere, colorful lights and bokeh, fireworks in the distance, vivid contrast, elegant handwritten English text 'Happy New Year' on the image",
  birthday:
    "colorful birthday celebration portrait, balloons and confetti, party lights, bright and happy mood, elegant handwritten English text 'Happy Birthday' on the image",
  funny:
    "playful fun portrait, very bright colors, dynamic neon shapes, comic-style details, bold handwritten English English text like 'You look amazing!' on the image",
  scary:
    "dark spooky horror-style portrait, cold dramatic lighting, subtle fog and scary background details, creepy but readable handwritten English text 'Happy Halloween' on the image"
};

// ───────── ЖЁСТКО ФИКСИРУЕМ ЛИЧНОСТЬ ─────────
const IDENTITY_PROMPT =
  "STRICTLY edit this exact portrait photo of the SAME person from the input image only. " +
  "The final result MUST be clearly recognizable as the same person, at least 80 percent similar to the input face. " +
  "Keep the same gender, age range, face shape and main facial features. " +
  "Do NOT change gender, do NOT turn a man into a woman and do NOT turn a woman into a man. " +
  "Do NOT replace the face with a different model or a different more beautiful person. " +
  "Do NOT change the attractiveness level, only apply the requested style, skin and expression corrections.";

// ───────── ЧИСТИМ СКРИНШОТЫ ОТ ТЕКСТА ─────────
const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot of a website or app (with panels, buttons, menus, or long text below and around the face), completely remove and repaint all interface elements, panels, captions, buttons, watermark logos and prices. " +
  "In that case generate only a clean portrait of the person with a simple background and no UI at all.";

// ───────── БЕЗОПАСНОСТЬ ─────────
const SAFETY_TAIL =
  "portrait from the shoulders up, person is fully clothed, no nudity, no explicit cleavage, no sexual content, no extra people, no distorted anatomy";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Парсим тело запроса (Vercel иногда шлёт строку)
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { style, text, photo, effects, greeting } = body || {};

    // 1) Стиль
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // 2) Пользовательский текст (если есть)
    const userPrompt = (text || "").trim();

    // 3) Эффекты кожи/мимики
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((key) => EFFECT_PROMPTS[key])
        .filter(Boolean)
        .join(". ");
    }

    // 4) Поздравление
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // 5) Итоговый prompt
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

    // 6) Вход в модель Replicate
    const input = {
      prompt,
      output_format: "jpg"
    };

    if (photo) {
      input.input_image = photo;
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      { input }
    );

    // 7) Достаём URL картинки
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