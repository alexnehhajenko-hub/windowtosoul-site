import Replicate from "replicate";

// Стили
const STYLE_PREFIX = {
  beauty:
    "soft beauty portrait, studio lighting, bright airy tones, smooth flawless skin, no wrinkles, gentle high-end retouch, subtle glow, k-beauty style, pastel background, flattering look",
  oil:
    "dramatic oil painting portrait, impasto style, very visible thick brush strokes, rich oil paint texture, canvas texture, painterly background, face slightly stylized, not photorealistic, strong painterly look, soft edges",
  anime: "anime style portrait, clean lines, soft pastel shading",
  poster: "cinematic movie poster portrait, dramatic lighting, high contrast",
  classic: "classical old master portrait, warm tones, detailed skin",
  default: "realistic portrait, detailed face, soft studio lighting"
};

// Эффекты
const EFFECT_PROMPTS = {
  "no-wrinkles": "no wrinkles, reduced skin texture, gentle beauty retouch",
  younger: "looks younger, fresh and healthy skin",
  "smooth-skin": "smooth flawless skin, even skin tone",

  "smile-soft": "soft smile",
  "smile-big": "big warm smile",
  "smile-hollywood": "hollywood smile, bright teeth",
  laugh: "laughing expression",
  neutral: "neutral relaxed expression",
  serious: "serious focused expression",
  "eyes-bigger": "slightly bigger eyes",
  "eyes-brighter": "brighter vivid eyes"
};

// Поздравления (атмосфера)
const GREETING_PROMPTS = {
  "new-year":
    "festive warm New Year atmosphere, glowing lights, soft snow, cozy tone, no text",
  birthday:
    "birthday theme, balloons, confetti, bright colors, celebration mood, no text",
  funny: "fun playful humorous atmosphere, vivid colors, no text",
  scary: "dark spooky cinematic horror atmosphere, eerie lighting, no text"
};

const NO_TEXT_PROMPT =
  "remove all text, remove logos, no numbers, no phone UI, no watermarks, no captions, no stickers, clean background";

const NEGATIVE_PROMPT =
  "text, watermark, subtitles, numbers, phone UI, stickers, emojis, logo, interface";

export async function POST(req) {
  try {
    const body = await req.json();
    const { style, photo, text, effects, greeting } = body;

    if (!photo) {
      return Response.json(
        { error: "photo missing" },
        { status: 400 }
      );
    }

    // Стиль
    const stylePart = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // Эффекты
    let effectPart = "";
    if (Array.isArray(effects)) {
      effectPart = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // Поздравление
    const greetingPart = greeting ? GREETING_PROMPTS[greeting] || "" : "";

    // Итоговый prompt
    const prompt = [
      stylePart,
      NO_TEXT_PROMPT,
      text || "",
      effectPart,
      greetingPart
    ]
      .filter(Boolean)
      .join(". ");

    // Base64 → файл (buffer)
    const base64 = photo.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    // Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt,
          negative_prompt: NEGATIVE_PROMPT,
          image: buffer,           // ← ВАЖНО: правильный ключ
          output_format: "jpg"
        }
      }
    );

    let imageUrl =
      Array.isArray(output)
        ? output[0]
        : output?.output?.[0] || output?.output || null;

    if (!imageUrl) {
      return Response.json(
        { error: "model returned no image" },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, image: imageUrl });
  } catch (err) {
    console.error("GEN ERROR:", err);
    return Response.json(
      { error: "generation failed", details: err?.message },
      { status: 500 }
    );
  }
}