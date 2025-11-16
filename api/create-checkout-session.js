import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

// соответствие пакета → Stripe price ID (берём из переменных окружения)
const PACKAGE_CONFIG = {
  p10: {
    generations: 10,
    priceId: process.env.STRIPE_PRICE_10
  },
  p20: {
    generations: 20,
    priceId: process.env.STRIPE_PRICE_20
  },
  p30: {
    generations: 30,
    priceId: process.env.STRIPE_PRICE_30
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
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

    const { email, packageId } = body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!packageId || !PACKAGE_CONFIG[packageId]) {
      return res.status(400).json({ error: "Invalid package" });
    }

    const pkg = PACKAGE_CONFIG[packageId];

    if (!pkg.priceId) {
      return res.status(500).json({ error: "Price ID is not configured" });
    }

    const origin = req.headers.origin || "https://windowtosoul.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: pkg.priceId,
          quantity: 1
        }
      ],
      success_url: `${origin}/?success=1&package=${packageId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      metadata: {
        email,
        packageId,
        generations: String(pkg.generations)
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    return res.status(500).json({
      error: "Failed to create checkout session",
      details: err?.message || String(err)
    });
  }
}
