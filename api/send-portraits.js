// api/send-portraits.js — YourPhotoAI
// Отправка серии портретов пользователю на email через Resend.
// Отправитель: onboarding@resend.dev (не требует настройки домена/DNS).

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Тестовый домен Resend — работает без SPF/DKIM
const FROM_EMAIL = "YourPhotoAI <onboarding@resend.dev>";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is missing");
    return res.status(500).json({
      ok: false,
      error: "RESEND_API_KEY is not configured on the server"
    });
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

    console.log("SEND-PORTRAITS request body:", {
      email,
      imagesCount: Array.isArray(images) ? images.length : 0,
      total,
      used
    });

    if (!email) {
      return res
        .status(400)
        .json({ ok: false, error: "Email is required" });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "No images to send" });
    }

    const safeTotal = Number.isFinite(total) ? total : images.length;
    const safeUsed = Number.isFinite(used) ? used : images.length;

    const imagesHtml = images
      .map(
        (url, idx) => `
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;opacity:0.7;margin-bottom:4px;">
            Портрет ${idx + 1} из ${images.length}
          </div>
          <img src="${url}" alt="Portrait ${idx + 1}" style="max-width:100%;border-radius:12px;" />
        </div>`
      )
      .join("");

    const html = `
      <div style="font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding:24px; background:#050516; color:#ffffff;">
        <h1 style="font-size:22px; margin-bottom:16px;">YourPhotoAI — ваши AI-портреты</h1>
        <p style="font-size:15px; line-height:1.5; margin-bottom:16px;">
          Спасибо, что протестировали <strong>YourPhotoAI</strong>.<br/>
          В этом письме — ваши сгенерированные портреты.
        </p>
        <p style="font-size:13px;opacity:0.8;margin-bottom:16px;">
          Сессия: ${safeUsed} из ${safeTotal} генераций.
        </p>
        ${imagesHtml}
        <p style="font-size:12px; opacity:0.6; margin-top:24px;">
          Если вы не запрашивали это письмо, просто проигнорируйте его.
        </p>
      </div>
    `;

    const sendResult = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Ваши AI-портреты от YourPhotoAI",
      html
    });

    console.log("RESEND SEND RESULT:", sendResult);

    return res.status(200).json({ ok: true, result: sendResult });
  } catch (err) {
    console.error("SEND-PORTRAITS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Failed to send portraits email"
    });
  }
}