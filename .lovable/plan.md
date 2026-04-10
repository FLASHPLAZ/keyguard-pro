

## Plan: Create a "Check License" API for Client Portal

### What This Does
A new lightweight API endpoint (`/api/check-license`) that your client portal website can call. A user enters their license key, the portal sends a request, and gets back whether the key is valid plus what tool/bot it belongs to — without binding HWID or triggering anti-cheat logic.

### How It Differs From `/validate`
The existing `/validate` endpoint is designed for bots/executables — it binds HWID, tracks IPs, enforces anti-sharing, and logs activity. The new `check-license` endpoint is a **read-only lookup** for your web portal: no HWID binding, no IP tracking, just a simple validity check.

### API Design

**Endpoint:** `POST /api/check-license`

**Request Body:**
```json
{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "application": "My Bot Name",
  "status": "active",
  "expires_at": "2026-12-31T00:00:00Z",
  "expires_readable": "Dec 31, 2026 (265 days left)",
  "owner_name": "John Doe",
  "is_used": true,
  "is_banned": false
}
```

**Error Responses:**
- `400` — Missing or invalid license key
- `404` — License not found
- `403` — License is banned or app is disabled
- `410` — License expired
- `429` — Rate limited

### Implementation Steps

1. **Create new edge function** `supabase/functions/check-license/index.ts`
   - Accepts POST with `license_key` only
   - Looks up the license + joined application name
   - Returns validity status, app name, expiry, owner, and usage state
   - Includes IP-based rate limiting (reuses existing `rate_limits` table)
   - No HWID binding, no IP tracking, no activity logging

2. **Update `supabase/config.toml`** — add `[functions.check-license]` with `verify_jwt = false`

3. **Update `vercel.json`** — add rewrite rule `/api/check-license` pointing to the edge function

4. **Update `src/pages/ApiDocs.tsx`** — add documentation and code snippets for the new endpoint (JavaScript/fetch example for web portals)

### Security
- Rate limited per IP to prevent brute-force key enumeration
- Read-only — never modifies license data
- Input validation on license key format/length
- CORS enabled for web portal usage

