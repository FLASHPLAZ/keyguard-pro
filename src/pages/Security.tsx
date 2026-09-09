import { useEffect, useState } from "react";
import { RoleLayout } from "@/components/RoleLayout";
import { PageTransition } from "@/components/PageTransition";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/license";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Image as ImageIcon, Check, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SecurityEvent = {
  id: string;
  license_key: string | null;
  application_name: string | null;
  event_type: string;
  severity: string;
  action_taken: string;
  ip: string | null;
  country: string | null;
  device_name: string | null;
  hwid: string | null;
  evidence_path: string | null;
  evidence_scope: string | null;
  reviewed: boolean;
  created_at: string;
  details: any;
};

const severityStyles: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

function labelFor(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Security() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (severity !== "all") query = query.eq("severity", severity);
    if (reviewFilter !== "all") query = query.eq("reviewed", reviewFilter === "reviewed");
    const { data, error } = await query;
    if (error) toast.error("Could not load security alerts");
    setEvents((data as SecurityEvent[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, reviewFilter]);

  const openEvidence = async (path: string) => {
    const { data, error } = await supabase.storage.from("tamper-evidence").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      toast.error("Evidence image is not available");
      return;
    }
    setPreviewUrl(data.signedUrl);
    setPreviewOpen(true);
  };

  const markReviewed = async (id: string, reviewed: boolean) => {
    const { error } = await supabase.from("security_events").update({ reviewed }).eq("id", id);
    if (error) {
      toast.error("Could not update this alert");
      return;
    }
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, reviewed } : e)));
    toast.success(reviewed ? "Marked as reviewed" : "Marked as unreviewed");
  };

  return (
    <RoleLayout>
      <PageTransition>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Security</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tamper detections reported by your tools. Flagged keys are banned instantly and can be unbanned from Licenses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reviewFilter} onValueChange={setReviewFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All alerts</SelectItem>
                <SelectItem value="unreviewed">Unreviewed</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No security alerts"
              description="When one of your tools reports tampering, the alert and its evidence appear here."
            />
          ) : (
            <div className="table-responsive">
              <div className="min-w-[820px] overflow-hidden rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 text-left">Detection</th>
                      <th className="px-3 py-2 text-left">License</th>
                      <th className="px-3 py-2 text-left">App</th>
                      <th className="px-3 py-2 text-left">Origin</th>
                      <th className="px-3 py-2 text-left">Device</th>
                      <th className="px-3 py-2 text-left">When</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id} className="table-row-hover border-b border-border/50">
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">{labelFor(e.event_type)}</span>
                            <span
                              className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${severityStyles[e.severity] || severityStyles.low}`}
                            >
                              {e.severity}
                            </span>
                            {e.details?.message && (
                              <span className="max-w-[220px] truncate text-xs text-muted-foreground">{e.details.message}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-foreground">{e.license_key || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{e.application_name || "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {e.ip || "—"}
                          {e.country ? ` · ${e.country}` : ""}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{e.device_name || e.hwid || "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(e.created_at)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2">
                            {e.evidence_path && (
                              <Button variant="outline" size="sm" className="h-8" onClick={() => openEvidence(e.evidence_path!)}>
                                <ImageIcon className="mr-1 h-3.5 w-3.5" /> Evidence
                              </Button>
                            )}
                            <Button
                              variant={e.reviewed ? "secondary" : "default"}
                              size="sm"
                              className="h-8"
                              onClick={() => markReviewed(e.id, !e.reviewed)}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              {e.reviewed ? "Reviewed" : "Mark reviewed"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Tamper evidence</DialogTitle>
            </DialogHeader>
            {previewUrl && (
              <img src={previewUrl} alt="Captured tamper evidence screenshot" className="w-full rounded-lg border border-border/60" />
            )}
          </DialogContent>
        </Dialog>
      </PageTransition>
    </RoleLayout>
  );
}
