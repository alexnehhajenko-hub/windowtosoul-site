// /api/create-checkout-session.js
// Серверная функция Vercel для создания Stripe Checkout Session
// Поддерживает несколько пакетов: pack10 / pack20 / pack30

const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Карта пакетов: код → { amountInCents, credits }
const PACKS = {
  pack10: {
    amount: 100, // 1.00 EUR
    credits: 10,
    name: "YourPhotoAI — 10 portrait generations",
    description: "Package of 10 AI portrait generations on yourphotoai.vip",
  },
  pack20: {
    amount: 180, // 1.80 EUR (пример: чуть выгоднее)
    credits: 20,
    name: "YourPhotoAI — 20 portrait generations",
    description: "Package of 20 AI portrait generations on yourphotoai.vip",
  },
  pack30: {
    amount: 250, // 2.50 EUR (ещё выгоднее)
    credits: 30,
    name: "YourPhotoAI — 30 portrait generations",
    description: "Package of 30 AI portrait generations on yourphotoai.vip",
  },
};

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

    // Тело запроса с фронта: { email, pack }
    let email = null;
    let pack = "pack10"; // значение по умолчанию

    if (req.body) {
      try {
        const body =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        if (body) {
          if (typeof body.email === "string") {
            email = body.email.trim();
          }
          if (typeof body.pack === "string" && PACKS[body.pack]) {
            pack = body.pack;
          }
        }
      } catch (e) {
        // если не получилось распарсить — просто берём дефолтные значения
      }
    }

    const packConfig = PACKS[pack] || PACKS.pack10;

    // Создаём сессию Stripe Checkout.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: packConfig.amount, // цена в центах
            product_data: {
              name: packConfig.name,
              description: packConfig.description,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      // В метадате храним данные пакета, чтобы /api/activate-pack их забрал.
      metadata: {
        pack, // pack10 / pack20 / pack30
        email: email || "",
        credits_total: String(packConfig.credits),
      },
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancel`,
    });

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