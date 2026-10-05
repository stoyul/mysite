const API_PREFIX = "/api/telegram";
const PRODUCT_CODE = "dlya-sebya-full-access-v1";
const MAX_INIT_DATA_AGE_SECONDS = 60 * 60 * 24;
const MAX_PROGRESS_BYTES = 48_000;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

function config(env) {
  const starsPrice = Number.parseInt(env.STARS_PRICE || "", 10);
  return {
    freeCardLimit: Math.max(1, Math.min(10, Number.parseInt(env.FREE_CARD_LIMIT || "3", 10) || 3)),
    starsPrice: Number.isSafeInteger(starsPrice) && starsPrice > 0 ? starsPrice : null,
    termsUrl: /^https:\/\//i.test(env.TERMS_URL || "") ? env.TERMS_URL : "",
    supportContact: typeof env.SUPPORT_CONTACT === "string" ? env.SUPPORT_CONTACT.slice(0, 160) : "",
    purchaseReady: Boolean(env.DB && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET && env.MINI_APP_URL && /^https:\/\//i.test(env.TERMS_URL || "") && env.SUPPORT_CONTACT && Number.isSafeInteger(starsPrice) && starsPrice > 0),
  };
}

async function hmac(keyBytes, message) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function toHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function validateInitData(raw, token) {
  if (!raw || !token || raw.length > 16_000) return null;
  const params = new URLSearchParams(raw);
  if (params.getAll("hash").length !== 1) return null;
  const receivedHash = params.get("hash") || "";
  const fields = [...params.entries()].filter(([key]) => key !== "hash");
  if (new Set(fields.map(([key]) => key)).size !== fields.length) return null;
  const dataCheck = fields.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = await hmac(new TextEncoder().encode(token), "WebAppData");
  if (!constantTimeEqual(toHex(await hmac(secret, dataCheck)), receivedHash)) return null;
  const authDate = Number(params.get("auth_date"));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(authDate) || authDate > now + 60 || now - authDate > MAX_INIT_DATA_AGE_SECONDS) return null;
  try {
    const user = JSON.parse(params.get("user") || "{}");
    if (!Number.isSafeInteger(user.id) || user.id <= 0) return null;
    return { id: String(user.id), firstName: typeof user.first_name === "string" ? user.first_name.slice(0, 80) : "" };
  } catch {
    return null;
  }
}

async function requireTelegramUser(request, env) {
  const raw = request.headers.get("X-Telegram-Init-Data") || "";
  return validateInitData(raw, env.TELEGRAM_BOT_TOKEN);
}

