// api/send-portraits.js
//
// Принимает POST JSON:
// { email, images: string[], total, used, language }
//
// Отправляет письмо через Resend с ссылками/картинками портретов.
// from:   RESEND_FROM_EMAIL или fallback "YourPhotoAI <no-reply@yourphotoai.vip>"
// reply_to: yourphotoaivip@gmail.com (почта поддержки)

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Почта поддержки (для reply-to)
const SUPPORT_EMAIL = "yourphotoaivip@gmail.com";

// Резервный from, если переменная окружения не задана
const FALLBACK_FROM = "YourPhotoAI <no-reply@yourphotoai.vip>";

export default async function handler(req, res) {
  // CORS
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGINS || "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    res
      .status(500)
      .json({ ok: false, error: "RESEND_API_KEY is not configured" });
    return;
  }

  try {
    const { email, images, total, used, language } = req.body || {};
    const lang = language === "en" ? "en" : "ru";

    if (!email) {
      return res.status(400).json({ ok: false, error: "email is required" });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "images array is required" });
    }

    const totalCount = Number.isFinite(total) ? total : images.length;
    const usedCount = Number.isFinite(used) ? used : images.length;

    const fromAddress = process.env.RESEND_FROM_EMAIL || FALLBACK_FROM;

    const subject =
      lang === "en"
        ? "Your AI portraits from YourPhotoAI"
        : "Ваши AI-портреты от YourPhotoAI";

    const headerText =
      lang === "en"
        ? "Thank you for using YourPhotoAI!"
        : "Спасибо, что воспользовались YourPhotoAI!";

    const introText =
      lang === "en"
        ? `We have generated ${images.length} portrait(s) for you.`
        : `Мы подготовили для вас ${images.length} портрет(ов).`;

    const sessionInfo =
      lang === "en"
        ? `Session: ${usedCount} of ${totalCount} generations used.`
        : `Сессия: использовано ${usedCount} из ${totalCount} генераций.`;

    const supportLine =
      lang === "en"
        ? `If something is wrong or you have questions, just reply to this email or write to ${SUPPORT_EMAIL}.`
        : `Если что-то пошло не так или есть вопросы — просто ответьте на это письмо или напишите на ${SUPPORT_EMAIL}.`;

    const imagesHtml = images
      .map(
        (url, index) => `
          <div style="margin: 16px 0; text-align:center;">
            <div style="font-size:13px;color:#666;margin-bottom:4px;">
              ${lang === "en" ? "Portrait" : "Портрет"} #${index + 1}
            </div>
            <a href="${url}" target="_blank" rel="noreferrer"
               style="text-decoration:none;color:#3366ff;">
              <img src="${url}"
                   alt="AI portrait #${index + 1}"
                   style="max-width:100%;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.15);margin-bottom:8px;" />
              <div>${lang === "en" ? "Open full size" : "Открыть в полном размере"}</div>
            </a>
          </div>
        `
      )
      .join("\n");

    const html = `
      <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px 16px;background:#0b0c10;color:#f5f5f5;">
        <h1 style="font-size:22px;margin:0 0 12px;">${headerText}</h1>
        <p style="margin:0 0 4px;">${introText}</p>
        <p style="margin:0 0 16px;font-size:13px;color:#aaaaaa;">${sessionInfo}</p>
        ${imagesHtml}
        <hr style="border:none;border-top:1px solid #333;margin:24px 0;" />
        <p style="font-size:12px;color:#aaaaaa;line-height:1.5;">
          ${supportLine}
        </p>
        <p style="font-size:11px;color:#555;margin-top:12px;">
          YourPhotoAI · yourphotoai.vip
        </p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      reply_to: SUPPORT_EMAIL,
      subject,
      html
    });

    if (error) {
      console.error("Resend email error:", error);
      return res.status(500).json({
        ok: false,
        error: "Resend send() failed",
        details: String(error.message || error)
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("SEND-PORTRAITS ERROR:", err);
    res.status(500).json({
      ok: false,
      error: "Unexpected error while sending email",
      details: err?.message || String(err)
    });
  }
}