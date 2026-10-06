const BAD_WORDS = [
  "احمق", "کودن", "بی شعور", "بی‌شعور", "خفه شو",
  "حرومزاده", "fuck", "shit"
];

const SYSTEM_PROMPT = `
اسم تو «زک» است.

تو یک ربات تلگرامی با شخصیت باحال، باهوش، شوخ و کمی شیطون هستی.

قوانین:
1. اگر کاربر سؤال درسی پرسید، دقیق و آموزشی جواب بده.
2. برای ریاضی، فیزیک، شیمی، زیست، زمین‌شناسی، فارسی، عربی، دینی و زبان، مرحله‌به‌مرحله و قابل فهم توضیح بده.
3. اگر کاربر شوخی کرد، می‌توانی شوخی دوستانه و طبیعی کنی.
4. اگر کسی توهین کرد، جواب کوتاه، دیس‌طور و خنده‌دار بده؛ اما تهدید، خشونت، نفرت‌پراکنی یا توهین شدید نکن.
5. در بحث کم نیاور، ولی وارد دعوای واقعی نشو.
6. اگر چیزی را نمی‌دانی، الکی جواب نساز.
7. فارسی را طبیعی و محاوره‌ای بنویس.
8. جواب‌ها معمولاً کوتاه باشند، مگر اینکه سؤال درسی نیاز به توضیح کامل داشته باشد.
9. اگر کاربر گفت «زک»، منظورش تو هستی.
`;

function hasBadWord(text) {
  const normalized = text.toLowerCase();
  return BAD_WORDS.some(word => normalized.includes(word.toLowerCase()));
}

async function askAI(message, env) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.AI_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://workers.cloudflare.com/",
      "X-Title": "Zak Telegram Bot"
    },
    body: JSON.stringify({
      model: env.AI_MODEL || "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
      temperature: 0.8,
      max_tokens: 700
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter error:", errorText);
    throw new Error("AI request failed");
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "مغزم یه لحظه هنگ کرد 😂 دوباره بپرس.";
}

async function telegram(method, body, env) {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  return response.json();
}

async function sendMessage(chatId, text, env, replyToMessageId = null) {
  const body = {
    chat_id: chatId,
    text
  };

  if (replyToMessageId) {
    body.reply_parameters = {
      message_id: replyToMessageId,
      allow_sending_without_reply: true
    };
  }

  // Telegram has a 4096-character message limit.
  if (text.length <= 4000) {
    return telegram("sendMessage", body, env);
  }

  const chunks = text.match(/[\s\S]{1,4000}/g) || [];
  let result;
  for (const chunk of chunks) {
    result = await telegram("sendMessage", {
      ...body,
      text: chunk
    }, env);
  }
  return result;
}

function extractText(update) {
  return (
    update?.message?.text ||
    update?.edited_message?.text ||
    ""
  );
}

function getMessage(update) {
  return update?.message || update?.edited_message || null;
}

async function handleUpdate(update, env) {
  const message = getMessage(update);
  if (!message || !message.chat) return;

  // Ignore messages sent by bots to prevent loops.
  if (message.from?.is_bot) return;

  const text = extractText(update).trim();
  if (!text) return;

  // Commands
  if (text === "/start" || text.startsWith("/start@")) {
    await sendMessage(
      message.chat.id,
      "سلام 😎 من زکم!\\n\\nبرای صدام کردن کافیه توی پیامت «زک» بنویسی.",
      env
    );
    return;
  }

  if (text === "/help" || text.startsWith("/help@")) {
    await sendMessage(
      message.chat.id,
      "📚 زک آماده‌ست!\\n\\nمثال:\\n«زک قانون دوم نیوتون رو توضیح بده»\\n«زک این معادله رو حل کن»\\n\\nبرای شوخی هم می‌تونی منو صدا کنی 😂",
      env
    );
    return;
  }

  // Profanity response: only if bad language is detected.
  if (hasBadWord(text)) {
    const prompt = `
کاربر در گروه این پیام را نوشته:
"${text}"

یک جواب خیلی کوتاه، بامزه و دیس‌طور از طرف زک بده.
حالت جواب کری‌خوانی دوستانه داشته باشد.
تهدید، خشونت، نفرت‌پراکنی یا فحش سنگین نداشته باش.
حداکثر دو جمله.
`;
    try {
      const answer = await askAI(prompt, env);
      await sendMessage(message.chat.id, answer, env, message.message_id);
    } catch {
      await sendMessage(
        message.chat.id,
        "آروم‌تر پهلوان 😂 گروه جای دعوا نیست.",
        env,
        message.message_id
      );
    }
    return;
  }

  // Respond only when "زک" appears in the message.
  if (!/زک/i.test(text)) return;

  const question = text.replace(/زک/gi, "").trim();

  if (!question) {
    await sendMessage(message.chat.id, "جان؟ 😎", env, message.message_id);
    return;
  }

  try {
    const answer = await askAI(question, env);
    await sendMessage(message.chat.id, answer, env, message.message_id);
  } catch {
    await sendMessage(
      message.chat.id,
      "داداش مغزم یه لحظه هنگ کرد 😂 دوباره بپرس.",
      env,
      message.message_id
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("ZAK Telegram Bot is running.", { status: 200 });
    }

    // Telegram webhook endpoint
    if (request.method === "POST" && url.pathname === "/webhook") {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");

      if (env.WEBHOOK_SECRET && secret !== env.WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      try {
        const update = await request.json();

        // Return quickly to Telegram. Cloudflare Workers can continue the
        // asynchronous work using waitUntil.
        const task = handleUpdate(update, env);
        ctx.waitUntil(task);

        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error(error);
        return new Response("Bad Request", { status: 400 });
      }
    }

    return new Response("Not found", { status: 404 });
  }
};
