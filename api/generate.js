// api/generate.js
//
// Принимает: { style, text, photo, effects, greeting, language }
// Возвращает: { image: "https://..." }
//
// Цели:
// 1) Лицо узнаётся: тот же человек, та же форма лица, глаза, нос, рот.
// 2) Омоложение/ретушь/улыбка — заметны, но без "другого человека".
// 3) Стиль, эффекты и поздравление влияют на фон/атмосферу, а не ломают личность.

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
});

// Модель Replicate. Можешь:
//  - либо задать REPLICATE_MODEL_ID в env,
//  - либо прямо здесь вписать свой ID модели (например, из старой версии).
const MODEL_ID =
  process.env.REPLICATE_MODEL_ID ||
  "black-forest-labs/flux-dev"; // при необходимости замени на свою модель

// Базовые стили
const STYLE_PROMPTS = {
  beauty:
    "high-end beauty photography, soft studio light, shallow depth of field, realistic skin texture",
  oil: "oil painting portrait, detailed brush strokes, rich colors, artstation, trending",
  anime:
    "anime portrait, clean line art, soft shading, detailed expressive eyes, high quality illustration",
  poster:
    "cinematic movie poster portrait, dramatic lighting, sharp details, high contrast",
  classic:
    "classic studio portrait, natural colors, soft but clear lighting, timeless photography"
};

// Поздравительные контексты (фон / атмосфера, не жёсткий текст на картинке)
function buildGreetingPrompt(greeting, language) {
  if (!greeting) return "";

  const lang = language === "en" ? "en" : "ru";

  const map = {
    "new-year": {
      ru: "новогодняя атмосфера, огоньки, ёлка, лёгкие праздничные акценты на фоне",
      en: "New Year atmosphere, warm lights, Christmas tree, gentle festive accents in the background"
    },
    birthday: {
      ru: "атмосфера дня рождения, мягкие праздничные элементы на фоне, конфетти или шарики",
      en: "birthday mood, soft festive elements in the background, confetti or balloons"
    },
    funny: {
      ru: "лёгкое весёлое настроение, немного юмора в деталях, но без карикатуры",
      en: "light funny mood, a bit of humor in details, but not caricature"
    },
    scary: {
      ru: "слегка мрачная мистическая атмосфера, загадочный фон, но лицо остаётся красивым и узнаваемым",
      en: "slightly dark, mystical atmosphere, mysterious background, but the face stays beautiful and recognizable"
    }
  };

  return (map[greeting] && map[greeting][lang]) || "";
}

// Эффекты кожи / возраста / мимики
function buildEffectsPrompt(effects = [], language) {
  const lang = language === "en" ? "en" : "ru";
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
    "surprised-wow"
  ];
  const hasSmile = effects.some((e) => smileKeys.includes(e));
  const neutral = effects.includes("neutral");
  const serious = effects.includes("serious");

  // Возраст/морщины/омоложение
  if (hasYounger) {
    parts.push(
      lang === "en"
        ? "the person looks clearly younger, about 10–20 years younger, but still unmistakably the same person, no change of identity"
        : "человек выглядит заметно моложе, примерно на 10–20 лет, но это однозначно тот же человек, без смены личности"
    );
  } else {
    parts.push(
      lang === "en"
        ? "subtle natural retouching"
        : "лёгкая натуральная ретушь"
    );
  }

  if (hasSmooth) {
    parts.push(
      lang === "en"
        ? "significantly smoother and healthier skin, reduced wrinkles, fresher and more rested look, but still natural skin texture"
        : "заметно более гладкая и здоровая кожа, меньше морщин, более свежий и отдохнувший вид, при этом сохраняется естественная текстура кожи"
    );
  }

  if (hasCinematic) {
    parts.push(
      lang === "en"
        ? "cinematic soft lighting on the face"
        : "кинематографичный мягкий свет на лице"
    );
  }

  // Мимика
  if (hasSmile) {
    parts.push(
      lang === "en"
        ? "a gentle, natural and friendly smile"
        : "мягкая естественная дружелюбная улыбка"
    );
  } else if (neutral) {
    parts.push(
      lang === "en"
        ? "neutral calm expression"
        : "нейтральное спокойное выражение лица"
    );
  } else if (serious) {
    parts.push(
      lang === "en"
        ? "serious confident expression"
        : "серьёзное уверенное выражение лица"
    );
  } else {
    parts.push(
      lang === "en"
        ? "slightly relaxed and pleasant expression"
        : "слегка расслабленное приятное выражение лица"
    );
  }

  return parts.join(", ");
}

// Главный промпт: узнаваемость + стиль + эффекты + поздравление
function buildPrompt({ style, effects, greeting, language, extraText }) {
  const lang = language === "en" ? "en" : "ru";

  const baseStyle =
    STYLE_PROMPTS[style || "beauty"] || STYLE_PROMPTS.beauty;

  const identityPart =
    lang === "en"
      ? "highly realistic portrait of the SAME person from the input photo, same face shape, same eyes, same nose and mouth, very high resemblance, do not change their identity"
      : "очень реалистичный портрет ТОГО ЖЕ человека с исходного фото, та же форма лица, те же глаза, нос и рот, высокая узнаваемость, не менять личность человека";

  const effectsPart = buildEffectsPrompt(effects, language);
  const greetingPart = buildGreetingPrompt(greeting, language);

  const parts = [baseStyle, identityPart];

  if (effectsPart) parts.push(effectsPart);
  if (greetingPart) parts.push(greetingPart);
  if (extraText) parts.push(extraText);

  return parts.join(", ");
}

// Сила изменения изображения (strength) — чтобы при омоложении было заметно,
// а при обычных стилях и scary — мягко.
function computeStrength({ effects = [], style, greeting }) {
  const hasYounger =
    effects.includes("younger") || effects.includes("no-wrinkles");

  if (hasYounger) {
    // Омоложение должно быть видно, но лицо всё равно узнаваемо
    return 0.58;
  }

  // Страшные / постерные стили — немного сильнее стилизация
  if (greeting === "scary" || style === "poster" || style === "anime") {
    return 0.42;
  }

  // По умолчанию — мягкие изменения
  return 0.36;
}

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
      photo, // base64 data URL
      effects,
      greeting,
      language
    } = req.body || {};

    if (!photo) {
      // Сейчас поддерживаем только режим "по фото", без чисто текстовых генераций.
      return res.status(400).json({ error: "photo is required" });
    }

    const safeEffects = Array.isArray(effects) ? effects : [];
    const prompt = buildPrompt({
      style,
      effects: safeEffects,
      greeting,
      language,
      extraText: text
    });

    const strength = computeStrength({
      effects: safeEffects,
      style,
      greeting
    });

    // Важно: модель должна поддерживать image-to-image (prompt + image + strength).
    const output = await replicate.run(MODEL_ID, {
      input: {
        prompt,
        image: photo,
        strength,
        // guidance_scale поменьше, чтобы модель не улетала в стиль и не ломала лицо
        guidance_scale: 3.5,
        num_inference_steps: 28
      }
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
      details: err?.message || String(err)
    });
  }
}