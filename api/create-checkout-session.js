// /api/create-checkout-session.js
// YourPhotoAI — серверный обработчик Stripe Checkout
// Использует переменные окружения:
//   STRIPE_SECRET_KEY
//   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripeSecretKey) {
  console.error("❌ STRIPE_SECRET_KEY is not set in environment variables.");
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20"
    })
  : null;

const PACKS = {
  pack10: { amount: 499, currency: "eur", description: "Пакет YourPhotoAI: 10 генераций портретов" },
  pack20: { amount: 899, currency: "eur", description: "Пакет YourPhotoAI: 20 генераций портретов" },
  pack30: { amount: 1199, currency: "eur", description: "Пакет YourPhotoAI: 30 генераций портретов" }
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!stripe) {
    return res.status(500).json({ error: "Stripe is not configured" });
  }

  try {
    const { pack, email } = req.body || {};

    if (!pack || !PACKS[pack]) {
      return res.status(400).json({ error: "Unknown or missing pack" });
    }

    const packInfo = PACKS[pack];

    const origin = (req.headers["origin"] && String(req.headers["origin"])) || "https://yourphotoai.vip";
    const successUrl = `${origin}/?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/?status=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: packInfo.currency,
            product_data: { name: packInfo.description },
            unit_amount: packInfo.amount
          },
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email || undefined,
      metadata: { pack, email: email || "" }
    });

    return res.status(200).json({
      ok: true,
      sessionId: session.id,
      publishableKey: stripePublishableKey || null
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
