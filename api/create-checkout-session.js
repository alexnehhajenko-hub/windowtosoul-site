// /api/create-checkout-session.js

// Серверная функция Vercel для создания Stripe Checkout Session

const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20", // можно оставить как есть, Stripe сам подстроит
});

/**
 * Helper: получить origin (домен) из запроса
 */
function getOrigin(req) {
  const proto =
    req.headers["x-forwarded-proto"] ||
    (req.headers["x-forwarded-protocol"]
      ? req.headers["x-forwarded-protocol"].split(",")[0]
      : "https");

  const host = req.headers["x-forwarded-host"] || req.headers.host;

  return `${proto}://${host}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const origin = getOrigin(req);

    // Тело запроса с фронта (email пользователя)
    let email = null;
    if (req.body) {
      try {
        const body =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        if (body && typeof body.email === "string") {
          email = body.email.trim();
        }
      } catch (e) {
        // если не получилось распарсить — просто игнорируем
      }
    }

    // Создаём сессию Stripe Checkout.
    // Цена: 1 EUR за пакет из 10 генераций (в тестовом режиме это просто цифра).
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: 100, // 1 EUR = 100 центов
            product_data: {
              name: "YourPhotoAI — 10 portrait generations",
              description:
                "Package of 10 AI portrait generations on yourphotoai.vip",
            },
          },
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      // В метадате можно хранить, сколько генераций положено по пакету.
      metadata: {
        generations_in_package: "10",
      },
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancel`,
    });

    // Главное: отдаём обратно URL, куда надо редиректить браузер.
    return res.status(200).json({
      ok: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);

    return res.status(500).json({
      ok: false,
      error: "Failed to create checkout session",
    });
  }
};