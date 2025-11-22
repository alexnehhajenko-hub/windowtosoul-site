// api/generate.js
// YourPhotoAI — генерация портрета через Replicate
// Теперь заточено под модели, которые сохраняют лицо (например InstantID).

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// По умолчанию будем использовать InstantID (фотореалистичная версия)
const DEFAULT_MODEL_ID = "grandlineai/instant-id-photorealistic";

// В .env / Vercel можно переопределить модель
const MODEL_ID = process.env.REPLICATE_MODEL_ID || DEFAULT_MODEL_ID;

/**
 * Строим промпт под выбранные стиль / эффекты / поздравление.
 * Главная идея — максимально сохранить лицо и только чуть улучшать картинку.
 */
function buildPrompt({ style, effects, greeting }) {
  const parts = [];

  // Базовое описание: тот же человек, то же лицо
  parts.push(
    "photo portrait of the SAME person from the input photo, " +
      "same face, same head shape, same haircut and beard, " +
      "very high similarity to the original person"
  );

  // Стиль (общий вид)
  switch (style) {
    case "oil":
      parts.push(
        "subtle oil painting look, rich details and soft brush texture, " +
          "but still realistic and clearly the same person"
      );
      break;
    case "anime":
      parts.push(
        "light anime illustration style, but facial features and proportions " +
          "are kept as close as possible to the original person"
      );
      break;
    case "poster":
      parts.push(
        "cinematic poster style portrait, shallow depth of field, dramatic lighting, " +
          "but the same real face, no change of gender or age"
      );
      break;
    case "classic":
      parts.push(
        "classic studio portrait photography, neutral background, " +
          "professional lighting"
      );
      break;
    case "beauty":
    default:
      parts.push(
        "beauty portrait, soft studio lighting, very natural skin, realistic colors"
      );
      break;
  }

  // Эффекты кожи / мимики
  if (Array.isArray(effects)) {
    for (const eff of effects) {
      switch (eff) {
        case "no-wrinkles":
          parts.push("reduce wrinkles but keep the same face structure");
          break;
        case "younger":
          parts.push("make the person look 5-10 years younger, subtle rejuvenation");
          break;
        case "smooth-skin":
          parts.push("smooth but realistic skin retouching, no plastic look");
          break;
        case "glow-golden":
          parts.push("soft warm golden glow, gentle highlights");
          break;
        case "cinematic-light":
          parts.push("cinematic lighting, soft contrast, slight vignette");
          break;

        case "smile-soft":
          parts.push("subtle natural smile");
          break;
        case "smile-big":
          parts.push("big friendly smile");
          break;
        case "smile-hollywood":
          parts.push("bright Hollywood smile, white teeth");
          break;
        case "laugh":
          parts.push("laughing expression, joyful mood");
          break;
        case "surprised-wow":
          parts.push("surprised wow expression");
          break;
        case "neutral":
          parts.push("neutral relaxed expression");
          break;
        case "serious":
          parts.push("serious confident expression");
          break;
        case "eyes-bigger":
          parts.push("slightly bigger eyes (very subtle)");
          break;
        case "eyes-brighter":
          parts.push("brighter, more vivid eyes");
          break;
        default:
          break;
      }
    }
  }

  // Поздравления — меняем антураж, но НЕ лицо
  switch (greeting) {
    case "new-year":
      parts.push(
        "New Year atmosphere, soft bokeh lights in the background, " +
          "cozy winter mood"
      );
      break;
    case "birthday":
      parts.push(
        "birthday mood, soft festive background, warm colors, but no text or numbers"
      );
      break;
    case "funny":
      parts.push("funny, playful mood, light humorous atmosphere");
      break;
    case "scary":
      parts.push(
        "slightly scary, cinematic horror lighting and colors, " +
          "but still the same real person, not a monster"
      );
      break;
    default:
      break;
  }

  // Жёсткие запреты — чтобы не было чужих надписей и логотипов
  parts.push(
    "no additional people, no logos, no badges, no watermarks, " +
      "no text, no letters, no numbers, no frames, no UI elements"
  );

  // Важное повторение: не менять пол / расу / черты
  parts.push(
    "do NOT change the gender, skin tone or main facial features, " +
      "keep the person fully recognizable"
  );

  return parts.join(", ");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { style, photo, effects, greeting } = req.body || {};

    if (!photo) {
      return res.status(400).json({ error: "Photo (base64) is required." });
    }

    const prompt = buildPrompt({
      style: style || "beauty",
      effects: effects || [],
      greeting: greeting || null,
    });

    console.log("GENERATE PROMPT:", prompt);
    console.log("MODEL:", MODEL_ID);

    // Минимальный набор полей, который понимают почти все image-to-image модели:
    // image + prompt. Без лишних параметров, чтобы не ловить ошибки схемы.
    const input = {
      image: photo, // data:URL из фронтенда (base64)
      prompt,
    };

    const output = await replicate.run(MODEL_ID, { input });

    // У разных моделей разный формат: иногда массив, иногда строка
    let imageUrl = null;
    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (typeof output === "string") {
      imageUrl = output;
    } else if (output && typeof output === "object") {
      // на всякий случай ищем первое поле со строкой-URL
      const values = Object.values(output);
      const firstUrl = values.find(
        (v) => typeof v === "string" && v.startsWith("http")
      );
      imageUrl = firstUrl || null;
    }

    if (!imageUrl) {
      console.error("Unexpected Replicate output:", output);
      return res
        .status(500)
        .json({ error: "Model did not return an image URL." });
    }

    return res.status(200).json({ image: imageUrl });
  } catch (err) {
    console.error("GENERATE API ERROR:", err);
    return res
      .status(500)
      .json({ error: "Generation failed. Try again later." });
  }
}