// api/send-email.js

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Формируем красивый From
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL
    ? `YourPhotoAI <${process.env.RESEND_FROM_EMAIL}>`
    : 'YourPhotoAI <no-reply@yourphotoai.vip>';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email, imageUrls } = req.body || {};

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const urls = Array.isArray(imageUrls) ? imageUrls : [];

    const imagesHtml = urls.length
      ? urls
          .map(
            (url) =>
              `<div style="margin-bottom:16px;"><img src="${url}" alt="Portrait" style="max-width:100%;border-radius:12px;" /></div>`
          )
          .join('')
      : '<p>Your portraits will appear here in the future version 💜</p>';

    const html = `
      <div style="font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding:24px; background:#050516; color:#ffffff;">
        <h1 style="font-size:22px; margin-bottom:16px;">YourPhotoAI — your AI portraits</h1>
        <p style="font-size:16px; line-height:1.5; margin-bottom:16px;">
          Thank you for trying <strong>YourPhotoAI</strong>.
          Below you will see your generated portraits (in next version).
        </p>
        ${imagesHtml}
        <p style="font-size:13px; opacity:0.7; margin-top:24px;">
          If you didn’t request this email, you can safely ignore it.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your AI portraits from YourPhotoAI',
      html,
    });

    console.log('Resend send-email result', {
      to: email,
      data,
      error,
    });

    if (error) {
      console.error('Resend API error:', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Resend failed to send email',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      id: data && data.id,
    });
  } catch (err) {
    console.error('Resend unexpected error:', err);
    res.status(500).json({
      ok: false,
      error: err.message || 'Failed to send email',
    });
  }
};