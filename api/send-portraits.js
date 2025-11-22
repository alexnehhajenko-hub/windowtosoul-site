// api/send-portraits.js
// Отправка готовых портретов пользователю через Resend

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const { email, images, total, used } = body || {};

    if (!email || !Array.isArray(images) || images.length === 0) {
      console.error("SEND-PORTRAITS: bad request body", body);
      return res.status(400).json({
        ok: false,
        error: "Invalid request body"
      });
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    const from = `YourPhotoAI <${fromEmail}>`;
    const subject = "Ваши AI-портреты от YourPhotoAI";

    // Текст вверху письма
    const headerHtml = `
      <h1 style="font-size:22px;margin:0 0 12px;">
        Спасибо, что воспользовались YourPhotoAI!
      </h1>
      <p style="margin:0 0 4px;">Мы подготовили для вас ${
        images.length
      } портрет(ов).</p>
      <p style="margin:0 0 16px;font-size:13px;color:#aaaaaa;">
        Сессия: использовано ${used ?? images.length} из ${total ?? images.length} генераций.
      </p>
    `;

    // Блоки с картинками
    const imagesHtml = images
      .map((url, index) => {
        const num = index + 1;
        return `
          <div style="margin: 16px 0; text-align:center;">
            <div style="font-size:13px;color:#666;margin-bottom:4px;">
              Портрет #${num}
            </div>
            <a href="${url}" target="_blank" rel="noreferrer"
               style="text-decoration:none;color:#3366ff;">
              <img src="${url}"
                   alt="AI portrait #${num}"
                   style="max-width:100%;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.15);margin-bottom:8px;" />
              <div>Открыть в полном размере</div>
            </a>
          </div>
        `;
      })
      .join("\n");

    const footerHtml = `
      <hr style="border:none;border-top:1px solid #333;margin:24px 0;" />
      <p style="font-size:12px;color:#aaaaaa;line-height:1.5;">
        Если что-то пошло не так или есть вопросы —
        просто ответьте на это письмо или напишите на yourphotoaivip@gmail.com.
      </p>
      <p style="font-size:11px;color:#555;margin-top:12px;">
        YourPhotoAI · yourphotoai.vip
      </p>
    `;

    const html = `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px 16px;background:#0b0c10;color:#f5f5f5;">
        ${headerHtml}
        ${imagesHtml}
        ${footerHtml}
      </div>
    `;

    const to = [email];

    // Можно получить копию на себя, если захочешь
    const ownerEmail = process.env.OWNER_EMAIL;
    if (ownerEmail) {
      to.push(ownerEmail);
    }

    console.log("SEND-PORTRAITS: sending email via Resend", {
      to,
      from,
      imagesCount: images.length
    });

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      reply_to: ownerEmail ? [ownerEmail] : undefined
    });

    console.log("SEND-PORTRAITS: Resend response", result);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("SEND-PORTRAITS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to send email",
      details: err?.message || String(err)
    });
  }
}