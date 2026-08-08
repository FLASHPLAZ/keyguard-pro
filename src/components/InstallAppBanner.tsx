import { useEffect, useState } from "react";
import { Smartphone, Apple, Download, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { supabase, supabaseUrl } from "@/integrations/supabase/client";

type Platform = "android" | "ios";

interface PublicAppInfo {
  androidAvailable: boolean;
  iosAvailable: boolean;
  version: string;
  status: string;
  message: string;
}

function detectPlatform(): Platform {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return /iPhone|iPad|iPod/i.test(ua) ? "ios" : "android";
}

const statusStyles: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  live: { label: "Available now", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", icon: CheckCircle2 },
  beta: { label: "Open beta", className: "border-primary/30 bg-primary/10 text-primary", icon: Clock },
  soon: { label: "Coming soon", className: "border-amber-500/30 bg-amber-500/10 text-amber-400", icon: Clock },
};

export function InstallAppBanner() {
  const [platform, setPlatform] = useState<Platform>("android");
  const [info, setInfo] = useState<PublicAppInfo>({ androidAvailable: false, iosAvailable: false, version: "", status: "live", message: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPlatform(detectPlatform());
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("public-settings");
        if (!mounted) return;
        const d = (data as any) || {};
        setInfo({
          androidAvailable: Boolean(d.android_available),
          iosAvailable: Boolean(d.ios_available),
          version: d.app_version || "",
          status: (d.app_release_status || "live").toLowerCase(),
          message: d.app_release_message || "",
        });
      } catch {
        /* keep defaults — button shows a friendly message */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const available = platform === "ios" ? info.iosAvailable : info.androidAvailable;
  const status = statusStyles[info.status] || statusStyles.live;
  const StatusIcon = status.icon;

  const startDownload = () => {
    if (!available) {
      toast.info(info.message || `The ${platform === "ios" ? "iOS" : "Android"} build isn't published yet — check back soon.`);
      return;
    }
    toast.success(`Starting ${platform === "ios" ? "iOS" : "Android"} download…`);
    window.location.href = `${supabaseUrl}/functions/v1/app-download?platform=${platform}`;
  };

  const options: { id: Platform; label: string; hint: string; icon: typeof Smartphone; ready: boolean }[] = [
    { id: "android", label: "Android", hint: "APK direct install", icon: Smartphone, ready: info.androidAvailable },
    { id: "ios", label: "iOS", hint: "iPhone & iPad", icon: Apple, ready: info.iosAvailable },
  ];

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Download className="h-4 w-4 text-primary" />
          Get the GX Auth mobile app
        </p>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
        {info.version && (
          <span className="rounded-full border border-border/70 bg-card/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            v{info.version}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        {info.message || "Pick your device — the download starts instantly. Manage keys, users and logs from anywhere."}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = platform === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPlatform(opt.id)}
              aria-pressed={selected}
              className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all active:scale-[0.99] ${
                selected
                  ? "border-primary bg-primary/12 shadow-[0_0_0_1px_hsl(var(--primary)/0.5)]"
                  : "border-border/70 bg-card/60 hover:border-primary/40"
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                <opt.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {opt.ready ? opt.hint : "Not published yet"}
                </span>
              </span>
              {selected && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>

      <Button onClick={startDownload} disabled={loading} className="mt-3 h-12 w-full text-sm font-semibold">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Download className="mr-1.5 h-4 w-4" />
            Download for {platform === "ios" ? "iOS" : "Android"}
          </>
        )}
      </Button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Free to install · no account needed to browse</p>
    </div>
  );
}
