# GX Auth Security Audit

Date: 2026-07-20

## Scope

Reviewed the public license-validation path, database policies/migrations, API documentation, and client integration snippets. The focus was API abuse, replay attacks, license cloning, request tampering, and operational safety without deleting existing production data.

## Fixed In This Branch

- Hardened `supabase/functions/validate/index.ts`.
- Added signed request nonce enforcement with `X-Nonce`.
- Changed HMAC payload from `timestamp.body` to `timestamp.nonce.body`.
- Added constant-time signature comparison for valid-length signatures.
- Added signed success responses with `X-Response-Signature` and `X-Response-Timestamp`.
- Added request body size limits and unexpected-field rejection.
- Added UUID validation for `application_id`.
- Added license-key blacklist lookup support in the validation path.
- Added `api_nonces` storage to reject replayed signed requests.
- Added `security_events` storage for future security dashboards and alerting.
- Updated API docs, OpenAPI spec, and Python/C#/Node/C++/Go/Java/Rust snippets to use nonce signing.

## Database Additions

Migration:

- `supabase/migrations/20260720010000_api_nonce_replay_protection.sql`

Tables:

- `api_nonces`: one-time nonce storage keyed by application. Duplicate nonces are rejected.
- `security_events`: append-only security event storage for admin review and future dashboards.

Policy changes:

- `api_nonces` is service-role only.
- `security_events` can be inserted by service role and read by admins.
- `blacklist.type` now supports `ip`, `hwid`, and `license_key`.

## Validation Pipeline

Current validation flow:

1. Reject oversized or invalid JSON bodies.
2. Reject unexpected request fields.
3. Validate license key format.
4. Validate HWID and application UUID shape.
5. Check IP, HWID, and license-key blacklist.
6. Apply IP rate limit.
7. Look up license and application.
8. Reject application mismatch.
9. If signing is required:
   - Require `X-Signature`, `X-Timestamp`, and `X-Nonce`.
   - Reject invalid nonce format.
   - Reject expired timestamps.
   - Verify HMAC over `timestamp.nonce.rawBody`.
   - Store nonce and reject duplicates.
10. Reject banned, disabled, expired, or HWID-mismatched licenses.
11. Apply anti-sharing IP tracking.
12. Update successful usage and return a signed response for signed apps.

## API Signing Protocol

For signed apps, clients must send:

- `X-Timestamp`: Unix timestamp in seconds.
- `X-Nonce`: unique random value, 16-128 characters.
- `X-Signature`: lowercase hex HMAC-SHA256.

Signing payload:

```text
timestamp + "." + nonce + "." + raw_json_body
```

The JSON body string must be exactly the same bytes sent in the request.

## Deployment Notes

These changes require deployment to fully take effect:

- Apply the new Supabase migration.
- Deploy the `validate` Edge Function.
- Redeploy the website so docs/OpenAPI/snippets update.

Because the project was originally connected through Lovable and direct Supabase access is limited, the code is ready but the database/function deployment still depends on whoever controls the Supabase project.

## Remaining Recommendations

- Add per-app and per-license sliding-window rate limits, not only per IP.
- Add temporary IP bans after repeated invalid signatures or replay attempts.
- Wire `security_events` into the admin panel.
- Add a background cleanup job for expired `api_nonces`.
- Require request signing by default for newly created apps.
- Add admin session protections such as MFA, recent-login checks for dangerous actions, and audit logs for every admin mutation.
- Move Discord webhook URLs and payment secrets fully into server-side environment variables.
- Add automated tests for replay rejection, timestamp drift, blacklist behavior, and signed response verification.

## Manual Pentest Checklist

- Replay the exact same signed request twice: second request should return `409 Replay detected`.
- Modify one byte of the JSON body after signing: request should return `403 Invalid signature`.
- Send a timestamp older than 60 seconds: request should return `403 Request expired`.
- Send a duplicate nonce with a new timestamp and valid signature: request should return `409 Replay detected`.
- Validate a license from a different app UUID: request should return `403 License does not belong to this application`.
- Validate from a blacklisted IP, HWID, or license key: request should return `403 Access denied`.
