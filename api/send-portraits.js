// api/send-portraits.js
//
// Отправка сгенерированных портретов пользователю через Resend.
// Дополнительно: BCC на e-mail владельца, чтобы контролировать доставку.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "hello@yourphotoai.vip";
// сюда можно поставить твой Gmail или другой адрес для копий
const OWNER_EMAIL =
  process.env.OWNER_EMAIL || "yourphotoaivip@gmail.com";

export default async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
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

    const { email, images, total, used } = body || {};

    if (!email) {
      return res
        .status(400)
        .json({ error: "Email is required for sending portraits." });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res
        .status(400)
        .json({ error: "No images provided to send." });
    }

    if (!FROM_EMAIL) {
      return res
        .status(500)
        .json({ error: "RESEND_FROM_EMAIL is not configured." });
    }

    // Собираем HTML с мини-галереей картинок
    const safeTotal = Number.isFinite(total) ? total : images.length;
    const safeUsed = Number.isFinite(used) ? used : images.length;

    const imageBlocks = images
      .map(
        (url) =>
          `<div style="margin-bottom:16px;"><img src="${url}" style="max-width:100%;border-radius:12px;" alt="AI portrait"></div>`
      )
      .join("");

    const html = `
      <div style="font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111;">
        <h1 style="font-size:20px; margin-bottom:12px;">Your AI portraits are ready 🎨</h1>

        <p style="font-size:14px; line-height:1.5;">
          Thank you for using <strong>YourPhotoAI</strong>.
          Here are your generated portraits.
        </p>

        <p style="font-size:13px; color:#555;">
          Session: <strong>${safeUsed}</strong> of <strong>${safeTotal}</strong> generations used.
        </p>

        <div style="margin-top:24px;">
          ${imageBlocks}
        </div>

        <p style="font-size:12px; color:#777; margin-top:24px;">
          If the images are not displayed correctly, please make sure that your email client allows loading external images.
        </p>
      </div>
    `;

    const bccList =
      OWNER_EMAIL && OWNER_EMAIL !== email ? [OWNER_EMAIL] : undefined;

    console.log("SEND-PORTRAITS to:", email, "bcc:", bccList);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      bcc: bccList,
      subject: "Your YourPhotoAI portraits",
      html,
    });

    if (error) {
      console.error("Resend email error:", error);
      return res.status(500).json({
        ok: false,
        error: "Resend email error",
        details: error,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("SEND-PORTRAITS API ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: err?.message || String(err),
    });
  }
}