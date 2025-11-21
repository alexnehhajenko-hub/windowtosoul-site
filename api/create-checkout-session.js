// api/create-checkout-session.js
//
// Создаёт Stripe Checkout Session для пакетов генераций.
// Ожидает в body: { pack: "pack10" | "pack20" | "pack30", email }
// Возвращает: { sessionId, publishableKey }

import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.STRIPE_PUBLISHABLE_KEY ||
  "";

let stripe = null;
if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16"
  });
}

export default async function handler(req, res) {
  // Разрешим только POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!stripe || !stripeSecretKey || !stripePublishableKey) {
      console.error("Stripe keys are missing");
      return res.status(500).json({
        error: "Stripe is not configured on the server."
      });
    }

    const { pack, email } = req.body || {};

    if (!pack) {
      return res.status(400).json({ error: "pack is required" });
    }

    // Настройка пакетов
    const packs = {
      pack10: { credits: 10, amount: 499 },   // €4.99
      pack20: { credits: 20, amount: 899 },   // €8.99
      pack30: { credits: 30, amount: 1199 }   // €11.99
    };

    const packConfig = packs[pack];

    if (!packConfig) {
      return res.status(400).json({ error: "Unknown pack" });
    }

    // Определяем домен для redirect'ов
    const hostHeader = req.headers["x-forwarded-host"] || req.headers.host;
    const protoHeader = req.headers["x-forwarded-proto"] || "https";

    const domainUrl =
      process.env.DOMAIN_URL ||
      (hostHeader ? `${protoHeader}://${hostHeader}` : "http://localhost:3000");

    // Создаём Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `YourPhotoAI – ${packConfig.credits} AI portraits`
            },
            unit_amount: packConfig.amount
          },
          quantity: 1
        }
      ],
      metadata: {
        pack,
        credits: String(packConfig.credits)
      },
      success_url:
        `${domainUrl}/?status=success` +
        `&pack=${encodeURIComponent(pack)}` +
        `&credits=${encodeURIComponent(packConfig.credits)}` +
        `&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domainUrl}/?status=cancel`
    });

    return res.status(200).json({
      sessionId: session.id,
      publishableKey: stripePublishableKey
    });
  } catch (err) {
    console.error("Stripe create-checkout-session error:", err);
    return res.status(500).json({
      error: "Stripe checkout failed",
      details: err?.message || String(err)
    });
  }
}