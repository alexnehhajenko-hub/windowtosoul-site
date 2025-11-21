// api/session.js

// ВРЕМЕННОЕ хранилище сессий в памяти сервера.
// Для продакшена потом заменим на базу данных (Supabase/Vercel KV).
// Ключ: sessionId, значение: объект сессии.
const sessions = {};

// Удобная функция создания случайного ID
function generateSessionId() {
  return Array.from(crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now().toString(36)))
    .join('')
    .replace(/-/g, '')
    .slice(0, 24);
}

export default async function handler(req, res) {
  // Разрешим CORS для фронта с твоего домена
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      // Создание новой сессии
      const { email, totalCredits } = req.body || {};

      if (!email) {
        return res.status(400).json({ error: 'Email обязателен для создания сессии' });
      }

      const sessionId = generateSessionId();

      sessions[sessionId] = {
        id: sessionId,
        email,
        totalCredits: Number(totalCredits) || 10, // по умолчанию 10
        usedCredits: 0,
        images: [],
        status: 'active',
        createdAt: new Date().toISOString()
      };

      return res.status(200).json({
        sessionId,
        session: sessions[sessionId]
      });
    }

    if (req.method === 'GET') {
      // Получение информации по сессии
      const { sessionId } = req.query;

      if (!sessionId || !sessions[sessionId]) {
        return res.status(404).json({ error: 'Сессия не найдена' });
      }

      return res.status(200).json(sessions[sessionId]);
    }

    if (req.method === 'PUT') {
      // Обновление сессии: добавление картинки, увеличение usedCredits и т.п.
      const { sessionId, imageUrl, meta, incrementUsedCredits } = req.body || {};

      if (!sessionId || !sessions[sessionId]) {
        return res.status(404).json({ error: 'Сессия не найдена' });
      }

      const session = sessions[sessionId];

      if (typeof incrementUsedCredits === 'number') {
        session.usedCredits += incrementUsedCredits;
        if (session.usedCredits < 0) session.usedCredits = 0;
        if (session.usedCredits >= session.totalCredits) {
          session.status = 'finished';
        }
      }

      if (imageUrl) {
        session.images.push({
          url: imageUrl,
          meta: meta || {},
          createdAt: new Date().toISOString()
        });
      }

      return res.status(200).json(session);
    }

    // Метод не поддерживается
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/session:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}