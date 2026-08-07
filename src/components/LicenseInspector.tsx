import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, getLicenseStatusColor } from "@/lib/license";
import { Globe, Activity, Cpu, Copy } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface LicenseInspectorProps {
  license: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 py-2 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right text-foreground break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export function LicenseInspector({ license, open, onOpenChange }: LicenseInspectorProps) {
  const [ips, setIps] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !license) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [ipRes, logRes] = await Promise.all([
        supabase.from("license_ips").select("*").eq("license_id", license.id).order("last_seen", { ascending: false }).limit(25),
        supabase.from("activity_logs").select("*").eq("license_key", license.license_key).order("created_at", { ascending: false }).limit(25),
      ]);
      if (cancelled) return;
      setIps(ipRes.data || []);
      setLogs(logRes.data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, license?.id]);

  if (!license) return null;

  const copy = () => {
    navigator.clipboard.writeText(license.license_key)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy key"));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-base">License Inspector</SheetTitle>
        </SheetHeader>

        <button onClick={copy} className="mt-4 flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2.5 text-left transition-colors hover:bg-secondary/40">
          <span className="license-key text-xs break-all">{license.license_key}</span>
          <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLicenseStatusColor(license.status)}`}>
            {license.status}
          </span>
          {(license.tags || []).map((t: string) => (
            <Badge key={t} variant="outline" className="text-[10px] border-primary/30 text-primary">{t}</Badge>
          ))}
        </div>

        <div className="mt-4">
          <Row label="Application" value={license.applications?.name || "Unknown"} />
          <Row label="Owner" value={license.owner_name || "—"} />
          <Row label="Owner email" value={license.owner_email || "—"} />
          <Row label="Reseller" value={license.resellers?.username || "—"} />
          <Row label="HWID" value={license.hwid || "Not bound"} mono />
          <Row label="Last IP" value={license.last_seen_ip || license.ip || "—"} mono />
          <Row label="Country" value={license.last_seen_country || "—"} />
          <Row label="Device" value={license.device_name || "—"} />
          <Row label="Last seen" value={license.last_seen ? formatDate(license.last_seen) : "Never"} />
          <Row label="Created" value={formatDate(license.created_at)} />
          <Row label="Expires" value={formatDate(license.expires_at)} />
          {license.notes && <Row label="Notes" value={license.notes} />}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">IP history ({ips.length})</h4>
          </div>
          {loading && <Skeleton className="h-16 w-full rounded-lg" />}
          {!loading && ips.length === 0 && <p className="text-xs text-muted-foreground">No recorded IPs yet.</p>}
          <div className="space-y-1.5">
            {!loading && ips.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg bg-secondary/20 px-3 py-2 text-xs">
                <span className="font-mono text-foreground">{row.ip}</span>
                <span className="text-muted-foreground">{formatDate(row.last_seen)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Recent activity</h4>
          </div>
          {loading && <Skeleton className="h-16 w-full rounded-lg" />}
          {!loading && logs.length === 0 && <p className="text-xs text-muted-foreground">No activity recorded for this key.</p>}
          <div className="space-y-1.5">
            {!loading && logs.map((log) => (
              <div key={log.id} className="rounded-lg bg-secondary/20 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">{log.action}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(log.created_at)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  {log.ip && <span className="font-mono">{log.ip}</span>}
                  {log.country && <span>· {log.country}</span>}
                  {log.hwid && <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {log.hwid.slice(0, 10)}…</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}