## Goal

Turn the current admin/reseller/manager license dashboard into a **public KeyAuth-style SaaS** where anyone can sign up, create their own apps, and ship a full auth/license system to their software — all on `license.galacticboosts.online`.

## What changes vs today

Today: closed system, only `gamingraj7069@gmail.com` is admin, others are resellers under that admin.
Future: every signup becomes a **tenant owner** ("seller") with their own apps, licenses, app-users, variables, files, chat, webhooks, and resellers/managers nested under them. Existing admin keeps a separate **platform owner** view to oversee all tenants.

---

## 1. Public marketing site (new)

Root `/` becomes a landing page (login moves elsewhere).

- **Hero** — "License & auth system for your bots, tools, and software" + Sign Up / Sign In CTAs
- **Features grid** — Licenses, App Users, Variables, Files, Webhooks, Chat, Anti-share, HWID, Discord
- **How it works** — 3 steps (signup → create app → integrate API)
- **Live API demo** — interactive playground that calls `/api/check-license`
- **Code snippets carousel** — Python / C# / Node / C++ / Go (reuses `api-code-snippets.ts`)
- **Pricing teaser** — "Free during beta" badge (no Stripe yet)
- **Public docs** at `/docs` (move parts of current `ApiDocs.tsx`)
- **Footer** — links, Discord, status

New routes: `/`, `/docs`, `/signup`, `/login`. Existing app moves to `/dashboard/*`.

---

## 2. Self-serve signup + tenant model

- Open public signup (email+password, plus Google OAuth via Lovable Cloud)
- Email verification ON (no auto-confirm) — secure default
- Every new user → role `seller` (new role) with their own isolated workspace
- Existing `admin` role becomes **platform_admin** (you, oversight only)
- `reseller` and `manager` roles still exist but are now scoped under each seller

A new `tenants` table groups all data per signup. Every existing table (`applications`, `licenses`, `resellers`, etc.) gets a `tenant_id` and RLS rewritten so sellers only see their own data.

---

## 3. New KeyAuth-style features

### A. App Users (login from your software)

End-users of YOUR customers' software log in with username/password — not just license keys.

- `app_users` table (per application: username, password_hash, hwid, expires_at, banned, subscription_tier)
- New endpoint `/api/auth/register` — license-key → creates user account
- New endpoint `/api/auth/login` — username+password → session token
- New endpoint `/api/auth/session` — verify session token, return user info
- `app_user_sessions` table for token tracking + heartbeat

### B. Subscription tiers per app

- `app_subscriptions` table (name, level, duration_days)
- License keys and app_users can be assigned a tier
- `/api/check-license` and `/api/auth/login` return active tier(s)
- Sellers manage tiers from `/dashboard/apps/:id/subscriptions`

### C. Variables / Secrets API

- `app_variables` table (app_id, name, value, secret bool, min_subscription_level)
- `/api/variables/get` — bot fetches secret strings at runtime, gated by valid license + tier
- Sellers manage in `/dashboard/apps/:id/variables`

### D. Webhooks (per-app)

- `app_webhooks` table (event types: license.validated, license.banned, user.login, user.register, hwid.reset)
- Outbound POSTs with HMAC signature header
- New edge function `dispatch-webhook` (fire-and-forget, retry on 5xx)
- Sellers configure in `/dashboard/apps/:id/webhooks`
- Replaces today's hardcoded Discord webhook (Discord becomes one of many destinations)

### E. Chat / messages API

- `app_channels` table + `app_messages` table
- `/api/chat/send` and `/api/chat/list` — only valid app_users can post/read
- Min subscription tier per channel
- Realtime via Supabase Realtime subscriptions

---

## 4. Seller dashboard (rebuild of current admin UI)

New layout at `/dashboard/*` for sellers:

- `/dashboard` — overview (apps count, total licenses, validations today, recent webhook deliveries)
- `/dashboard/apps` — CRUD apps
- `/dashboard/apps/:id` — tabs: Licenses · App Users · Subscriptions · Variables · Webhooks · Chat · Sessions · Settings · Integration code
- `/dashboard/resellers` — seller's own resellers (existing system, scoped to tenant)
- `/dashboard/managers` — seller's own managers
- `/dashboard/logs` — activity logs filtered to tenant
- `/dashboard/settings` — profile, API keys, Discord webhook, billing placeholder
- `/dashboard/billing` — "Free during beta" placeholder for future Stripe

Existing pages get refactored — keep look & feel, swap `admin`-scoped queries for `tenant`-scoped.

