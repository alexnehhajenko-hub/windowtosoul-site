// api/send-portraits.js
// Отправка готовых портретов через Resend после завершения сессии

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// основной "from" — из переменной окружения, запасной — hello@yourphotoai.vip
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "hello@yourphotoai.vip";

// почта поддержки внизу письма
const SUPPORT_EMAIL = "yourphotoaivip@gmail.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // чтобы не падать, если тело пришло строкой
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.error("SEND-PORTRAITS: cannot parse body", e);
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { email, images, total, used } = body || {};

  if (!email) {
    return res.status(400).json({ error: "Missing email" });
  }
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "No images to send" });
  }

  console.log(
    "SEND-PORTRAITS: start",
    JSON.stringify({ email, count: images.length, total, used })
  );

  // Собираем HTML с картинками
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

  const sessionInfo =
    typeof total === "number" && typeof used === "number"
      ? `<p style="margin:0 0 16px;font-size:13px;color:#aaaaaa;">
           Session: used ${used} of ${total} generations.
         </p>`
      : "";

  const html = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px 16px;background:#0b0c10;color:#f5f5f5;">
      <h1 style="font-size:22px;margin:0 0 12px;">Thank you for using YourPhotoAI!</h1>
      <p style="margin:0 0 4px;">We prepared ${images.length} portrait(s) for you.</p>
      ${sessionInfo}
      ${portraitsHtml}
      <hr style="border:none;border-top:1px solid #333;margin:24px 0;" />
      <p style="font-size:12px;color:#aaaaaa;line-height:1.5;">
        If something went wrong or you have questions – just reply to this email
        or write to ${SUPPORT_EMAIL}.
      </p>
      <p style="font-size:11px;color:#555;margin-top:12px;">
        YourPhotoAI · yourphotoai.vip
      </p>
    </div>
  `;

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("SEND-PORTRAITS: RESEND_API_KEY is missing");
      return res.status(500).json({ error: "Email service not configured" });
    }

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: "Your AI portraits from YourPhotoAI",
      html,
      reply_to: [SUPPORT_EMAIL]
    });

    console.log("SEND-PORTRAITS: Resend response", response);

    // Если всё ок
    return res.status(200).json({
      ok: true,
      id: response?.id || null
    });
  } catch (error) {
    console.error("SEND-PORTRAITS: Resend error", error);
    // Пробросим понятную ошибку на фронт
    return res.status(500).json({
      error: "Resend email failed",
      details: error?.message || String(error)
    });
  }
}