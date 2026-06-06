let cache: Promise<{ ip: string; country: string }> | null = null;

export function getClientMeta(): Promise<{ ip: string; country: string }> {
  if (cache) return cache;
  cache = (async () => {
    try {
      const r = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(2500) });
      if (r.ok) {
        const d = await r.json();
        return { ip: d.ip || "unknown", country: d.country_name || "Unknown" };
      }
    } catch { /* ignore */ }
    return { ip: "unknown", country: "Unknown" };
  })();
  return cache;
}
