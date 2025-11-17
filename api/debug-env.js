// api/debug-env.js
// Диагностика окружения YourPhotoAI (без вывода самих ключей)

export default function handler(req, res) {
  const stripeSecret = !!process.env.STRIPE_SECRET_KEY;
  const stripePub = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  res.status(200).json({
    ok: true,
    env: {
      STRIPE_SECRET_KEY_PRESENT: stripeSecret,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_PRESENT: stripePub,
      NODE_ENV: process.env.NODE_ENV || null,
      VERCEL_ENV: process.env.VERCEL_ENV || null
    }
  });
}