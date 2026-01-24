# YourPhotoAI / windowtosoul-site — SITE CONTEXT

## 1) Что это за проект
- Домен: https://yourphotoai.vip
- Проект в Vercel: windowtosoul-site (production, branch main)
- Тип проекта: статичный сайт + serverless API (Vercel)

## 2) Главные пользовательские флоу
### A) Генерация портрета
- Пользователь загружает фото
- Выбирает: стиль / эффекты кожи / мимику / поздравление
- Нажимает Generate → запрос на API → получаем URL картинки → показываем превью → можно скачать/отправить на email

### B) Restore (старое фото)
- Кнопка RESTORE (OLD PHOTO)
- Всегда использует оригинальный загруженный photoBase64 (без цепочки "continue edits")
- Делает восстановление/очистку краёв/минимальный кроп

### C) Continue Edits (цепочка правок)
- Если включено, следующая генерация использует lastResultUrl как input
- Важно: Restore не должен цепляться

## 3) Структура репозитория (актуальная)
/
- index.html
- checkout.js
- package.json
- vercel.json
- robots.txt
- sitemap.xml
/api
- generate.js
- restore.js
- prediction.js
- create-checkout-session.js
- activate-pack.js
- session.js
- send-email.js
- send-portraits.js
- debug-env.js
- health.js
- hollywood.js
/assets
- style.css
- main.js
- email-send.js
- gallery.js
/assets/js
- state.js
- interface.js
- events.js
- generation.js
- effects.js
- payment.js

## 4) API endpoints (контракты)
### POST /api/generate
Body:
- style: string
- text: string
- photo: base64 or url
- effects: string[]
- greeting: string|null
Resp:
- { ok: true, image: string }

### POST /api/restore
Body:
- photo: base64
- mode: "colorize" | "bw"
Resp:
- { ok: true, prediction: string, status: string, web?: string, image?: string }

### POST /api/prediction (если используется)
- Получить статус/результат по prediction id

## 5) Модели (Replicate)
- generate.js: black-forest-labs/flux-2-pro
- restore.js: black-forest-labs/flux-kontext-pro

## 6) Переменные окружения (Vercel)
- REPLICATE_API_TOKEN = (обяз.)
- STRIPE_SECRET_KEY = (опц.)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = (опц.)
- RESEND_API_KEY = (опц.)
- RESEND_FROM_EMAIL = (опц.)

## 7) Где привязаны кнопки (UI)
- index.html: кнопки с id (btnStyle, btnSkin, btnMimic, btnGreetings, btnHollywoodPro, btnRestore, btnGenerate, btnAddPhoto, btnPay, ...)
- assets/js/interface.js: bindElements() цепляет DOM по id
- assets/js/events.js: attachMainHandlers() вешает addEventListener и запускает генерацию
- assets/js/generation.js: handleGenerateClick() → fetch("/api/generate" или "/api/restore")

## 8) Текущие проблемы/цели
### Проблема: "кнопка есть, но генерации не происходит"
Возможные причины:
- в проде не грузится актуальный JS (кэш/старый деплой/не тот путь)
- обработчик кнопки не привязан (нет элемента или bindElements не вызывается)
- fetch падает (ошибка сети/500/не тот endpoint)
- в ответе нет image → фронт ругается "No image URL"

### Цель: Magazine Pro (одна кнопка)
- Одна кнопка без стилей: “Photoshop one-tap”
- Требования:
  - не менять личность/черты лица
  - убрать морщины/пятна/пересветы
  - убрать зеленый оттенок кожи (правка WB/skin tone)
  - лёгкое "slimming" без изменения костей/пропорций
  - запрет на улыбку/подмену выражения (expression lock)

## 9) Как быстро диагностировать
- Проверить в DevTools Network: есть ли POST /api/generate или /api/restore при клике
- Проверить Response (json) и status code
- Проверить Vercel Logs для /api/generate и /api/restore
