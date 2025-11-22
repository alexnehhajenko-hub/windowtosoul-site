// api/generate.js
//
// YourPhotoAI — генерация портрета через Replicate (стабильная версия)
// Работает с моделями FLUX / похожими image-to-image.
//
// Тело запроса с фронта:
// { style, text, photo, effects, greeting, language }
//
// Возвращает: { image: "https://..." }

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY,
});

// Модель можно переопределить через переменную окружения REPLICATE_MODEL_ID.
// Если её нет — используем flux-dev (как «старую» базовую).
const MODEL_ID =
  process.env.REPLICATE_MODEL_ID || "black-forest-labs/flux-dev";

// --- Конструкторы промптов ---

const STYLE_PROMPTS = {
  beauty:
    "high-end beauty portrait, realistic photography, soft studio light, shallow depth of field, natural skin texture",
  oil:
    "oil painting portrait, visible brush strokes, rich painterly texture, vibrant but natural colors",
  anime:
    "anime portrait, clean line art, soft shading, expressive eyes, high quality illustration",
  poster:
    "cinematic movie poster portrait, dramatic lighting, sharp details, high contrast",
  classic:
    "classic studio portrait, neutral background, soft but clear lighting, timeless photography",
};

function buildGreetingPrompt(greeting, lang) {
  if (!greeting) return "";

  const l = lang === "ru" ? "ru" : "en";

  const map = {
    "new-year": {
      ru: "новогодняя атмосфера, огоньки, ёлка, мягкий праздничный фон",
      en: "New Year atmosphere, warm lights, Christmas tree, soft festive background",
    },
    birthday: {
      ru: "атмосфера дня рождения, шарики или конфетти, праздничные цвета",
      en: "birthday mood, balloons or confetti, festive colors",
    },
    funny: {
      ru: "весёлое настроение, чуть более яркие и игривые цвета",
      en: "funny playful mood, slightly brighter and vivid colors",
    },
    scary: {
      ru: "слегка мрачная мистическая атмосфера, кинематографичный хоррор-свет",
      en: "slightly dark mystical atmosphere, cinematic horror lighting",
    },
  };

  const obj = map[greeting];
  return obj ? obj[l] : "";
}

function buildEffectsPrompt(effects = [], lang) {
  const l = lang === "ru" ? "ru" : "en";
  const parts = [];

  const hasYounger =
    effects.includes("younger") || effects.includes("no-wrinkles");
  const hasSmooth =
    effects.includes("smooth-skin") || effects.includes("glow-golden");
  const hasCinematic = effects.includes("cinematic-light");

  const smileKeys = [
    "smile-soft",
    "smile-big",
    "smile-hollywood",
    "laugh",
    "surprised-wow",
  ];
  const hasSmile = effects.some((e) => smileKeys.includes(e));
  const neutral = effects.includes("neutral");
  const serious = effects.includes("serious");

  if (hasYounger) {
    parts.push(
      l === "en"
        ? "the person looks 5–15 years younger but still clearly the same person"
        : "человек выглядит на 5–15 лет моложе, но это очевидно тот же человек"
    );
  }

  if (hasSmooth) {
    parts.push(
      l === "en"
        ? "smoother healthier skin, reduced wrinkles, fresher and more rested look"
        : "более гладкая и здоровая кожа, меньше морщин, более свежий и отдохнувший вид"
    );
  }

  if (hasCinematic) {
    parts.push(
      l === "en"
        ? "cinematic soft lighting on the face"
        : "кинематографичный мягкий свет на лице"
    );
  }

  if (hasSmile) {
    parts.push(
      l === "en"
        ? "natural friendly smile"
        : "естественная дружелюбная улыбка"
    );
  } else if (neutral) {
    parts.push(
      l === "en" ? "neutral calm expression" : "нейтральное спокойное выражение"
    );
  } else if (serious) {
    parts.push(
      l === "en"
        ? "serious confident expression"
        : "серьёзное уверенное выражение лица"
    );
  }

  return parts.join(", ");
}

function buildPrompt({ style, effects, greeting, language, extraText }) {
  const lang = language === "ru" ? "ru" : "en";

  const baseStyle =
    STYLE_PROMPTS[style || "beauty"] || STYLE_PROMPTS.beauty;

  const identityPart =
    lang === "en"
      ? "portrait of the same person from the input photo, same face shape, same eyes, nose and mouth, clearly recognizable"
      : "портрет того же человека с исходного фото, та же форма лица, те же глаза, нос и рот, легко узнаваем";

  const effectsPart = buildEffectsPrompt(effects, lang);
  const greetingPart = buildGreetingPrompt(greeting, lang);

  const parts = [baseStyle, identityPart];

  if (effectsPart) parts.push(effectsPart);
  if (greetingPart) parts.push(greetingPart);
  if (extraText) parts.push(extraText);

  // Чтобы не было кривых надписей/логотипов:
  parts.push(
    "no text, no logos, no watermarks, no UI, no instagram layout, plain clean image"
  );

  return parts.join(", ");
}

function computeStrength({ effects = [], style, greeting }) {
  const hasYounger =
    effects.includes("younger") || effects.includes("no-wrinkles");

  if (hasYounger) return 0.55;

  if (style === "oil" || style === "anime" || style === "poster") return 0.45;

  if (greeting === "scary") return 0.45;

  return 0.38;
}

// --- HTTP-обработчик ---

export default async function handler(req, res) {
  // CORS
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGINS || "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const {
      style,
      text,
      photo,
      effects,
      greeting,
      language,
    } = req.body || {};

    if (!photo) {
      return res.status(400).json({ error: "photo is required" });
    }

    const safeEffects = Array.isArray(effects) ? effects : [];
    const prompt = buildPrompt({
      style,
      effects: safeEffects,
      greeting,
      language,
      extraText: text,
    });

    const strength = computeStrength({
      effects: safeEffects,
      style,
      greeting,
    });

    const output = await replicate.run(MODEL_ID, {
      input: {
        prompt,
        image: photo,
        strength,
        guidance_scale: 3.5,
        num_inference_steps: 28,
      },
    });

    let imageUrl = null;
    if (Array.isArray(output)) {
      imageUrl = output[output.length - 1];
    } else if (typeof output === "string") {
      imageUrl = output;
    } else if (output && output.image) {
      imageUrl = output.image;
    }

    if (!imageUrl) {
      throw new Error("No image URL returned from model");
    }

    res.status(200).json({ image: imageUrl });
  } catch (err) {
    console.error("Error in /api/generate:", err);
    res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err),
    });
  }
}