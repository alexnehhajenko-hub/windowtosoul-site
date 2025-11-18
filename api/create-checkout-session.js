// api/create-checkout-session.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  // Разрешаем только POST-запрос
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ждём из фронта: { packageId: '10' } или '20' / '30'
    const { packageId } = req.body || {};

    // Связываем пакет с переменными окружения
    const priceIdMap = {
      '10': process.env.STRIPE_PRICE_ID_10,
      '20': process.env.STRIPE_PRICE_ID_20,
      '30': process.env.STRIPE_PRICE_ID_30,
    };

    const priceId = priceIdMap[String(packageId)];

    // Если для такого packageId нет priceId — логируем ошибку и даём 500
    if (!priceId) {
      console.error('STRIPE CONFIG ERROR: no priceId for packageId', packageId, priceIdMap);
      return res.status(500).json({ error: 'Stripe price not configured for this package' });
    }

    // Базовый origin — берём из заголовка или жёстко yourphotoai.vip
    const origin = req.headers.origin || 'https://yourphotoai.vip';

    // Создаём Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    // Отдаём и id, и url на фронт
    return res.status(200).json({
      id: session.id,
      url: session.url,
    });
  } catch (err) {
    // Подробный лог в Vercel → Logs
    console.error('STRIPE CHECKOUT ERROR', {
      type: err.type,
      message: err.message,
      code: err?.raw?.code,
      param: err?.raw?.param,
    });

    return res.status(500).json({
      error: err.message || 'Stripe checkout error',
    });
  }
}