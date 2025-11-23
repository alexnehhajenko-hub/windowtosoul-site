// api/generate.js — Replicate FLUX-Kontext-Pro
// Фото / эффекты кожи / мимика / поздравления / язык интерфейса
// Prompt остаётся только на сервере, на фронт НЕ отдаём.

import Replicate from "replicate";

const STYLE_PREFIX = {
  beauty:
    "highly realistic beauty portrait photography, soft studio light, flattering but natural look",
  oil: "oil painting portrait, detailed, soft warm light, artistic, painterly brush strokes",
  anime: "anime style portrait, clean lines, soft cel shading, detailed eyes",
  poster:
    "cinematic movie poster style portrait, dramatic lighting, high contrast, shallow depth of field",
  classic:
    "classical old master oil painting portrait, realism, warm tones, detailed skin and lighting",
  default:
    "highly detailed realistic portrait, soft studio lighting, photography"
};

// Эффекты кожи / мимики — аккуратные, без сильного изменения лица
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "subtle beauty retouch, slightly reduced wrinkles, smoother skin but same face",
  younger:
    "looks about 10–15 years younger, fresher skin, same identity and facial structure",
  "smooth-skin":
    "smooth even skin tone, soft beauty lighting, same face, no plastic look",
  "glow-golden":
    "soft golden glow on the skin, warm highlights, cinematic look, same person",
  "cinematic-light":
    "cinematic portrait lighting, soft contrast, focused on the face, same identity",

  // мимика
  "smile-soft":
    "gentle soft smile, relaxed and natural expression, same person, no deformation",
  "smile-big":
    "big warm smile, visible teeth but realistic, same face and identity",
  "smile-hollywood":
    "confident hollywood smile, bright teeth, still natural and similar face",
  laugh:
    "laughing with a bright smile, joyful and natural, do not distort facial features",
  "surprised-wow":
    "subtle wow-surprised expression, slightly raised brows, same identity",
  neutral: "neutral relaxed facial expression, calm, same identity",
  serious: "slightly serious focused look, no smile, same face",
  "eyes-bigger":
    "very slightly larger eyes, more open, but keep realistic proportions",
  "eyes-brighter":
    "brighter, more vivid eyes with reflections, same eye shape and face"
};

// Поздравления — особенно для EN просим явную надпись на картинке
function buildGreetingPrompt(greeting, language) {
  if (!greeting) return "";

  const lang = language === "ru" ? "ru" : "en";

  const map = {
    "new-year": {
      ru: "новогодняя атмосфера, гирлянды и огоньки, немного снега, аккуратная русская рукописная поздравительная надпись на открытке",
      en: "festive New Year greeting portrait, warm lights and snow, clear english handwritten text 'Happy New Year' on the image, big decorative lettering near the edges of the frame, do NOT cover the face"
    },
    birthday: {
      ru: "атмосфера дня рождения, воздушные шары, конфетти, аккуратная русская рукописная поздравительная надпись на открытке",
      en: "birthday greeting card style portrait, balloons and confetti, clear english text 'Happy Birthday' on the image, nice decorative lettering at the top or bottom, the face stays clean and visible"
    },
    funny: {
      ru: "весёлое яркое поздравление, забавная русская надпись на открытке",
      en: "playful funny greeting portrait, bright colors, small english humorous caption like 'You look amazing!' on the image, short text in a corner, does not cover the face"
    },
    scary: {
      ru: "мрачная хоррор-атмосфера, немного тумана, аккуратная страшная русская надпись на открытке",
      en: "dark horror themed greeting portrait, spooky atmosphere, english horror text like 'Happy Halloween' or a creepy phrase on the image, horror-style lettering, but NOT over the eyes or main facial features"
    }
  };

  return map[greeting]?.[lang] || "";
}

function buildEffectsPrompt(effects) {
  if (!Array.isArray(effects) || effects.length === 0) return "";
  return effects
    .map((key) => EFFECT_PROMPTS[key])
    .filter(Boolean)
    .join(", ");
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

    const {
      style,
      text,
      photo,
      effects,
      greeting,
      language: uiLanguage
    } = body || {};

    const lang = uiLanguage || "en";

    // 1. Стиль
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // 2. Пользовательский кастом-текст (на будущее)
    const userPrompt = (text || "").trim();

    // 3. Эффекты
    const effectsPrompt = buildEffectsPrompt(effects);

    // 4. Поздравление
    const greetingPrompt = buildGreetingPrompt(greeting,   
    }    // 5. Базовое требование: сохранить человека
    const identityPrompt =
      "edit this exact portrait photo of the SAME person from the input image, keep the same gender, face shape, skin tone, and identity. Do not generate new people, do not change gender or age drastically. Only adjust style, effects, or add greeting text.";

    // 6. Итоговый prompt — остаётся только на сервере
    const promptParts = [
      stylePrefix,
      identityPrompt,
      effectsPrompt,
      greetingPrompt
    ];

    if (userPrompt) {
      promptParts.push(userPrompt);
    }

    const safetyTail =
      "no random faces, no body changes, no extra people, no text unless described, no distortion, realistic lighting";

    promptParts.push(safetyTail);

    // Чуть жёстче ограничим лишний текст и мусор
    const safetyTail =
      "no extra people, no heavy distortion, no watermarks, no random logos, only the greeting text described above";

    promptParts.push(safetyTail);

    const prompt = promptParts
      .filter((p) => typeof p === "string" && p.trim().length > 0)
      .join(". ")
      .trim();

    // 7. Вход для Replicate
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

    // 8. Достаём URL картинки
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
      console.error("GENERATION ERROR: no image URL in output", output);
      return res.status(500).json({
        error: "No image URL returned"
      });
    }

    // 9. На фронт отдаём только URL
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