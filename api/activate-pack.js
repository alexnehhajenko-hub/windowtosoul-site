// /api/activate-pack.js
// Проверяет оплату в Stripe и возвращает данные пакета пользователю.

import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing session_id" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not confirmed" });
    }

    const pack = session.metadata?.pack || "pack10";
    const email = session.metadata?.email || session.customer_email || "";

    const packMap = {
      pack10: 10,
      pack20: 20,
      pack30: 30
    };

    const creditsTotal = packMap[pack] || 10;

    return res.status(200).json({
      ok: true,
      pack,
      email,
      creditsTotal,
      creditsLeft: creditsTotal
    });
  } catch (err) {
    console.error("Activate pack error:", err);
    return res.status(500).json({ error: "Server error verifying payment" });
  }
}
