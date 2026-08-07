import { useEffect, useState } from "react";
import { Smartphone, Apple, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

type Platform = "android" | "ios";

function detectPlatform(): Platform {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return /iPhone|iPad|iPod/i.test(ua) ? "ios" : "android";
}

export function InstallAppBanner() {
  const [platform, setPlatform] = useState<Platform>("android");
  const [links, setLinks] = useState<{ android: string; ios: string }>({ android: "", ios: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPlatform(detectPlatform());
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("public-settings");
        if (!mounted) return;
        setLinks({
          android: (data as any)?.app_download_android || "",
          ios: (data as any)?.app_download_ios || "",
        });
      } catch {
        /* keep empty links — button shows a friendly message */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const startDownload = () => {
    const url = links[platform];
    if (!url) {
      toast.info(`The ${platform === "ios" ? "iOS" : "Android"} build isn't published yet — check back soon.`);
      return;
    }
    toast.success(`Starting ${platform === "ios" ? "iOS" : "Android"} download…`);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.rel = "noreferrer";
    anchor.target = "_blank";
    anchor.click();
  };

  const options: { id: Platform; label: string; icon: typeof Smartphone }[] = [
    { id: "android", label: "Android", icon: Smartphone },
    { id: "ios", label: "iOS", icon: Apple },
  ];

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Download className="h-4 w-4 text-primary" />
            Install the GX Auth app
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Select your device and the download starts right away — manage keys and logs on the go.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border/70 bg-card/70 p-1">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPlatform(opt.id)}
                aria-pressed={platform === opt.id}
                className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                  platform === opt.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
          <Button onClick={startDownload} disabled={loading} className="h-11 min-w-[140px] font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="mr-1.5 h-4 w-4" /> Download</>}
          </Button>
        </div>
      </div>
    </div>
  );
}