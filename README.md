# ZAK Telegram Bot — Cloudflare Workers

ربات تلگرامی «زک» با Cloudflare Workers و Telegram Webhook.

## قابلیت‌ها

- پاسخ به پیام‌هایی که داخلشان «زک» آمده باشد
- پاسخ به سوالات درسی با OpenRouter
- پاسخ شوخ و دیس‌طور به فحش/توهین‌های ساده
- `/start`
- `/help`
- مناسب اجرای Serverless روی Cloudflare Workers

## نکته مهم

برای امنیت، توکن تلگرام و API Key را داخل `src/index.js` نگذارید.
آن‌ها را به صورت Secret در Cloudflare ثبت کنید.

## روش Deploy با Wrangler

### 1. نصب Node.js

Node.js LTS را نصب کنید.

### 2. نصب Wrangler

```bash
npm install
```

### 3. ورود به Cloudflare

```bash
npx wrangler login
```

### 4. ساخت Secretها

```bash
npx wrangler secret put TELEGRAM_TOKEN
npx wrangler secret put AI_API_KEY
npx wrangler secret put WEBHOOK_SECRET
```

برای هر دستور مقدار مربوطه را وارد کنید.

### 5. Deploy

```bash
npm run deploy
```

بعد از Deploy یک URL شبیه این می‌گیرید:

https://zak-telegram-bot.YOUR-SUBDOMAIN.workers.dev

### 6. ثبت Webhook تلگرام

در مرورگر این آدرس را باز کنید:

https://api.telegram.org/botYOUR_TELEGRAM_TOKEN/setWebhook?url=https://YOUR_WORKER_URL/webhook&secret_token=YOUR_WEBHOOK_SECRET

به جای مقادیر نمونه، مقادیر واقعی خودتان را قرار دهید.

اگر پاسخ `"ok":true` بود، Webhook ثبت شده است.

### 7. Privacy Mode

اگر می‌خواهید زک پیام‌های گروه را برای تشخیص فحش‌ها ببیند:

در @BotFather:

/setprivacy

سپس ربات را انتخاب کنید و:

Disable

را بزنید.

بعد ربات را به گروه اضافه کنید.

## تست

در گروه بنویسید:

زک قانون دوم نیوتون چیست؟

یا:

زک این معادله رو حل کن: x² - 5x + 6 = 0

برای تست:

/help

## مدل AI

مدل پیش‌فرض:

openai/gpt-4o-mini

برای تغییر مدل، مقدار AI_MODEL را در wrangler.toml تغییر دهید و دوباره Deploy کنید.

## نکته درباره Cloudflare

این پروژه از Webhook استفاده می‌کند و لازم نیست Worker دائماً polling انجام دهد.
تلگرام هر پیام جدید را به آدرس `/webhook` می‌فرستد.
