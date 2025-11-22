// api/generate.js
//
// Режим: АККУРАТНОЕ РЕДАКТИРОВАНИЕ ПОРТРЕТА
// - всегда тот же человек, тот же пол и форма лица;
// - правим свет, кожу, мимику, атмосферу;
// - НИКАКИХ надписей, рамок, интерфейсов, логотипов.
//
// Важно: модель FLUX всё равно не идеальный "face editor", но здесь мы максимально
// зажимаем её промптом и параметрами, чтобы она меньше "придумывала" новое лицо.

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
});

// Модель Replicate (по умолчанию flux-dev)
const MODEL_ID =
  process.env.REPLICATE_MODEL_ID || "black-forest-labs/flux-dev";

// Базовые стили — описываем настроение, подчёркивая, что нужно ИМЕННО РЕДАКТИРОВАТЬ фото
const STYLE_PROMPTS = {
  beauty:
    "edit this exact portrait photo, realistic high-end beauty photography, soft studio light, shallow depth of field, natural skin texture, gentle enhancement only",
  oil:
    "edit this exact portrait photo into a subtle oil painting look of the same person, a hint of brush strokes and painterly texture but still clearly based on the original photo, same composition",
  anime:
    "edit this exact portrait photo into a soft anime-style illustration of the same person, keeping the same face proportions, pose and framing",
  poster:
    "edit this exact portrait photo into a cinematic movie poster look of the same person, slightly stronger contrast and dramatic lighting, but same framing and person",
  classic:
    "edit this exact portrait photo, classic studio portrait, natural colors, soft but clear lighting, timeless photography"
};

// Жёсткий запрет на текст / рамки / UI
const NO_TEXT_OR_UI =
  "plain clean image, no text, no captions, no subtitles, no borders, no frames, no UI elements, no instagram layout, no social media layout, no app UI, no buttons, no icons, no cropping handles, no watermarks, no logos, no signatures";

// Атмосфера поздравления — меняем только фон и цвета, БЕЗ текста
function buildGreetingPrompt(greeting, language) {
  if (!greeting) return "";

  const lang = language === "en" ? "en" : "ru";

  const map = {
    "new-year": {
      ru: "очень лёгкая новогодняя атмосфера на заднем плане, тёплые огоньки и мягкий праздничный свет, но без любых надписей или логотипов",
      en: "very subtle New Year atmosphere in the background, warm lights and soft festive glow, but without any text or logos"
    },
    birthday: {
      ru: "лёгкая атмосфера дня рождения на фоне, мягкие праздничные цвета, возможно немного конфетти, но без надписей",
      en: "light birthday mood in the background, soft festive colors, maybe a bit of confetti, but no text"
    },
    funny: {
      ru: "чуть более яркие и весёлые цвета, лёгкий игривый настрой, но без надписей и рамок",
      en: "slightly brighter and playful colors, light fun mood, but no text or frames"
    },
    scary: {
      ru: "слегка более тёмная и мистическая атмосфера на фоне, лёгкий хоррор-эффект, но без надписей и кровавых логотипов",
      en: "slightly darker and mystical atmosphere in the background, light horror-style ambience, but no text or bloody logos"
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
        ? "make the person look a bit younger, around 5–10 years younger, but clearly the same person with the same face structure, gender and ethnicity"
        : "сделать человека немного моложе, примерно на 5–10 лет, но это однозначно тот же человек с той же формой лица, тем же полом и этничностью"
    );
  } else {
    parts.push(
      lang === "en"
        ? "very subtle natural retouching only, not a new face"
        : "очень лёгкая натуральная ретушь, не превращать в новое лицо"
    );
  }

  if (hasSmooth) {
    parts.push(
      lang === "en"
        ? "smoother healthier skin, gently reduced wrinkles, fresher and more rested look, but still natural skin texture"
        : "более гладкая и здоровая кожа, аккуратно уменьшенные морщины, более свежий и отдохнувший вид, при этом естественная текстура кожи сохраняется"
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
        ? "add a gentle, natural and friendly smile without changing the face shape, beard or hairstyle"
        : "добавить мягкую естественную дружелюбную улыбку без изменения формы лица, бороды или причёски"
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
      ? "EDIT this exact input portrait photo only, keep the SAME person, SAME gender, SAME ethnicity, SAME head shape, SAME hairline, SAME beard or facial hair, SAME clothing and background structure, extremely high resemblance, do not turn into another person, do not change gender or race, keep the same camera angle and framing"
      : "РЕДАКТИРОВАТЬ именно это исходное портретное фото, оставить ТОГО ЖЕ человека, ТОТ ЖЕ пол и этничность, ту же форму головы, ту же линию роста волос, ту же бороду или растительность на лице, ту же одежду и структуру фона, очень высокую узнаваемость, не превращать в другого человека, не менять пол или расу, сохранить тот же ракурс камеры и кадрирование";

  const effectsPart = buildEffectsPrompt(effects, language);
  const greetingPart = buildGreetingPrompt(greeting, language);

  const parts = [baseStyle, identityPart];

  if (effectsPart) parts.push(effectsPart);
  if (greetingPart) parts.push(greetingPart);
  if (extraText) parts.push(extraText);

  // Строгий запрет текста/рамок/интерфейса
  parts.push(NO_TEXT_OR_UI);

  return parts.join(", ");
}

// Сила изменения — ещё ниже, чтобы не ломать лицо
function computeStrength({ effects = [], style, greeting }) {
  const hasYounger =
    effects.includes("younger") || effects.includes("no-wrinkles");

  // Омоложение — чуть заметнее, но всё равно аккуратно
  if (hasYounger) {
    return 0.32;
  }

  // Масло / аниме / постер — мягкая стилизация
  if (style === "oil" || style === "anime" || style === "poster") {
    return 0.28;
  }

  // Страшные поздравления — не даём сильно менять лицо
  if (greeting === "scary") {
    return 0.28;
  }

  // По умолчанию минимум изменений
  return 0.25;
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
        guidance_scale: 2.8, // пониже, чтобы меньше "выдумывать"
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