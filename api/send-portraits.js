// /api/send-portraits.js
// Отправляет все сгенерированные портреты пользователю на email через Resend
//
// Требуются переменные окружения:
//  RESEND_API_KEY      — секретный ключ Resend
//  RESEND_FROM_EMAIL   — от какого адреса отправляем (например, "YourPhotoAI <no-reply@yourdomain.com>")

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL;

if (!resendApiKey) {
  console.error("❌ RESEND_API_KEY is not set.");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!resend) {
    return res.status(500).json({ error: "Email service is not configured" });
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

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Missing email" });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No images to send" });
    }

    const safeTotal = Number.isFinite(total) ? total : images.length;
    const safeUsed = Number.isFinite(used) ? used : images.length;

    const subject = "YourPhotoAI — ваши AI-портреты";

    const listItems = images
      .map(
        (url, idx) => `
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;margin-bottom:4px;">Портрет #${idx + 1}</div>
          <img src="${url}" alt="Portrait ${idx + 1}" style="max-width:100%;border-radius:8px;" />
        </div>
      `
      )
      .join("");

    const html = `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
        <h2 style="margin-bottom:8px;">YourPhotoAI — ваши портреты</h2>
        <p style="font-size:14px;margin-bottom:12px;">
          Спасибо за использование YourPhotoAI.<br/>
          Вы использовали <strong>${safeUsed}</strong> генераций из <strong>${safeTotal}</strong>.
        </p>
        <p style="font-size:14px;margin-bottom:12px;">
          Ниже — все ваши сгенерированные портреты:
        </p>
        ${listItems}
        <p style="font-size:12px;margin-top:20px;color:#666;">
          Если вы не ожида́ли это письмо, просто игнорируйте его.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: resendFrom || "YourPhotoAI <no-reply@yourphotoai.vip>",
      to: email,
      subject,
      html
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("SEND PORTRAITS ERROR:", err);
    return res.status(500).json({
      error: "Failed to send portraits email",
      details: err?.message || String(err)
    });
  }
}