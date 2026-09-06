// Resolves the real end-user IP behind proxies (Vercel rewrites, Cloudflare,
// Supabase edge). Private / loopback / CGNAT addresses are skipped so logs and
// country lookups show the genuine client address instead of a proxy hop.

function isPublicIp(ip: string): boolean {
  if (!ip) return false;
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) return false;
    return true;
  }
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  if (a === 10 || a === 127 || a === 0) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 169 && b === 254) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  return true;
}

function normalize(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim().replace(/^\[|\]$/g, "").replace(/:\d+$/, (m) => (part.includes("::") ? m : "")))
    .filter(Boolean);
}

export function resolveClientIp(req: Request): string {
  // Headers set by the edge/CDN with the true client address take priority.
  for (const header of ["cf-connecting-ip", "x-real-ip", "true-client-ip", "x-client-ip"]) {
    const candidates = normalize(req.headers.get(header));
    for (const ip of candidates) if (isPublicIp(ip)) return ip;
  }

  // Then forwarded chains: first public entry is the originating client.
  for (const header of ["x-vercel-forwarded-for", "x-forwarded-for"]) {
    const candidates = normalize(req.headers.get(header));
    for (const ip of candidates) if (isPublicIp(ip)) return ip;
  }

  // Last resort: anything present, even if private, so logs are not empty.
  for (const header of ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"]) {
    const [first] = normalize(req.headers.get(header));
    if (first) return first;
  }
  return "unknown";
}
