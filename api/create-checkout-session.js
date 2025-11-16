// /api/create-checkout-session.js
// Создание Stripe Checkout-сессии для пакетов 10/20/30 генераций

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
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

    const { packageId } = body || {};

    // Наши пакеты: 10 / 20 / 30 генераций
    const PACKAGES = {
      "10": {
        name: "10 Generations",
        description: "Package for 10 AI portrait generations",
        amount: 499 // €4.99 → 499 центов
      },
      "20": {
        name: "20 Generations",
        description: "Package for 20 AI portrait generations",
        amount: 899 // €8.99
      },
      "30": {
        name: "30 Generations",
        description: "Package for 30 AI portrait generations",
        amount: 1199 // €11.99
      }
    };

    const selected =
      PACKAGES[packageId] || PACKAGES["10"]; // по умолчанию пакет 10

    const origin =
      req.headers.origin ||
      `https://${req.headers.host || "windowtosoul-site.vercel.app"}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: selected.amount,
            product_data: {
              name: selected.name,
              description: selected.description
            }
          }
        }
      ],
      success_url: `${origin}/?checkout=success&package=${encodeURIComponent(
        packageId || "10"
      )}`,
      cancel_url: `${origin}/?checkout=cancel`
    });

    return res.status(200).json({
      ok: true,
      id: session.id,
      url: session.url
    });
  } catch (err) {
    console.error("STRIPE CHECKOUT ERROR:", err);
    return res.status(500).json({
      error: "Stripe checkout failed",
      details: err?.message || String(err)
    });
  }
}