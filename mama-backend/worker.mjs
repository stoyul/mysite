const APP_URL = 'https://yuliastoyanova.com/for-mama/';
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const morningMessages = [
  'Доброе утро, мамочка ❤️\nДля тебя уже готово новое послание.',
  'Мамочка, пусть утро будет тёплым 💌\nСегодняшнее послание уже ждёт тебя.',
  'Новый день — ещё одна причина улыбнуться ❤️\nОткрой маленький подарок для тебя.'
];
function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
export function localDateAndTime(zone, now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
function validZone(zone) {
  if (typeof zone !== 'string' || !zone || zone.length > 100) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; } catch { return false; }
}
export function validMonthDay(value) {
  if (!/^\d{2}-\d{2}$/.test(value)) return false;
  const [month, day] = value.split('-').map(Number);
  const d = new Date(Date.UTC(2000, month - 1, day));
  return d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}
function button(text, query = '') {
  return { text, web_app: { url: `${APP_URL}${query}` } };
}
async function hmac(key, data) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
function equal(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function authenticate(initData, token, now = Date.now()) {
  if (!initData || initData.length > 8192) return null;
  const pairs = new URLSearchParams(initData);
  if ([...pairs.keys()].some((k, i, keys) => keys.indexOf(k) !== i)) return null;
  const hash = pairs.get('hash');
  if (!/^[a-f0-9]{64}$/.test(hash || '')) return null;
  pairs.delete('hash');
  const secret = await hmac('WebAppData', token);
  const expected = await hmac(secret, [...pairs].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n'));
  const hex = [...expected].map(x => x.toString(16).padStart(2, '0')).join('');
  const age = now / 1000 - Number(pairs.get('auth_date'));
  if (!equal(hash, hex) || !Number.isFinite(age) || age < -30 || age > 86400) return null;
  try { const user = JSON.parse(pairs.get('user')); return Number.isSafeInteger(user.id) && user.id > 0 ? user : null; } catch { return null; }
}
class TelegramError extends Error {
  constructor(code, retryAfter = 0) { super(`Telegram error ${code}`); this.code = code; this.retryAfter = retryAfter; }
}
async function telegram(env, method, data) {
  // Never log request URLs: they contain the server-side bot token.
  let response;
  try { response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(15000) }); }
  catch { throw new TelegramError(0); }
  let result;
  try { result = await response.json(); } catch { throw new TelegramError(response.status || 0); }
  if (!response.ok || !result.ok) throw new TelegramError(result.error_code || response.status, result.parameters?.retry_after || 0);
  return result.result;
}
async function ensureUser(env, id) {
  const now = new Date().toISOString();
  await env.MAMA_DB.prepare('INSERT OR IGNORE INTO mama_users (telegram_id, first_launch, updated_at) VALUES (?, ?, ?)').bind(String(id), now, now).run();
  return env.MAMA_DB.prepare('SELECT * FROM mama_users WHERE telegram_id = ?').bind(String(id)).first();
}
function safeSettings(user) {
  return { settings: { reminders: Boolean(user.notifications_enabled), time: user.notification_time, timezone: user.timezone, birthday: user.birthday, specialDates: user.special_dates, importantDates: JSON.parse(user.important_dates), onboardingCompleted: Boolean(user.onboarding_completed) }, opened: JSON.parse(user.opened), favorites: JSON.parse(user.favorites), firstLaunch: user.first_launch, botStarted: Boolean(user.started_at && user.chat_id), blocked: Boolean(user.blocked) };
}
function cleanList(value, kind) {
  if (!Array.isArray(value) || value.length > 1000) throw new Error('invalid_list');
  return JSON.stringify([...new Set(value.filter(x => kind === 'favorites' ? Number.isInteger(x) && x >= 1 && x <= 365 : typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)))].slice(-1000));
}
async function readBody(request) {
  const text = await request.text();
  if (text.length > 32768) throw new Error('invalid_body');
  const b = JSON.parse(text);
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new Error('invalid_body');
  return b;
}
async function saveSettings(env, user, b, syncOnly = false) {
  const changes = {};
  if (!syncOnly) {
    if ('time' in b) { if (!timePattern.test(b.time)) throw new Error('invalid_time'); changes.notification_time = b.time; }
    if ('timezone' in b) { if (!validZone(b.timezone)) throw new Error('invalid_timezone'); changes.timezone = b.timezone; }
    if ('reminders' in b) { if (typeof b.reminders !== 'boolean') throw new Error('invalid_reminders'); changes.notifications_enabled = Number(b.reminders); }
    if ('onboardingCompleted' in b) { if (typeof b.onboardingCompleted !== 'boolean') throw new Error('invalid_onboarding'); changes.onboarding_completed = Number(b.onboardingCompleted); }
    if ('birthday' in b) {
      if (typeof b.birthday !== 'string' || (b.birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(b.birthday) || new Date(`${b.birthday}T12:00:00Z`).toISOString().slice(0, 10) !== b.birthday))) throw new Error('invalid_birthday');
      changes.birthday = b.birthday;
    }
    if ('specialDates' in b) {
      if (typeof b.specialDates !== 'string' || b.specialDates.length > 500 || b.specialDates.split(',').some(x => x.trim() && !validMonthDay(x.trim()))) throw new Error('invalid_dates');
      changes.special_dates = b.specialDates;
    }
    if ('importantDates' in b) {
      if (!Array.isArray(b.importantDates) || b.importantDates.length > 100 || b.importantDates.some(d => !d || typeof d.name !== 'string' || !d.name.trim() || d.name.length > 80 || !validMonthDay(d.date))) throw new Error('invalid_dates');
      changes.important_dates = JSON.stringify(b.importantDates.map(d => ({ name: d.name.trim(), date: d.date })));
    }
    const next = { ...user, ...changes };
    if (next.notifications_enabled && (!next.chat_id || !next.started_at || next.blocked)) throw new Error('start_required');
    if (next.notifications_enabled && !validZone(next.timezone)) throw new Error('invalid_timezone');
  }
  for (const kind of ['opened', 'favorites']) if (kind in b) changes[kind] = cleanList(b[kind], kind);
  changes.updated_at = new Date().toISOString();
  const keys = Object.keys(changes);
  await env.MAMA_DB.prepare(`UPDATE mama_users SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE telegram_id = ?`).bind(...keys.map(k => changes[k]), user.telegram_id).run();
  return safeSettings(await ensureUser(env, user.telegram_id));
}
async function handleTelegram(env, update) {
  if (update.my_chat_member?.chat?.type === 'private') {
    const event = update.my_chat_member;
    const blocked = ['kicked', 'left'].includes(event.new_chat_member.status);
    await env.MAMA_DB.prepare('UPDATE mama_users SET blocked = ? WHERE chat_id = ?').bind(Number(blocked), String(event.chat.id)).run();
    return;
  }
  const message = update.message;
  if (message?.chat?.type === 'private' && message.from?.id) {
    await ensureUser(env, message.from.id);
    const command = (message.text || '').trim().split(/\s/)[0].split('@')[0];
    if (command === '/start') {
      await env.MAMA_DB.prepare('UPDATE mama_users SET chat_id = ?, started_at = ?, blocked = 0 WHERE telegram_id = ?').bind(String(message.chat.id), new Date().toISOString(), String(message.from.id)).run();
      await telegram(env, 'sendMessage', { chat_id: String(message.chat.id), text: 'Мамочка ❤️\n\nЗдесь тебя каждый день будет ждать маленькое послание, созданное с любовью.\n\nЯ хочу, чтобы каждый день у тебя была маленькая причина улыбнуться.', disable_notification: false, reply_markup: { inline_keyboard: [[button('💌 Перейти в приложение')]] } });
    } else if (command === '/today') {
      await telegram(env, 'sendMessage', { chat_id: String(message.chat.id), text: 'Твоё послание на сегодня уже готово 💌', disable_notification: false, reply_markup: { inline_keyboard: [[button('💌 Открыть послание', '?open=today')]] } });
    } else if (['/settings', '/pause', '/resume'].includes(command)) {
      if (command === '/pause') await env.MAMA_DB.prepare('UPDATE mama_users SET notifications_enabled = 0 WHERE telegram_id = ?').bind(String(message.from.id)).run();
      // Resume through settings so the time and zone are explicitly confirmed.
      await telegram(env, 'sendMessage', { chat_id: String(message.chat.id), text: command === '/pause' ? 'Утренние послания выключены. Включить их снова можно в настройках ❤️' : 'Выбери удобное время для ежедневного послания ❤️', reply_markup: { inline_keyboard: [[button('Настройки 💌', '?view=settings')]] } });
    }
  }
}
async function markBlocked(env, user) {
  await env.MAMA_DB.prepare('UPDATE mama_users SET blocked = 1, notifications_enabled = 0 WHERE telegram_id = ?').bind(user.telegram_id).run();
}
async function deliver(env, user, date, kind, now) {
  const nowMs = now.getTime(), lease = crypto.randomUUID();
  // Unique row and atomic lease protect against overlapping scheduled invocations.
  await env.MAMA_DB.prepare('INSERT OR IGNORE INTO mama_deliveries (telegram_id, local_date, kind) VALUES (?, ?, ?)').bind(user.telegram_id, date, kind).run();
  const claimed = await env.MAMA_DB.prepare("UPDATE mama_deliveries SET status = ?, lease_until = ?, attempts = attempts + 1 WHERE telegram_id = ? AND local_date = ? AND kind = ? AND status != 'sent' AND status != 'failed' AND lease_until <= ? AND retry_at <= ? RETURNING attempts").bind(lease, nowMs + 90000, user.telegram_id, date, kind, nowMs, nowMs).first();
  if (!claimed) return false;
  try {
    const message = await telegram(env, 'sendMessage', { chat_id: user.chat_id, text: kind === 'scheduled-test' ? 'Проверка расписания ❤️\nЭто послание пришло по серверному расписанию, даже когда приложение закрыто.' : morningMessages[Number(date.replaceAll('-', '')) % morningMessages.length], disable_notification: false, reply_markup: { inline_keyboard: [[button('💌 Открыть послание', '?open=today')]] } });
    await env.MAMA_DB.prepare("UPDATE mama_deliveries SET status = 'sent', message_id = ?, sent_at = ?, lease_until = 0 WHERE telegram_id = ? AND local_date = ? AND kind = ? AND status = ?").bind(message.message_id, now.toISOString(), user.telegram_id, date, kind, lease).run();
    return true;
  } catch (error) {
    if (error.code === 403) await markBlocked(env, user);
    const terminal = [400, 401, 403].includes(error.code) || claimed.attempts >= 5;
    await env.MAMA_DB.prepare('UPDATE mama_deliveries SET status = ?, error_code = ?, retry_at = ?, lease_until = 0 WHERE telegram_id = ? AND local_date = ? AND kind = ? AND status = ?').bind(terminal ? 'failed' : 'pending', error.code || 0, nowMs + Math.max(60, error.retryAfter || 0, 30 * 2 ** claimed.attempts) * 1000, user.telegram_id, date, kind, lease).run();
    console.error(JSON.stringify({ event: 'mama_delivery_failed', kind, code: error.code || 0 }));
    return false;
  }
}
export async function runDaily(env, now = new Date()) {
  let sent = 0, cursor = '';
  // Paginate instead of truncating the recipient list.
  while (true) {
    const { results } = await env.MAMA_DB.prepare('SELECT * FROM mama_users WHERE notifications_enabled = 1 AND onboarding_completed = 1 AND blocked = 0 AND chat_id IS NOT NULL AND started_at IS NOT NULL AND telegram_id > ? ORDER BY telegram_id LIMIT 100').bind(cursor).all();
    for (const user of results) {
      if (!validZone(user.timezone)) continue;
      const local = localDateAndTime(user.timezone, now);
      // Catch up missed cron minutes after a deployment, within this local day.
      if (local.time >= user.notification_time && await deliver(env, user, local.date, 'daily', now)) sent++;
    }
    if (results.length < 100) break;
    cursor = results.at(-1).telegram_id;
  }
  const { results: tests } = await env.MAMA_DB.prepare("SELECT d.*, u.chat_id, u.blocked FROM mama_deliveries d JOIN mama_users u USING (telegram_id) WHERE d.kind = 'scheduled-test' AND d.status != 'sent' AND d.status != 'failed' AND d.retry_at <= ?").bind(now.getTime()).all();
  for (const test of tests) if (test.chat_id && !test.blocked && await deliver(env, test, test.local_date, test.kind, now)) sent++;
  await env.MAMA_DB.prepare("INSERT INTO mama_runtime (key, value) VALUES ('last_cron', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify({ at: now.toISOString(), sent })).run();
  return sent;
}
async function api(request, env, route) {
  const auth = await authenticate(request.headers.get('x-telegram-init-data'), env.BOT_TOKEN);
  if (!auth) return json({ error: 'Открой приложение через Telegram-бота.' }, 401);
  const user = await ensureUser(env, auth.id);
  if (route === 'settings' && request.method === 'GET') return json(safeSettings(user));
  if (['settings', 'sync'].includes(route) && request.method === 'POST') {
    try { return json(await saveSettings(env, user, await readBody(request), route === 'sync')); }
    catch (error) { return json({ error: error.message === 'start_required' ? 'Нажми «Начать» в чате бота, затем вернись сюда.' : 'Проверь время, часовой пояс и важные даты.' }, 400); }
  }
  if (['test-notification', 'scheduled-test'].includes(route) && request.method === 'POST') {
    if (!user.started_at || !user.chat_id || user.blocked) return json({ error: 'Нажми «Начать» в чате бота, затем вернись сюда.' }, 409);
    const now = Date.now();
    const locked = await env.MAMA_DB.prepare('UPDATE mama_users SET last_test_at = ? WHERE telegram_id = ? AND last_test_at <= ? RETURNING telegram_id').bind(now, user.telegram_id, now - 30000).first();
    if (!locked) return json({ error: 'Подожди полминуты перед новой проверкой.' }, 429);
    if (route === 'scheduled-test') {
      const key = new Date(now).toISOString();
      await env.MAMA_DB.prepare("INSERT INTO mama_deliveries (telegram_id, local_date, kind, retry_at) VALUES (?, ?, 'scheduled-test', ?)").bind(user.telegram_id, key, now + 120000).run();
      return json({ scheduled: true, dueAt: new Date(now + 120000).toISOString() });
    }
    try {
      const message = await telegram(env, 'sendMessage', { chat_id: user.chat_id, text: 'Всё работает ❤️\nТеперь я смогу напоминать тебе о новом послании.', disable_notification: false, reply_markup: { inline_keyboard: [[button('💌 Открыть послание', '?open=today')]] } });
      return json({ sent: true, messageId: message.message_id });
    } catch (error) {
      if (error.code === 403) await markBlocked(env, user);
      return json({ error: error.code === 403 ? 'Разблокируй бота и нажми «Начать» в его чате.' : 'Telegram не принял сообщение. Попробуй ещё раз чуть позже.' }, 502);
    }
  }
  if (route === 'notification-status' && request.method === 'GET') {
    const { results } = await env.MAMA_DB.prepare('SELECT local_date, kind, status, message_id, error_code, sent_at FROM mama_deliveries WHERE telegram_id = ? ORDER BY local_date DESC LIMIT 10').bind(user.telegram_id).all();
    const cron = await env.MAMA_DB.prepare("SELECT value FROM mama_runtime WHERE key = 'last_cron'").first();
    return json({ deliveries: results.map(d => ({ ...d, status: !['pending', 'sent', 'failed'].includes(d.status) ? 'sending' : d.status })), lastCron: cron ? JSON.parse(cron.value) : null });
  }
  return json({ error: 'Not found' }, 404);
}
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const apiRoute = path.match(/^\/for-mama\/api\/([^/]+)$/);
    if (!apiRoute && path !== '/telegram/webhook') return env.ASSETS.fetch(request);
    if (!env.MAMA_DB || !env.BOT_TOKEN || !env.WEBHOOK_SECRET) return json({ error: 'Сервер посланий ещё настраивается. Попробуй позже.' }, 503);
    try {
      if (apiRoute) return await api(request, env, apiRoute[1]);
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      if (!equal(request.headers.get('x-telegram-bot-api-secret-token') || '', env.WEBHOOK_SECRET)) return json({ error: 'Forbidden' }, 403);
      await handleTelegram(env, await readBody(request));
      return json({ ok: true });
    } catch { console.error('mama_request_failed'); return json({ error: 'Не удалось связаться с сервером посланий. Попробуй позже.' }, 500); }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runDaily(env, new Date(controller.scheduledTime)));
  }
};
