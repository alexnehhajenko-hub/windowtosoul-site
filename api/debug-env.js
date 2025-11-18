// api/debug-env.js

module.exports = async (req, res) => {
  const stripePublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  res.setHeader('Content-Type', 'application/json');

  res.status(200).send(
    JSON.stringify(
      {
        ok: true,
        stripeKeys: [
          'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
          'STRIPE_SECRET_KEY',
        ],
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_raw_defined:
          !!stripePublishable,
        STRIPE_SECRET_KEY_raw_defined: !!stripeSecret,
        RESEND_API_KEY_raw_defined: !!resendKey,
        STRIPE_SECRET_KEY_masked: stripeSecret
          ? stripeSecret.slice(0, 7) + '...' + stripeSecret.slice(-3)
          : null,
        RESEND_API_KEY_masked: resendKey
          ? resendKey.slice(0, 7) + '...' + resendKey.slice(-3)
          : null,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
      null,
      2
    )
  );
};