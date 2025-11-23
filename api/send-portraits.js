// api/send-portraits.js
// Отправка всех сгенерированных портретов на email пользователя через Resend.
// Также отправляем скрытую копию (BCC) на почту владельца, чтобы можно было
// найти и переслать письмо, если пользователь его потерял.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// От кого отправляем (лучше задать RESEND_FROM_EMAIL в Vercel)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "hello@yourphotoai.vip";
// Твой адрес для поддержки и BCC
const SUPPORT_EMAIL = "yourphotoaivip@gmail.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
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
      return res.status(400).json({
        ok: false,
        error: "Invalid payload: email or images missing"
      });
    }

    // Логируем, чтобы в Vercel было видно, что отправка вообще происходила
    console.log("[SEND-PORTRAITS] request", {
      to: email,
      imagesCount: images.length,
      total,
      used
    });

    const html = buildEmailHtml({ email, images, total, used });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],                 // пользователь
      bcc: [SUPPORT_EMAIL],        // скрытая копия тебе
      subject: "Your AI portraits from YourPhotoAI",
      html,
      reply_to: [SUPPORT_EMAIL]    // если ответят — придёт тебе
    });

    if (error) {
      console.error("[SEND-PORTRAITS] Resend error", error);
      return res.status(500).json({
        ok: false,
        error: "Resend API error",
        details: error?.message || String(error)
      });
    }

    console.log("[SEND-PORTRAITS] sent successfully", {
      to: email,
      id: data?.id
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[SEND-PORTRAITS] handler error", err);
    return res.status(500).json({
      ok: false,
      error: "Unhandled server error",
      details: err?.message || String(err)
    });
  }
}

function buildEmailHtml({ email, images, total, used }) {
  const safeTotal = typeof total === "number" ? total : images.length;
  const safeUsed = typeof used === "number" ? used : images.length;

  const portraitsHtml = images
    .map((url, index) => {
      const num = index + 1;
      return `
        <div style="margin: 16px 0; text-align:center;">
          <div style="font-size:13px;color:#666;margin-bottom:4px;">
            Portrait #${num}
          </div>
          <a href="${url}" target="_blank" rel="noreferrer"
             style="text-decoration:none;color:#3366ff;">
            <img src="${url}"
                 alt="AI portrait #${num}"
                 style="max-width:100%;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.15);margin-bottom:8px;" />
            <div>Open full size</div>
          </a>
        </div>
      `;
    })
    .join("\n");

  return `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                max-width:640px;margin:0 auto;padding:24px 16px;
                background:#0b0c10;color:#f5f5f5;">
      <h1 style="font-size:22px;margin:0 0 12px;">Thank you for using YourPhotoAI!</h1>
      <p style="margin:0 0 4px;">We have prepared ${images.length} AI portrait(s) for you.</p>
      <p style="margin:0 0 16px;font-size:13px;color:#aaaaaa;">
        Session: used ${safeUsed} of ${safeTotal} generations.<br/>
        Email: ${email}
      </p>

      ${portraitsHtml}

      <hr style="border:none;border-top:1px solid #333;margin:24px 0;" />
      <p style="font-size:12px;color:#aaaaaa;line-height:1.5;">
        If something went wrong or you have questions — just reply to this email
        or write to ${SUPPORT_EMAIL}.
      </p>
      <p style="font-size:11px;color:#555;margin-top:12px;">
        YourPhotoAI · yourphotoai.vip
      </p>
    </div>
  `;
}