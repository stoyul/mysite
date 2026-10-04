# «ДЛЯ СЕБЯ»

Web App и устанавливаемая PWA доступны по адресу `https://yuliastoyanova.com/care/`. Telegram Mini App использует ту же оболочку по URL `https://yuliastoyanova.com/care/`; открой ее из личного чата с ботом.

## Web и PWA

- Все 40 карточек доступны в web/PWA версии. Telegram Stars показываются только внутри Telegram Mini App.
- На телефоне карточка занимает почти всю ширину экрана, сохраняет пропорцию 7:10 и открывается в увеличенном режиме.
- Выборы web/PWA сохраняются локально в браузере. Данные web-версии не объединяются с Telegram-покупками.
- PWA задает короткое название «Для себя» и полное «Для себя. 40 карточек заботы о себе». Service worker кэширует только приложение и очищает только собственные кэши с префиксом `dlya-sebya-`.

## Telegram Mini App и бот

Клиент Mini App переиспользует этот frontend: распознает Telegram WebApp, расширяет окно, учитывает стабильную высоту и safe areas, подключает BackButton и мягкую тактильную отдачу. В демо доступны Афродита, первые три карточки и один полный цикл. Лимит задается переменной `FREE_CARD_LIMIT` (значение по умолчанию 3).

Код платежного backend подготовлен в `backend/worker.js`, схема хранения — в `backend/migrations/0001_initial.sql`. Сейчас сайт продолжает публиковаться как статический сайт: Worker и Telegram API еще не подключены, поэтому бот и покупки не работают. При включении Worker цифровой доступ продается только через Telegram Stars в валюте `XTR`. Браузер не устанавливает статус оплаты: бот подтверждает `pre_checkout_query`, сохраняет `successful_payment` в D1 и только затем API возвращает право доступа.

### Что нужно настроить перед приемом оплаты

1. Создать бота через `@BotFather`, задать домен Mini App и сохранить токен в Cloudflare secret `TELEGRAM_BOT_TOKEN`.
2. Создать Cloudflare D1 базу, привязать ее к Worker под именем `DB` и применить миграцию `backend/migrations/0001_initial.sql`.
3. Добавить Worker secret `TELEGRAM_WEBHOOK_SECRET` со случайным значением.
4. Задать Worker variables `MINI_APP_URL`, `FREE_CARD_LIMIT`, `STARS_PRICE`, `TERMS_URL` и `SUPPORT_CONTACT`.
5. Включить Worker для маршрутов `/api/telegram/*` и `/telegram/webhook`, сохранив static assets binding `ASSETS`. Для этого добавить в `wrangler.toml` точный entry point `main = "care/backend/worker.js"`, `binding = "ASSETS"` и `run_worker_first = ["/api/telegram/*", "/telegram/webhook"]`; добавить D1 binding `DB` с выданным Cloudflare `database_id`.
6. После успешной сборки установить Telegram webhook на `https://yuliastoyanova.com/telegram/webhook`, передав тот же `TELEGRAM_WEBHOOK_SECRET` как `secret_token`.

Продажи остаются выключены, пока не настроены цена, хранилище, бот, страница условий покупки и контакт поддержки. Секрет бота не добавляется в frontend. Запуск покупки дополнительно требует явного согласия с условиями.

### Backend endpoints

- `GET /api/telegram/config` — лимит демо, цена и готовность оплаты.
- `POST /api/telegram/entitlement` — валидирует Telegram `initData` и восстанавливает право доступа по Telegram user ID.
- `POST /api/telegram/invoice` — создает одноразовую invoice link Telegram Stars.
- `GET /api/telegram/progress` и `PUT /api/telegram/progress` — личная синхронизация истории, любимых карточек, состояний и заметок.
- `POST /telegram/webhook` — команды `/start`, `/terms`, `/paysupport`, предварительная проверка и подтверждение оплаты.

Покупка является бессрочным доступом, а не подпиской. Сумма задается одной переменной `STARS_PRICE`. Пользовательский прогресс хранится отдельно от покупок в таблице D1 `progress`; подтверждения оплат и Telegram charge ID хранятся в таблице `purchases`.

### Карточки

Обновляй тексты в `data/cards.json`, а файлы изображений в `assets/cards/optimized/` и `assets/cards/thumbs/`. Сохраняй идентификаторы карточек (`card-01` ... `card-40`) и относительные пути изображений.

## Граница текущей настройки

Бот и база не включатся, пока владелец Cloudflare не задаст приватные secrets и D1 binding, не выберет цену в Stars и не опубликует собственные условия и контакт поддержки. Автоматическая проверка сборки этой ветки сейчас завершается ошибкой; причину можно увидеть в Cloudflare Dashboard после входа в аккаунт. Поэтому изменения еще не опубликованы на основном сайте. Исходники других страниц сайта и их URL не меняются.
