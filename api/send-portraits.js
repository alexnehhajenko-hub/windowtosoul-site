// /api/send-portraits.js
// Отправляет email пользователю со всеми сгенерированными портретами.
// Требует переменную окружения RESEND_API_KEY.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, images } = req.body || {};
    if (!email || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Missing email or images" });
    }

    const htmlImages = images
      .map(
        (url) =>
          `<div style="margin-bottom:16px;"><img src="${url}" width="320" style="border-radius:12px;"/></div>`
      )
      .join("");

    const html = `
      <div style="font-family:system-ui,Arial,sans-serif; color:#111;">
        <h2>YourPhotoAI – your generated portraits</h2>
        <p>Thank you for using YourPhotoAI 💫</p>
        <p>Here are your portraits:</p>
        ${htmlImages}
        <p style="margin-top:12px;">Enjoy your AI portraits!</p>
      </div>
    `;

    await resend.emails.send({
      from: "YourPhotoAI <no-reply@yourphotoai.vip>",
      to: email,
      subject: "YourPhotoAI – your portraits are ready",
      html
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Send portraits error:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
}