### Platform admin

You retain a `/admin/*` super-view: list all tenants, suspend tenants, view global stats, kill-switch any app. Hidden from regular sellers.

---

## 5. API expansion

Existing endpoints stay (`/api/validate`, `/api/heartbeat`, `/api/reset-hwid`, `/api/check-license`).
New endpoints (all rate-limited, CORS, HMAC-optional):

```
POST /api/auth/register          create app_user from license key
POST /api/auth/login             username+password → session token
POST /api/auth/session           verify session
POST /api/auth/logout
POST /api/variables/get          fetch app variable (gated)
POST /api/chat/send
POST /api/chat/list
POST /api/files/download         signed URL for protected file (future, schema only for now)
```

Each app gets a public `app_id` + optional `signing_secret` (already exists). Sellers see a per-app integration page with copy-paste snippets for every endpoint.

---

## 6. Database changes (high level)

New tables:

- `tenants` (id, owner_user_id, name, plan, suspended, created_at)
- `app_users` (id, app_id, username, password_hash, hwid, expires_at, subscription_id, banned)
- `app_user_sessions` (token, app_user_id, expires_at, last_seen)
- `app_subscriptions` (id, app_id, name, level, duration_days)
- `app_variables` (id, app_id, name, value, is_secret, min_level)
- `app_webhooks` (id, app_id, url, events[], secret, active)
- `webhook_deliveries` (id, webhook_id, event, status, response_code, created_at)
- `app_channels` (id, app_id, name, min_level)
- `app_messages` (id, channel_id, app_user_id, body, created_at)

Schema changes to existing tables:

- Add `tenant_id` to: `applications`, `licenses`, `resellers`, `manager_permissions`, `activity_logs`, `blacklist`, `settings`
- New enum value `seller` on `app_role`
- Backfill: every existing app/license assigned to current admin's tenant
- All RLS rewritten around `tenant_id` via new `is_tenant_member(_tenant_id, _user_id)` security-definer function

`handle_new_user()` trigger updated: every new signup creates a tenant + assigns `seller` role (admin email keeps `platform_admin`).

---

## 7. Auth changes

- Enable Google OAuth (Lovable Cloud managed)
- Email verification REQUIRED (turn off auto-confirm)
- Add `/forgot-password` and `/reset-password` pages
- Add `/verify-email` landing page

---

## 8. Build order (suggested batches — implement one at a time)

Because this is huge, I recommend splitting into batches and implementing one per message:

1. **Batch A — Tenant foundation**: tenants table, schema migration, RLS rewrite, `seller` role, signup flow, landing page + new routing structure.
2. **Batch B — Seller dashboard refactor**: move admin pages to `/dashboard/*`, scope queries to tenant, platform admin separation.
3. **Batch C — App Users system**: tables + 4 auth endpoints + UI tab on app detail page.
4. **Batch D — Subscriptions + Variables**: tier table, variables table, gated API, UI tabs.
5. **Batch E — Webhooks system**: tables, dispatcher edge function, deliveries log UI.
6. **Batch F — Chat/messages**: tables, send/list endpoints, realtime UI.
7. **Batch G — Public landing polish + docs site + integration code per-app**.
8. **Batch H — (later) Files API, Stripe billing**.

---

## 9. Things explicitly OUT of scope (for now, per your answers)

- Payments / Stripe billing (placeholder only — "Free during beta")
- File hosting (schema groundwork only, no UI)
- Custom branded subdomains per seller
- Mobile apps / SDKs (keep code snippets only)

---

## Technical notes

- Stack stays React + Vite + Tailwind + shadcn + Lovable Cloud (Supabase)
- All new edge functions: `verify_jwt = false`, in-code auth, CORS, IP rate limiting via existing `rate_limits` table
- App-user passwords hashed with bcrypt inside edge function (deno bcrypt)
- Session tokens: random 32-byte hex, stored hashed
- Webhook HMAC: SHA-256 of `timestamp.body` with per-webhook secret
- Realtime: enable on `app_messages` only, scoped via RLS
- Vercel `vercel.json` rewrites extended for every new `/api/*` route
- Keep current visual design language; just expand it

---

## Confirm before I start

This plan is large. Reply **"start with Batch A"** (or any batch) and I'll implement just that batch in the next message. Doing it batch-by-batch keeps each change reviewable and avoids breaking the live site. 

I just wanted to tell that the apps I created and I'm using don't remove that keep them cause I'm still using the all on my admin account. Also don't delete my license key to

&nbsp;