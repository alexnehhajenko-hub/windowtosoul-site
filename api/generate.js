// api/generate.js — YourPhotoAI
// Генерация портрета через Replicate (FLUX-Kontext-Pro)
// Фото / текст / эффекты кожи / мимика / поздравления
// Важно: всегда редактируем КОНКРЕТНО загруженное фото, не рисуем случайных людей.

import Replicate from "replicate";

// Стили, включая beauty, который ждёт фронт
const STYLE_PREFIX = {
  beauty:
    "edit this exact input photo into a slightly more polished portrait, soft flattering studio-like lighting, natural colors, very gentle beauty retouch only, keep the same person, same gender, same facial structure and approximate age, facial features must stay almost identical (only light and skin polishing)",

  oil: "edit this input photo into an oil painting version of the same person, visible brush strokes and canvas texture, same facial features and gender",

  anime: "edit this input photo into an anime-style version of the same person, preserve key face shape, hairstyle and expression, same gender and identity",

  poster:
    "edit this input photo into a cinematic movie poster look of the same person, more dramatic lighting and a bit more contrast, KEEP the same person, same gender and same facial features, do NOT change the face type, only lighting, color grading and background",

  classic:
    "edit this input photo into a classic portrait painting of the same person, warm tones, detailed skin, subtle vignette background, same identity, same gender, same face proportions",

  default:
    "edit this input photo into a clean high-quality portrait of the same person, soft studio-like lighting, natural color balance"
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "slightly soften and reduce visible facial wrinkles, especially on the forehead and around the eyes, realistic skin texture (not plastic), absolutely keep the same person and gender",

  younger:
    "make the person look a bit more rested and slightly younger, subtly reduce signs of tiredness and age, same age group, same identity and gender",

  "smooth-skin":
    "smooth and even out the skin tone a little, hide small blemishes while keeping pores visible, do not over-retouch, keep the same person and gender",

  "glow-golden":
    "add a soft golden glow to the skin, slightly warmer highlights and gentle radiance, keep the same face structure and gender",

  "cinematic-light":
    "add soft cinematic lighting with gentle contrast, more depth and subtle shadows on the face, same person and same gender",

  // мимика
  "smile-soft":
    "slightly change expression to a soft gentle smile, corners of the mouth a bit lifted, relaxed and friendly eyes, same person, same facial proportions and same gender",

  "smile-big":
    "change expression to a clear big smile, possibly showing some teeth, very happy but still natural, keep the same person and gender, do not change the face type",

  "smile-hollywood":
    "change expression to a wide hollywood smile with visible white teeth, confident and charismatic look, keep the same person as in the input image, keep the same face structure, same gender and same approximate age, do not feminize or masculinize the person compared to the original, do not significantly change jawline, nose shape or eye shape, do not replace the person with a different model-looking face",

  laugh:
    "change expression to laughing with a bright smile, very joyful and natural expression, keep the same person and facial proportions",

  neutral:
    "neutral relaxed expression, no strong visible emotion, keep the same person and facial structure",

  serious:
    "serious focused expression, no smile, keep the same identity and gender",

  "eyes-bigger":
    "make the eyes just slightly more open and bigger, more attentive and awake look, keep realistic proportions and do not change identity or gender",

  "eyes-brighter":
    "brighter, more vivid eyes, slightly more contrast and clarity in the eyes, keep the same eye color and shape"
};

// Поздравления — только атмосфера, без текста на изображении
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year portrait of the same person, glowing warm lights, soft snow, cozy winter atmosphere, no visible text, no logos, clean background",

  birthday:
    "birthday themed portrait of the same person, balloons, confetti, festive colorful composition, joyful mood, no visible text, no logos, clean background",

  funny:
    "playful humorous portrait of the same person, bright vivid colors, fun dynamic composition, cheerful mood, no visible text, no logos, clean background",

  scary:
    "dark horror themed portrait of the same person, spooky lighting, eerie atmosphere, mysterious background, no visible text, no logos, clean background"
};

// Базовое правило: сохранить личность, пол и убрать всё «лишнее»
const NO_TEXT_BASE_PROMPT = [
  "edit THIS input photo only (image-to-image editing, not text-to-image)",
  "final image must clearly show the SAME person from the input",
  "keep the same gender, same basic age group and same identity",
  "keep the same head shape and main facial features",
  "do not turn the person into a different model or celebrity",
  "do not change the perceived gender of the person",
  "remove any text, numbers, watermarks, logos or UI elements from the image",
  "no phone interface, no status bar, no timestamps, no notification icons",
  "no captions, no writing, no symbols, no emojis on the image",
  "simple clean background without distracting elements"
].join(", ");

const NEGATIVE_TEXT_PROMPT =
  "text, numbers, letters, subtitles, captions, watermark, logo, stickers, emojis, UI elements, phone interface, time, battery icon, notification icons, status bar, on-screen controls, overlays";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let body = req.body;

    // На всякий случай, если Vercel отдаст строку
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { style, text, photo, effects, greeting } = body || {};

    // Без фото — генерацию запрещаем: иначе модель рисует случайных людей
    if (!photo) {
      return res
        .status(400)
        .json({ error: "Photo is required for portrait editing" });
    }

    // 1. Стиль
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // 2. Пользовательский текст (пока не используется, но оставляем)
    const userPrompt = (text || "").trim();

    // 3. Эффекты (кожа + мимика)
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // 4. Атмосфера поздравления (без текста)
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // 5. Итоговый prompt (остаётся только на сервере)
    const promptParts = [stylePrefix, NO_TEXT_BASE_PROMPT];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const prompt = promptParts.join(". ").trim();

    console.log("GENERATE PROMPT:", prompt);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    // Вход для Replicate: ОБЯЗАТЕЛЬНО используем input_image
    const input = {
      prompt,
      negative_prompt: NEGATIVE_TEXT_PROMPT,
      output_format: "jpg",
      input_image: photo
    };

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      { input }
    );

    // Поиск URL картинки
    let imageUrl = null;

    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (output && typeof output === "object") {
      if (Array.isArray(output.output)) {
        imageUrl = output.output[0];
      } else if (typeof output.output === "string") {
        imageUrl = output.output;
      } else if (typeof output.url === "string") {
        imageUrl = output.url;
      }
    } else if (typeof output === "string") {
      imageUrl = output;
    }

    if (!imageUrl) {
      console.error("No image URL returned from Replicate:", output);
      return res.status(500).json({
        error: "No image URL returned"
      });
    }

    // prompt на фронт не отдаём
    return res.status(200).json({
      ok: true,
      image: imageUrl
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}