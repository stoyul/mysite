# Время для нас

Standalone product at https://yuliastoyanova.com/time-for-us/.

`index.html`, `app.js`, `style.css`: Russian interface, local date and 4 cards per month,
season and month filters, completion marks, notes, JSON history backup and restoration.
48 original Russian card images are preserved without recompression; `cover.jpeg` is the original cover.
German and English card sets were not present in the source material.

## Deployment and isolation

The existing `mysite` Cloudflare GitHub build deploys the repository.
`wrangler.toml` uses `backend/worker.mjs` as a routing wrapper; every existing route
and the scheduled handler delegate to the unchanged `mama-backend/worker.mjs`.
Only `/time-for-us` and `/time-for-us/*` add Worker-first routing.
Backend source, tests, and this file are excluded from static assets.
There are no changes to shared styles or other product files.

## Access management

`backend/codes.mjs` is the server registry: id, SHA-256 hash, active flag.
To issue a code, choose the agreed format, calculate its SHA-256 locally, and add
one registry record. Deploy through the same GitHub build. Set active to false to
revoke a code, including its existing sessions. Keep plaintext codes out of the
frontend and public documentation. The current registry supports multiple codes.

The existing D1 binding stores separate `tfu_sessions` and `tfu_attempts` tables,
created on the first request. No existing tables are modified. Random session
tokens are stored hashed and expire after 30 days; cookies are Secure, HttpOnly,
SameSite=Strict and restricted to this product. Login attempts are limited per IP.
Protected HTML, JS and original card images require a current session and use
private, no-store cache headers. The cover and stylesheet are public.

History is local to the browser; clearing browser data deletes it. Export a copy
before changing devices. Access codes do not synchronize history.

## Validation

Node 24: `node --test time-for-us/tests/*.test.mjs`
Production bundle: `wrangler deploy --dry-run`

Seven automated tests cover date boundaries, all 48 images, filters, persistence,
login, revocation, logout, rate limits and delegation to other routes.
Live browser visual checks require an available browser policy service.
