// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимики / поздравлений
// Без возврата prompt на фронт

import Replicate from "replicate";

const STYLE_PREFIX = {
  oil: "edit this exact portrait photo, oil painting portrait, detailed, soft warm light, artistic, same person, same gender, no text, no frame, no logo",
  anime: "edit this exact portrait photo into anime style portrait, clean lines, soft pastel shading, same person, same gender, no text, no frame",
  poster: "edit this exact portrait photo into cinematic movie poster portrait, dramatic lighting, high contrast, same person, same gender, no title text, no credits",
  classic: "edit this exact portrait photo in classical old master portrait style, realism, warm tones, detailed skin, same person, no text, no frame",
  default:
    "edit this exact portrait photo, realistic portrait, detailed face, soft studio lighting, same person, same gender, no text, no frame, no logo"
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "subtle beauty retouch, slightly less visible wrinkles, but keep natural age and identity",
  younger:
    "slightly younger look (5-10 years), fresher and healthier skin, but clearly the same person",
  "smooth-skin":
    "smoother skin and more even skin tone, keep all main facial features unchanged",

  // мимика
  "smile-soft": "soft gentle smile, relaxed and friendly expression",
  "smile-big": "big natural smile, teeth visible, joyful expression",
  "smile-hollywood":
    "confident hollywood smile, white teeth, still natural and same person",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral relaxed face expression, no strong emotion",
  serious: "serious focused expression, no smile",
  "eyes-bigger": "slightly more open eyes, more attentive gaze",
  "eyes-brighter": "brighter, more vivid and expressive eyes"
};

// Поздравления — английские, только атмосфера + фон, БЕЗ текста на самой картинке
const GREETING_PROMPTS = {
  "new-year":
    "New Year atmosphere in the background, warm glowing lights, Christmas tree or winter lights, soft bokeh, maybe snow outside the window, but no written text, no subtitles, no logos on the image",
  birthday:
    "birthday celebration mood in the background, balloons, confetti, festive lights, maybe a cake on a table behind, but no written birthday text, no titles, no logos on the image",
  funny:
    "playful and funny atmosphere around the person, bright vivid colors, slightly exaggerated lighting, maybe fun decor in the background, but no meme text, no captions, no logos on the image",
  scary:
    "slightly scary horror atmosphere in the background, darker dramatic lighting, moody fog or spooky corridor behind, but no movie title, no written text, no logos on the image"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Парсим тело
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { style, text, photo, effects, greeting } = body || {};

    // 1. Стиль
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // 2. Пользовательский текст (если когда-нибудь добавим поле)
    const userPrompt = (text || "").trim();

    // 3. Эффекты (кожа + мимика)
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // 4. Поздравление (атмосфера + фон, БЕЗ текста на картинке)
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // 5. Итоговый prompt (остаётся только на сервере, пользователю не отдаём)
    const promptParts = [stylePrefix];
    if (userPrompt) promptParts.push(`details: ${userPrompt}`);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    // Жёсткие ограничения в конце — без лишнего текста и без замены лица
    promptParts.push(
      "keep the same identity as the input photo, same person, same gender, same face structure",
      "no extra people, no UI elements, no watermarks, no website screenshots, no logos, no written text on the image"
    );

    const prompt = promptParts.join(". ").trim();

    // 6. Вход для Replicate
    const input = {
      prompt,
      output_format: "jpg"
    };

    // Фото добавляем только если есть
    if (photo) {
      // FLUX-Kontext-Pro принимает input_image, в твоём рабочем варианте это было так
      input.input_image = photo;
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input
    });

    // Поиск URL
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
        error: "No image URL returned"
      });
    }

    // ВАЖНО: prompt не отдаём на фронт
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