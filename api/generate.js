// api/generate.js
//
// Принимает: { style, text, photo, effects, greeting, language }
// Возвращает: { image: "https://..." }
//
// Цели:
// 1) Лицо остаётся тем же человеком, максимум узнаваемости.
// 2) Стиль/эффекты/атмосфера меняются, но не превращают в другое лицо.
// 3) МОДЕЛИ ЯВНО ЗАПРЕЩЕНО РИСОВАТЬ ЛЮБОЙ ТЕКСТ, ПОДПИСИ, ЛОГО, ВОДЯНЫЕ ЗНАКИ.

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
});

// Модель Replicate (можешь переопределить через переменную окружения)
const MODEL_ID =
  process.env.REPLICATE_MODEL_ID || "black-forest-labs/flux-dev";

// Базовые стили
const STYLE_PROMPTS = {
  beauty:
    "high-end beauty photography, soft studio light, shallow depth of field, realistic skin texture",
  oil:
    "oil painting portrait style, visible brush strokes, painterly texture, rich but natural colors, looks like a painting of the same person",
  anime:
    "anime portrait, clean line art, soft shading, detailed expressive eyes, high quality illustration",
  poster:
    "cinematic movie poster portrait, dramatic lighting, sharp details, slightly stylized contrast",
  classic:
    "classic studio portrait, natural colors, soft but clear lighting, timeless photography"
};

// Общий запрет на текст/подписи/логотипы
const NO_TEXT_CLAUSE =
  "no text, no captions, no UI elements, no logo, no watermark, no signature, no instagram layout, no social media frame";

// Поздравительная атмосфера (ТОЛЬКО фон/цвета, БЕЗ текста)
function buildGreetingPrompt(greeting, language) {
  if (!greeting) return "";

  const lang = language === "en" ? "en" : "ru";

  const map = {
    "new-year": {
      ru: "новогодняя атмосфера, огоньки, ёлка, мягкий праздничный фон, но без любых надписей",
      en: "New Year atmosphere, warm lights, Christmas tree, soft festive background, but without any text"
    },
    birthday: {
      ru: "атмосфера дня рождения, шарики или конфетти на фоне, мягкие праздничные цвета, но никаких надписей",
      en: "birthday mood, balloons or confetti in the background, soft festive colors, but no text"
    },
    funny: {
      ru: "весёлое игривое настроение, немного юмора в деталях, но без надписей",
      en: "funny playful mood, a bit of humor in details, but no text"
    },
    scary: {
      ru: "слегка мрачная мистическая атмосфера, загадочный фон, лёгкий хоррор-антуряж, но без надписей",
      en: "slightly dark mystical atmosphere, mysterious background, light horror ambience, but no text"
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
        ? "smoother and healthier skin, reduced wrinkles, fresher and more rested look, but still natural skin texture"
        : "более гладкая и здоровая кожа, меньше морщин, более свежий и отдохнувший вид, при этом сохраняется естественная текстура кожи"
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

// Главный промпт: узнаваемость + стиль + эффекты + атмосфера + запрет текста
function buildPrompt({ style, effects, greeting, language, extraText }) {
  const lang = language === "en" ? "en" : "ru";

  const baseStyle =
    STYLE_PROMPTS[style || "beauty"] || STYLE_PROMPTS.beauty;

  const identityPart =
    lang === "en"
      ? "highly realistic portrait of the SAME person from the input photo, same face shape, same eyes, same nose and mouth, very high resemblance, do not change their identity, do not change gender or ethnicity"
      : "очень реалистичный портрет ТОГО ЖЕ человека с исходного фото, та же форма лица, те же глаза, нос и рот, высокая узнаваемость, не менять личность, пол или этничность человека";

  const effectsPart = buildEffectsPrompt(effects, language);
  const greetingPart = buildGreetingPrompt(greeting, language);

  const parts = [baseStyle, identityPart];

  if (effectsPart) parts.push(effectsPart);
  if (greetingPart) parts.push(greetingPart);
  if (extraText) parts.push(extraText);

  // Всегда добавляем запрет текста на картинке на английском,
  // чтобы модель точно поняла.
  parts.push(NO_TEXT_CLAUSE);

  return parts.join(", ");
}

// Сила изменения изображения (strength)
// Делаем её помягче, чтобы лицо сильно не ломалось.
function computeStrength({ effects = [], style, greeting }) {
  const hasYounger =
    effects.includes("younger") || effects.includes("no-wrinkles");

  if (hasYounger) {
    // Омоложение должно быть видно, но без "другого лица"
    return 0.5;
  }

  // Картина маслом — заметный, но всё ещё аккуратный стиль
  if (style === "oil") {
    return 0.45;
  }

  // Страшные / постерные стили — чуть сильнее стилизация, но не больше 0.42
  if (greeting === "scary" || style === "poster" || style === "anime") {
    return 0.4;
  }

  // По умолчанию — мягкие изменения
  return 0.34;
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

    const output = await replicate.run(MODEL_ID, {
      input: {
        prompt,
        image: photo,
        strength,
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