async function telegramApi(env, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Telegram ${method} failed`);
  return data.result;
}

async function ownsAccess(db, userId) {
  const row = await db.prepare("SELECT 1 AS found FROM purchases WHERE telegram_user_id = ? AND status = 'paid' LIMIT 1").bind(userId).first();
  return Boolean(row?.found);
}

async function api(request, env, url) {
  const settings = config(env);
  if (url.pathname === `${API_PREFIX}/config` && request.method === "GET") return json(settings);
  if (!env.TELEGRAM_BOT_TOKEN) return json({ error: "telegram_not_configured" }, 503);
  const user = await requireTelegramUser(request, env);
  if (!user) return json({ error: "telegram_auth_required" }, 401);

  if (url.pathname === `${API_PREFIX}/entitlement` && request.method === "POST") {
    if (!env.DB) return json({ error: "access_storage_not_configured" }, 503);
    return json({ authenticated: true, fullAccess: await ownsAccess(env.DB, user.id), firstName: user.firstName });
  }

  if (url.pathname === `${API_PREFIX}/progress` && request.method === "GET") {
    if (!env.DB) return json({ error: "progress_storage_not_configured" }, 503);
    const row = await env.DB.prepare("SELECT progress_json, updated_at FROM progress WHERE telegram_user_id = ?").bind(user.id).first();
    return json({ progress: row ? JSON.parse(row.progress_json) : null, updatedAt: row?.updated_at || null });
  }

  if (url.pathname === `${API_PREFIX}/progress` && request.method === "PUT") {
    if (!env.DB) return json({ error: "progress_storage_not_configured" }, 503);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_PROGRESS_BYTES) return json({ error: "progress_too_large" }, 413);
    const body = await request.json().catch(() => null);
    const progress = body?.progress;
    if (!progress || typeof progress !== "object" || JSON.stringify(progress).length > MAX_PROGRESS_BYTES) return json({ error: "invalid_progress" }, 400);
    const safe = {
      favorites: Array.isArray(progress.favorites) ? progress.favorites.slice(0, 40) : [],
      history: Array.isArray(progress.history) ? progress.history.slice(0, 500) : [],
      seen: Array.isArray(progress.seen) ? progress.seen.slice(-40) : [],
      today: progress.today && typeof progress.today === "object" ? progress.today : null,
      completed: Array.isArray(progress.completed) ? progress.completed.slice(0, 40) : [],
      repeat: Array.isArray(progress.repeat) ? progress.repeat.slice(0, 40) : [],
      feelings: progress.feelings && typeof progress.feelings === "object" ? progress.feelings : {},
      joy: progress.joy && typeof progress.joy === "object" ? progress.joy : {},
      reflections: progress.reflections && typeof progress.reflections === "object" ? progress.reflections : {},
      freeCycleCompleted: progress.freeCycleCompleted === true,
    };
    await env.DB.prepare("INSERT INTO progress (telegram_user_id, progress_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(telegram_user_id) DO UPDATE SET progress_json = excluded.progress_json, updated_at = CURRENT_TIMESTAMP").bind(user.id, JSON.stringify(safe)).run();
    return json({ saved: true });
  }

  if (url.pathname === `${API_PREFIX}/invoice` && request.method === "POST") {
    if (!settings.purchaseReady) return json({ error: "telegram_purchase_not_configured", message: "Покупка пока не настроена." }, 503);
    const consent = await request.json().catch(() => null);
    if (consent?.termsAccepted !== true) return json({ error: "terms_not_accepted" }, 400);
    if (await ownsAccess(env.DB, user.id)) return json({ error: "already_has_access" }, 409);
    const invoiceId = crypto.randomUUID();
    const amount = settings.starsPrice;
    const payload = `${PRODUCT_CODE}:${invoiceId}`;
    await env.DB.prepare("INSERT INTO purchases (id, telegram_user_id, invoice_payload, currency, amount_stars, status) VALUES (?, ?, ?, 'XTR', ?, 'pending')").bind(invoiceId, user.id, payload, amount).run();
    try {
      const invoiceUrl = await telegramApi(env, "createInvoiceLink", {
        title: "Для себя. Полный доступ",
        description: "Полная коллекция из 40 карточек заботы о себе.",
        payload,
        currency: "XTR",
        prices: [{ label: "Полный доступ", amount }],
      });
      return json({ invoiceUrl });
    } catch {
      await env.DB.prepare("UPDATE purchases SET status = 'failed' WHERE id = ? AND status = 'pending'").bind(invoiceId).run();
      return json({ error: "invoice_creation_failed", message: "Не удалось подготовить оплату. Попробуй позже." }, 502);
    }
  }
  return json({ error: "not_found" }, 404);
}

async function webhook(request, env) {
  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
  if (!env.TELEGRAM_WEBHOOK_SECRET || !constantTimeEqual(secret, env.TELEGRAM_WEBHOOK_SECRET)) return json({ error: "unauthorized" }, 401);
  if (!env.TELEGRAM_BOT_TOKEN || !env.DB) return json({ error: "bot_storage_not_configured" }, 503);
  const update = await request.json().catch(() => null);
  if (!update) return json({ ok: true });

  if (update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    const purchase = await env.DB.prepare("SELECT telegram_user_id, currency, amount_stars, status FROM purchases WHERE invoice_payload = ?").bind(query.invoice_payload || "").first();
    const valid = Boolean(purchase && purchase.status === "pending" && purchase.telegram_user_id === String(query.from?.id) && purchase.currency === query.currency && query.currency === "XTR" && purchase.amount_stars === query.total_amount);
    await telegramApi(env, "answerPreCheckoutQuery", { pre_checkout_query_id: query.id, ok: valid, ...(valid ? {} : { error_message: "Не удалось подтвердить заказ. Попробуй создать новый." }) });
    return json({ ok: true });
  }

  const message = update.message;
  const payment = message?.successful_payment;
  if (payment) {
    const purchase = await env.DB.prepare("SELECT id, telegram_user_id, amount_stars, currency, status FROM purchases WHERE invoice_payload = ?").bind(payment.invoice_payload || "").first();
    if (purchase && purchase.status === "pending" && purchase.telegram_user_id === String(message.from?.id) && purchase.currency === payment.currency && payment.currency === "XTR" && purchase.amount_stars === payment.total_amount) {
      await env.DB.prepare("UPDATE purchases SET status = 'paid', telegram_payment_charge_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'").bind(payment.telegram_payment_charge_id, purchase.id).run();
    }
    return json({ ok: true });
  }

  if (message?.chat?.type === "private" && /^\/(start|open)(?:\s|$)/.test(message.text || "")) {
    const appUrl = env.MINI_APP_URL;
    if (!appUrl) return json({ ok: true });
    await telegramApi(env, "sendMessage", {
      chat_id: message.chat.id,
      text: "Для себя\n\n40 карточек заботы о себе.\n\nМаленькие действия, которые помогают возвращать внимание к себе, своим желаниям, телу, красоте и удовольствию.",
      reply_markup: { inline_keyboard: [[{ text: "ОТКРЫТЬ «ДЛЯ СЕБЯ»", web_app: { url: appUrl } }]] },
    });
  } else if (message?.chat?.type === "private" && /^\/terms(?:@[^\s]+)?(?:\s|$)/.test(message.text || "")) {
    await telegramApi(env, "sendMessage", { chat_id: message.chat.id, text: env.TERMS_URL ? `Условия покупки полного доступа: ${env.TERMS_URL}` : "Продажи еще не открыты. Условия покупки будут доступны до запуска оплаты." });
  } else if (message?.chat?.type === "private" && /^\/(paysupport|support)(?:@[^\s]+)?(?:\s|$)/.test(message.text || "")) {
    await telegramApi(env, "sendMessage", { chat_id: message.chat.id, text: env.SUPPORT_CONTACT ? `По вопросам оплаты «Для себя»: ${env.SUPPORT_CONTACT}` : "Канал поддержки будет указан до запуска продаж." });
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/telegram/webhook" && request.method === "POST") return webhook(request, env);
    if (url.pathname.startsWith(API_PREFIX)) return api(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
