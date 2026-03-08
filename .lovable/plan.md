

## Plan: Enhanced Validate Endpoint + Code Snippets + Security

### What needs to change

**1. Validate Edge Function — Add device_name, country lookup, better expire format**

- Accept optional `device_name` field in request body (alongside `license_key` and `hwid`)
- Use IP geolocation API (free: `https://ipapi.co/{ip}/json/`) to resolve country from client IP
- Store `device_name` and `country` in `activity_logs` (requires new columns)
- Store `device_name` on the `licenses` table (new column)
- Format `expires_at` in Discord embeds as human-readable (e.g., "Mar 15, 2026 (7 days left)") instead of raw ISO timestamp
- Add Country and Device Name fields to all Discord webhook embeds
- Input validation: `device_name` max 100 chars, string type

**2. Database Migration — New columns**

- `activity_logs`: add `device_name text`, `country text`
- `licenses`: add `device_name text`

**3. Code Snippets — Add "save license key" prompt feature**

Update all language snippets (Python, C#, Node.js, C++, Go, Java, Rust) to:
- After successful validation, prompt: `"Save license key for next time? (y/n): "`
- If `y`, save key to a local file (e.g., `license.dat` or `.license`)
- On startup, check if saved file exists and auto-load the key instead of prompting
- Also send `device_name` (hostname) in the request payload
- Show human-readable expiry in console output

**4. API Docs — Update documentation**

- Add `device_name` to the request fields table
- Update response example
- Note the "save key" feature in the Quick Start guide

### Security Enhancements

- Validate `device_name` input (type, length) in edge function
- Country is derived server-side from IP (not user-supplied) — tamper-proof
- Rate limiting and anti-sharing already in place; no changes needed

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/validate/index.ts` | Accept `device_name`, geo-lookup, better embed dates |
| `src/data/api-code-snippets.ts` | All 7 language snippets: save key prompt + device name |
| `src/pages/ApiDocs.tsx` | Add `device_name` field docs |
| Migration SQL | Add columns to `activity_logs` and `licenses` |

