

## Plan: Request Signing (HMAC) for Anti-Tamper Protection

### How it works

Each application gets a unique **signing secret** (generated server-side, displayed once to the admin). The client uses this secret to compute an HMAC-SHA256 signature over the request payload and sends it in a header. The server verifies the signature before processing the request.

This prevents payload tampering (e.g., changing `license_key` or `hwid` in transit or via proxy) and makes it harder to reverse-engineer the validation flow.

### Changes

**1. Database: Add `signing_secret` to `applications` table**
- New column `signing_secret text` with a default random 64-char hex string
- Admin can view/regenerate in the Settings or Applications page

**2. Validate Edge Function**
- Read optional `X-Signature` and `X-Timestamp` headers
- If the application has a signing secret and `signature_required` is enabled:
  - Verify timestamp is within 60 seconds (replay protection)
  - Reconstruct the signing payload: `timestamp + "." + sorted JSON body`
  - Compute HMAC-SHA256 using the app's signing secret
  - Compare with provided signature; reject with 403 "Invalid signature" if mismatch
  - Log "Tampered request - rejected" to activity_logs and Discord
- If no signing secret is set for the app, skip check (backward compatible)

**3. Applications page: Show/regenerate signing secret**
- Display the signing secret (masked, with copy button) per application
- "Regenerate Secret" button with confirmation dialog
- Toggle to enable/disable signature requirement per app

**4. Code Snippets: Add HMAC signing to all 7 languages**
- Import HMAC-SHA256 library for each language
- Before sending request: generate timestamp, build signing string, compute HMAC
- Send `X-Signature` and `X-Timestamp` headers with the request
- Store the signing secret alongside the license key in the config/dat file

**5. API Docs: Document request signing**
- New "Request Signing" section explaining the HMAC flow
- Add `X-Signature` and `X-Timestamp` to the headers table
- Add 403 "Invalid signature" and 403 "Request expired" error codes

### Files to modify

| File | Change |
|------|--------|
| Migration SQL | Add `signing_secret` and `signature_required` to `applications` |
| `supabase/functions/validate/index.ts` | HMAC verification logic before license lookup |
| `src/data/api-code-snippets.ts` | Add HMAC signing to all 7 language snippets |
| `src/pages/ApiDocs.tsx` | Document signing headers and errors |
| `src/pages/Applications.tsx` | Show/regenerate signing secret, toggle requirement |

### Security design
- Secret is generated server-side (never user-supplied)
- Timestamp prevents replay attacks (60-second window)
- HMAC covers the entire payload so no field can be tampered
- Backward compatible: apps without signing enabled skip the check

