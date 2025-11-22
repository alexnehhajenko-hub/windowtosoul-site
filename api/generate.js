// api/generate.js
//
// Режим: АККУРАТНОЕ РЕДАКТИРОВАНИЕ ФОТО
// - всегда тот же человек, тот же пол;
// - меняем свет, кожу, мимику, атмосферу;
// - БЕЗ надписей, рамок, UI, логотипов и т.п.

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
});

// Модель Replicate
const MODEL_ID =
  process.env.REPLICATE_MODEL_ID || "black-forest-labs/flux-dev";

// Базовые стили — делаем их описанием настроения, а не полной перерисовкой
const STYLE_PROMPTS = {
  beauty:
    "edit this exact portrait photo, realistic high-end beauty photography, soft studio light, shallow depth of field, natural skin texture, subtle enhancement only",
  oil:
    "edit this exact portrait photo into a gentle oil painting style of the same person, visible brush strokes but same face and proportions, same composition",
  anime:
    "edit this exact portrait photo into a soft anime-style illustration of the same person, same face proportions and pose, not chibi, natural colors",
  poster:
    "edit this exact portrait photo into a cinematic movie poster look, same person and composition, slightly stronger contrast and dramatic lighting",
  classic:
    "edit this exact portrait photo, classic studio portrait, natural colors, soft but clear lighting, timeless photography"
};

// Жёсткий запрет на любой текст/рамки/UI
const NO_TEXT_OR_UI =
  "plain clean image, no text, no captions, no subtitles, no UI elements, no borders, no frames, no instagram layout, no social media layout, no app UI, no screenshot look, no watermarks, no logo, no signature, no camera icons, no cropping handles";

// Атмосфера поздравления — только фон/цвета, БЕЗ текста
function buildGreetingPrompt(greeting, language) {
  if (!greeting) return "";

  const lang = language === "en" ? "en" : "ru";

  const map = {
    "new-year": {
      ru: "лёгкая новогодняя атмосфера на фоне, огоньки, тёплые цвета, но без любых надписей или логотипов",
      en: "subtle New Year atmosphere in the background, lights and warm colors, but without any text or logos"
    },
    birthday: {
      ru: "атмосфера дня рождения на фоне, мягкие праздничные цвета, возможно шарики или конфетти, но без надписей",
      en: "birthday mood in the background, soft festive colors, maybe balloons or confetti, but no text"
    },
    funny: {
      ru: "чуть более яркие и весёлые цвета, лёгкий юмор в деталях, но без надписей и рамок",
      en: "slightly brighter and playful colors, a bit of fun in details, but no text or frames"
    },
    scary: {
      ru: "слегка более тёмная и мистическая атмосфера, лёгкий хоррор-спецэффект на фоне, но без надписей и кровавых логотипов",
      en: "slightly darker and mystical atmosphere, light horror-style background, but no text or bloody logos"
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

  if (hasYounger) {
    parts.push(
      lang === "en"
        ? "make the person look clearly younger, around 10–15 years younger, but still obviously the same person with the same face structure, gender and ethnicity"
        : "сделать человека заметно моложе, примерно на 10–15 лет, но это однозначно тот же человек с той же формой лица, тем же полом и этничностью"
    );
  } else {
    parts.push(
      lang === "en"
        ? "very subtle natural retouching only"
        : "очень лёгкая натуральная ретушь"
    );
  }

  if (hasSmooth) {
    parts.push(
      lang === "en"
        ? "smoother healthier skin, reduced wrinkles, fresher and more rested look, but still natural skin texture"
        : "более гладкая и здоровая кожа, меньше морщин, более свежий и отдохнувший вид, при этом естественная текстура кожи сохраняется"
    );
  }

  if (hasCinematic) {
    parts.push(
      lang === "en"
        ? "slightly more cinematic soft lighting on the face"
        : "слегка более кинематографичный мягкий свет на лице"
    );
  }

  if (hasSmile) {
    parts.push(
      lang === "en"
        ? "add a gentle, natural and friendly smile without changing the face shape"
        : "добавить мягкую естественную дружелюбную улыбку без изменения формы лица"
    );
  } else if (neutral) {
    parts.push(
      lang === "en"
        ? "keep a neutral calm expression"
        : "сохранить нейтральное спокойное выражение лица"
    );
  } else if (serious) {
    parts.push(
      lang === "en"
        ? "keep a serious confident expression"
        : "сохранить серьёзное уверенное выражение лица"
    );
  } else {
    parts.push(
      lang === "en"
        ? "keep a slightly relaxed and pleasant expression"
        : "сохранить слегка расслабленное приятное выражение лица"
    );
  }

  return parts.join(", ");
}

// Главный промпт: редактирование, тот же человек, без текста/UI
function buildPrompt({ style, effects, greeting, language, extraText }) {
  const lang = language === "en" ? "en" : "ru";

  const baseStyle =
    STYLE_PROMPTS[style || "beauty"] || STYLE_PROMPTS.beauty;

  const identityPart =
    lang === "en"
      ? "EDIT this exact input photo of one person only, keep the SAME person, SAME gender, SAME ethnicity, SAME face shape, SAME eyes, nose and mouth, extremely high resemblance, do not turn into another person, do not change gender"
      : "РЕДАКТИРОВАТЬ именно это исходное фото одного человека, оставить ТОГО ЖЕ человека, ТОТ ЖЕ пол, ТОТ ЖЕ тип лица и этничность, те же глаза, нос и рот, очень высокая узнаваемость, не превращать в другого человека, не менять пол";

  const effectsPart = buildEffectsPrompt(effects, language);
  const greetingPart = buildGreetingPrompt(greeting, language);

  const parts = [baseStyle, identityPart];

  if (effectsPart) parts.push(effectsPart);
  if (greetingPart) parts.push(greetingPart);
  if (extraText) parts.push(extraText);

  // Запрет на любой текст / UI в картинке
  parts.push(NO_TEXT_OR_UI);

  return parts.join(", ");
}

// Сила изменения — ещё мягче, приоритет сохранения лица
function computeStrength({ effects = [], style, greeting }) {
  const hasYounger =
    effects.includes("younger") || effects.includes("no-wrinkles");

  // Омоложение — чуть сильнее, но всё равно аккуратно
  if (hasYounger) {
    return 0.38;
  }

  // Масло / аниме / постер — аккуратная стилизация
  if (style === "oil" || style === "anime" || style === "poster") {
    return 0.34;
  }

  // Страшные поздравления — не даём улетать в другой образ
  if (greeting === "scary") {
    return 0.34;
  }

  // По умолчанию минимум изменений
  return 0.3;
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
        guidance_scale: 3.2, // чуть мягче, чтобы не улетать
        num_inference_steps: 24
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