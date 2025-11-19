// /api/create-checkout-session.js
// Создаёт Stripe Checkout Session для покупки пакетов генераций
// Поддерживает несколько пакетов: pack10 / pack20 / pack30

const Stripe = require("stripe");

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Логируем, если ключа нет — чтобы сразу видно было в логах Vercel
if (!stripeSecretKey) {
  console.error("❌ STRIPE_SECRET_KEY is not set in environment variables.");
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    })
  : null;

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
    name: "YourPhotoAI — 30 AI portrait generations",
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

  if (!stripe) {
    return res.status(500).json({
      ok: false,
      error: "Stripe is not configured (missing STRIPE_SECRET_KEY)",
    });
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
        console.warn("create-checkout-session: failed to parse body", e);
      }
    }

    const packConfig = PACKS[pack] || PACKS.pack10;

    console.log(
      "[create-checkout-session] Creating session for pack:",
      pack,
      "email:",
      email || "(no email)"
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: packConfig.amount,
            product_data: {
              name: packConfig.name,
              description: packConfig.description,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
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
    console.error("❌ Error creating checkout session:", {
      message: error.message,
      type: error.type,
      code: error.code,
    });

    // ВОЗВРАЩАЕМ РЕАЛЬНУЮ ОШИБКУ STRIPE В ОТВЕТ,
    // чтобы на фронте не было "просто неизвестная ошибка".
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to create checkout session",
      stripeType: error.type || null,
      stripeCode: error.code || null,
    });
  }
};