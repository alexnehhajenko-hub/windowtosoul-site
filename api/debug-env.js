// /api/debug-env.js
export default function handler(req, res) {
  res.status(200).json({
    // Показываем только факт наличия ключей (true/false)
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: !!process.env.RESEND_FROM_EMAIL,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    REPLICATE_API_TOKEN: !!process.env.REPLICATE_API_TOKEN,

    // Диагностика домена
    NODE_ENV: process.env.NODE_ENV || "unknown",

    // Текущий origin
    HOST: req.headers.host,
    PROTO: req.headers["x-forwarded-proto"] || "unknown",

    time: new Date().toISOString()
  });
}