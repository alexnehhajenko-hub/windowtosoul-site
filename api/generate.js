// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления / яркие стили

import Replicate from "replicate";

// ───────────────────── СТИЛИ (включая «дьявола» и старину) ─────────────────────

const STYLE_PREFIX = {
  // мягкий «красивый» портрет
  beauty:
    "high-end beauty portrait, realistic photo, soft studio light, clean background, detailed face",

  // базовые стили
  oil: "oil painting portrait, detailed, soft warm light, artistic brush strokes",
  anime:
    "anime style portrait, clean line art, soft pastel shading, big expressive eyes",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field",
  classic:
    "classical portrait, inspired by old masters, warm tones, realistic skin, subtle vignette",

  // Старинный
  royal_old:
    "ancient royal oil painting, baroque or renaissance style, cracked old paint texture, vintage canvas look, warm dramatic lighting, ornate clothing, looks like a museum painting",

  // Неон / киберпанк
  neon:
    "cyberpunk neon portrait, futuristic city lights, blue and pink neon reflections, glowing lines, strong contrast, sci-fi concept art, vaporwave atmosphere",

  // Демон / дьявол
  devil:
    "dark demonic fantasy portrait, red and black color palette, glowing red eyes, fire and smoke in the background, subtle horns, cinematic dramatic lighting",

  // Ангел
  angel:
    "heavenly angel portrait, bright soft light, golden glow, light feathers, halo above the head, dreamy and pure atmosphere, white and gold colors",

  // Вампир
  vampire:
    "gothic vampire portrait, pale skin, deep shadows, red accents, mysterious night background, cinematic moonlight, elegant but dark look",

  // Призрак / хоррор
  ghost:
    "horror ghost portrait, fog and mist, pale cold light, slightly transparent look, creepy but artistic, dark cinematic background",

  // Огонь / энергия
  fire:
    "epic fantasy portrait surrounded by flames and sparks, glowing energy aura, orange and red light, dramatic cinematic composition",

  // Комикс / поп-арт
  comic:
    "comic book style portrait, pop art, thick black outlines, bright flat colors, halftone dots, looks like a Marvel or DC poster",

  // Бог света / космос
  god_light:
    "divine fantasy portrait, radiant light, cosmic atmosphere, subtle stars around, powerful but calm expression, ethereal glow",

  default: "realistic portrait, detailed face, soft studio lighting"
};

// ───────────────────── ЭФФЕКТЫ КОЖИ + МИМИКА ─────────────────────
// Ключи совпадают с теми, что используются в assets/js/effects.js

const EFFECT_PROMPTS = {
  // один «мягкий» общий эффект
  "beauty-one-touch":
    "keep exactly the same person and the same face. do not make the person more beautiful, do not stylize the face. only reduce the visibility of wrinkles and fine lines, gently smooth and even the skin texture, remove acne and small blemishes, keep natural pores and realistic skin",

  // кожа
  "no-wrinkles":
    "same person with slightly reduced visibility of wrinkles, a bit softer skin texture, still natural and realistic",
  younger:
    "same person looking slightly more rested and a bit younger, fresher skin, but clearly the same face and gender",
  "smooth-skin":
    "same person with smoother and more even skin, reduced blemishes, preserved pores, realistic texture, no change to facial features or gender",
  "glow-golden":
    "same person with soft warm golden light on the face, healthy skin glow, without changing age, gender or facial structure",
  "cinematic-light":
    "same person with cinematic soft light, better contrast and shading on the same face, no changes to identity",

  // мимика
  "smile-soft":
    "same person with a subtle soft smile, calm and relaxed expression, no change to face structure",
  "smile-big":
    "same person with a big warm smile, expressive and friendly face",
  "smile-hollywood":
    "same person with a wide natural smile, visible teeth, confident look, but still the same identity",
  laugh:
    "same person laughing with a bright smile, joyful and natural expression",
  "surprised-wow":
    "same person with a surprised wow expression, eyes slightly wider, eyebrows raised",
  neutral:
    "same person with a neutral relaxed face expression, no strong visible emotion",
  serious:
    "same person with a serious focused face, no smile, calm but intense look",
  "eyes-bigger":
    "same person with slightly more open eyes, a bit bigger looking but still realistic, same eye shape",
  "eyes-brighter":
    "same person with brighter more vivid and expressive eyes, stronger reflections, same anatomy"
};

// ───────────────────── ПОЗДРАВЛЕНИЯ (АТМОСФЕРА + ТЕКСТ) ─────────────────────

const GREETING_PROMPTS = {
  "new-year":
    "festive New Year portrait, cozy winter atmosphere, soft lights and bokeh, elegant handwritten English text 'Happy New Year' on the image",
  birthday:
    "birthday celebration portrait, balloons and confetti in the background, warm party lights, elegant handwritten English text 'Happy Birthday' on the image",
  funny:
    "playful fun portrait, bright vivid colors, dynamic background shapes, bold handwritten English text like 'You look amazing!' on the image",
  scary:
    "dark horror themed portrait, moody lighting, spooky background, atmosphere of Halloween, creepy handwritten English text 'Happy Halloween' on the image"
};

// ───────────────────── ЖЁСТКИЙ КОНТРОЛЬ ЛИЦА И БЕЗОПАСНОСТЬ ─────────────────────

const IDENTITY_PROMPT =
  "STRICTLY edit this exact portrait photo of the SAME person from the input image only. " +
  "The final result MUST be clearly recognizable as the same person, at least 80 percent similar to the input face. " +
  "Keep the same gender, age range, face shape and main facial features. " +
  "Do NOT change gender, do NOT turn a man into a woman and do NOT turn a woman into a man. " +
  "Do NOT replace the face with a different model or a different more beautiful person. " +
  "Do NOT change the attractiveness level, only apply the requested style, skin and expression modifications.";

const UI_CLEANUP_TAIL =
  "if the input looks like a screenshot of a website or app, completely remove and repaint all interface elements, grey panels, buttons, captions and menus around the face. " +
  "Do NOT reproduce any UI text, prices or language buttons. " +
  "Generate only a clean portrait of the person on a simple background, with no text, no frames, no logos, no watermarks and no interface elements at all.";

const SAFETY_TAIL =
  "portrait from the shoulders up, person is fully clothed, no nudity, no explicit cleavage, no sexual content, no extra people, no distorted anatomy";

// ───────────────────── API HANDLER ─────────────────────

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

    // 2. Пользовательский текст (если что-то ввели)
    const userPrompt = (text || "").trim();

    // 3. Эффекты → в prompt
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((key) => EFFECT_PROMPTS[key])
        .filter(Boolean)
        .join(". ");
    }

    // 4. Поздравление (атмосфера + текст на картинке)
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // 5. Итоговый prompt
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

    // 6. Вход в модель Replicate
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

    // 7. Достаём URL картинки
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
      image: imageUrl
      // prompt на фронт не отдаём
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}