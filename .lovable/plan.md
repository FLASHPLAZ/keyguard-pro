
# Sequenced rollout — Slice 1 first, then 2, then 3

You picked "All three, sequenced" and "skip payments". So the roadmap is:

- **Slice 1 (this turn):** RLS audit + webhook isolation with owner+sub-user fan-out.
- **Slice 2 (next turn, after you confirm slice 1 works):** Monthly plan (features mirror Lifetime, auto-expiry on `plan_expires_at`, renewal flow, admin UI). No LTC gateway — you can wire one later.
- **Slice 3 (final turn):** API docs rebuild against `gxauth.xyz` + UX/perf/validation polish across dashboards.

Below is the detailed plan for **Slice 1 only**. I'll write fresh plans for slices 2 and 3 when we get there.

---

## Slice 1 — RLS lockdown + per-tenant webhook fan-out

### Goals

1. Every table in `public` scopes reads/writes to the acting user's tenant. No cross-tenant leaks, even for reads.
2. `notify-discord` fans out to: **owner's webhook** (always, for any action inside their tenant) + **actor's personal webhook** (if the actor is a reseller/manager and has set one). Global admin webhook stays for admin-only actions.
3. Each user (owner, reseller, manager) has their own `discord_webhook_url` setting they can manage from Settings.

### RLS audit (server side)

I'll re-run every policy on: `applications`, `licenses`, `license_ips`, `activity_logs`, `blacklist`, `resellers`, `reseller_app_credits`, `manager_permissions`, `settings`, `profiles`, `tenants`, `rate_limits`, `user_roles`.

Rules enforced everywhere:

- SELECT/INSERT/UPDATE/DELETE all gated by `public.is_tenant_member(tenant_id, auth.uid())` or `has_role(auth.uid(), 'admin')`.
- No `USING (true)` policies anywhere except `rate_limits` (server-only) and `blacklist` reads by the validate function.
- `settings` scoped strictly to `user_id = auth.uid()` so a reseller can't read the owner's webhook URL.
- `activity_logs` visible to: the actor, the tenant owner, and admins. Nothing else.
- Base-table SELECT on `profiles` restricted to self + admins; a `profiles_public` view (username only) exposed for FK joins.

Any policy that currently allows broader access will be dropped and re-created via one migration. GRANTs re-issued per table.

### Webhook fan-out changes

Edit `supabase/functions/notify-discord/index.ts`:

- Resolve the acting user's tenant (`get_user_tenant_id` or reseller/manager lookup).
- Load the tenant **owner's** `discord_webhook_url` from `settings` using service role.
- Load the **actor's** own `discord_webhook_url` (if actor ≠ owner).
- Global admin webhook only fires when `action` starts with `Admin ` or actor role = `admin`.
- Dedupe URLs, then fan out. Never mix events across tenants.

Add `src/pages/Settings.tsx` field so resellers and managers can set their own personal webhook. Owners already have it.

### Files touched

- `supabase/migrations/<new>.sql` — full policy reset for the 13 tables above, plus `GRANT`s, plus one new `profiles_public` view.
- `supabase/functions/notify-discord/index.ts` — new fan-out logic.
- `src/pages/Settings.tsx` — surface webhook field for all roles, add per-role helper text.
- `src/hooks/useManagerPermissions.ts` and reseller equivalents — no schema change, just verify UI hides admin-only fields.

### Technical details

- Migration uses `DROP POLICY IF EXISTS ... ; CREATE POLICY ...` per table so it's idempotent.
- No CHECK constraints on time; all time-based rules stay in triggers (per project rules).
- `service_role` grants preserved on every table so edge functions keep working.
- `has_role` and `is_tenant_member` are already SECURITY DEFINER — reused, no recursion risk.
- Webhook function keeps `verify_jwt = false` default; auth is enforced by validating the bearer token inline (unchanged).

### Verification before I hand off

- `supabase--linter` after the migration; fix any warnings it flags on the touched tables.
- Manual read test: signed-in reseller trying to `select * from applications` where `tenant_id != their tenant` must return 0 rows.
- Trigger one action as a reseller with both owner-webhook and reseller-webhook set; confirm both URLs receive exactly one embed each and no other tenant's webhook fires.

### Out of scope for this slice

- Monthly plan / billing cycle enforcement — slice 2.
- LTC payment gateway — skipped per your choice.
- Docs rewrite and dashboard UX polish — slice 3.

Approve this and I'll execute slice 1. When it's verified, I'll write the slice 2 plan.
