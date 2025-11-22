// api/generate.js
//
// Режим: АККУРАТНОЕ РЕДАКТИРОВАНИЕ ПОРТРЕТА
// - всегда тот же человек (тот же пол, форма лица);
// - меняем свет, кожу, мимику, атмосферу;
// - НИКАКИХ надписей, рамок, интерфейсов, логотипов.

import Replicate from "replicate";

// Инициализация клиента Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

// Можно вынести в переменную окружения REPLICATE_MODEL_ID,
// но по умолчанию используем flux-dev (поддерживает редактирование по фото)
const MODEL_ID =
  process.env.REPLICATE_MODEL_ID || "black-forest-labs/flux-dev";

// ---- Базовые стили ----
const STYLE_PROMPTS = {
  oil:
    "edit this exact portrait photo, high-end oil painting look, still same person, realistic proportions, no text, no frame, no logos",
  anime:
    "edit this exact portrait photo into soft anime style, still same person, same gender and haircut, clean background, no text, no UI elements",
  poster:
    "edit this exact portrait photo into cinematic poster style, dramatic but natural lighting, still same person, no title text, no credits, no interface",
  classic:
    "edit this exact portrait photo in old masters painting style, realistic face, same person, warm tones, no text, no border",
  // запасной вариант
  default:
    "edit this exact portrait photo, realistic photo editing, same person, same gender, same face structure, clean background, no text, no frame"
};

// ---- Эффекты кожи и мимики ----
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "subtle beauty retouch, less visible wrinkles, but keep natural age and identity",
  younger:
    "slightly younger look (5-10 years max), healthier skin, but clearly same person",
  "smooth-skin":
    "smoother skin and even skin tone, keep all main facial features unchanged",

  // мимика
  "smile-soft": "subtle soft smile, relaxed and friendly expression",
  "smile-big": "big natural smile, teeth visible, joyful expression",
  "smile-hollywood":
    "confident hollywood smile, white teeth, still natural and same person",
  laugh: "laughing with a bright smile, eyes a bit squinted, joyful",
  neutral: "neutral calm expression, relaxed face, no strong emotion",
  serious: "serious focused expression, no smile",
  "eyes-bigger": "slightly more open eyes, more attentive gaze",
  "eyes-brighter": "brighter, more vivid eyes, a bit more contrast"
};

// ---- Поздравления (только атмосфера, БЕЗ текста на самой картинке) ----
const GREETING_PROMPTS = {
  "new-year":
    "New Year atmosphere, warm glowing lights, soft bokeh background, maybe snow, but no written text on the image",
  birthday:
    "birthday atmosphere, balloons or confetti in the background, festive light, but no written congratulation text on the image",
  funny:
    "playful fun atmosphere, brighter colors and background, but no captions, no memes text",
  scary:
    "slightly dark dramatic atmosphere, horror-movie lighting, maybe foggy background, but no written text, no titles"
};

// --- Вспомогательные функции построения промпта ---

function buildEffectsPrompt(effects) {
  if (!Array.isArray(effects) || effects.length === 0) return "";
  return effects
    .map((key) => EFFECT_PROMPTS[key])
    .filter(Boolean)
    .join(", ");
}

function buildGreetingPrompt(greeting) {
  if (!greeting || !GREETING_PROMPTS[greeting]) return "";
  return GREETING_PROMPTS[greeting];
}

function buildFullPrompt({ style, text, effects, greeting }) {
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.default;
  const userText = (text || "").trim();

  const parts = [
    stylePrompt,
    // текст пользователя трактуем как пожелания к атмосфере / деталям
    userText ? `details: ${userText}` : "",
    buildEffectsPrompt(effects),
    buildGreetingPrompt(greeting),
    // жёсткие ограничения в конце
    "no additional people, no changing gender, keep same identity and clothes as input photo, no text, no subtitles, no watermarks, no UI, no frames"
  ].filter(Boolean);

  return parts.join(". ");
}

// --- HTTP-обработчик ---

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Разбираем тело запроса
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { style, text, photo, effects, greeting } = body || {};

    if (!photo) {
      return res.status(400).json({
        error: "Photo is required for portrait editing"
      });
    }

    const prompt = buildFullPrompt({ style, text, effects, greeting });

    // ВАЖНО: для flux-dev используем параметр image, чтобы модель
    // реально редактировала загруженный портрет, а не придумывала нового человека
    const input = {
      prompt,
      image: photo,
      output_format: "jpg"
    };

    const output = await replicate.run(MODEL_ID, { input });

    // Достаём URL картинки из возможных форматов ответа
    let imageUrl = null;

    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (output?.output) {
      if (Array.isArray(output.output)) imageUrl = output.output[0];
      else if (typeof output.output === "string") imageUrl = output.output;
    } else if (typeof output === "string") {
      imageUrl = output;
    } else if (output?.image) {
      imageUrl = output.image;
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: "No image URL returned from Replicate"
      });
    }

    // На фронт отправляем только URL
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