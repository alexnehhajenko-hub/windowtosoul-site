// api/debug-env.js

function mask(value) {
  if (!value) return null;
  const s = String(value);
  if (s.length <= 10) return s;
  return s.slice(0, 8) + "..." + s.slice(-4);
}

export default function handler(req, res) {
  const allEnvKeys = Object.keys(process.env);

  const stripeKeys = allEnvKeys.filter((k) =>
    k.startsWith("STRIPE") || k.startsWith("NEXT_PUBLIC_STRIPE")
  );

  res.status(200).json({
    ok: true,
    stripeKeys,
    STRIPE_SECRET_KEY_raw_defined: process.env.STRIPE_SECRET_KEY !== undefined,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_raw_defined:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY !== undefined,

    STRIPE_SECRET_KEY_masked: mask(process.env.STRIPE_SECRET_KEY),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_masked: mask(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ),

    NODE_ENV: process.env.NODE_ENV || null,
    VERCEL_ENV: process.env.VERCEL_ENV || null
  });
}