import { useState, useEffect } from "react";
import { RoleLayout } from "@/components/RoleLayout";
import { PageTransition } from "@/components/PageTransition";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/license";
import { Input } from "@/components/ui/input";
import { Search, Globe, Monitor, MapPin, Download, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TablePagination } from "@/components/TablePagination";

function getActionBadge(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("login") && !lower.includes("reject")) return { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: action };
  if (lower.includes("first login") || lower.includes("hwid bound")) return { color: "bg-teal-500/15 text-teal-400 border-teal-500/20", label: action };
  if (lower.includes("banned") && !lower.includes("unbanned")) return { color: "bg-red-500/15 text-red-400 border-red-500/20", label: action };
  if (lower.includes("unbanned")) return { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", label: action };
  if (lower.includes("rejected") || lower.includes("mismatch")) return { color: "bg-red-500/15 text-red-400 border-red-500/20", label: action };
  if (lower.includes("expired")) return { color: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: action };
  if (lower.includes("rate limit")) return { color: "bg-orange-500/15 text-orange-400 border-orange-500/20", label: action };
  if (lower.includes("blacklist")) return { color: "bg-red-500/15 text-red-400 border-red-500/20", label: action };
  if (lower.includes("reset")) return { color: "bg-amber-500/15 text-amber-400 border-amber-500/20", label: action };
  if (lower.includes("disabled")) return { color: "bg-orange-500/15 text-orange-400 border-orange-500/20", label: action };
  if (lower.includes("generated") || lower.includes("created")) return { color: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: action };
  if (lower.includes("deleted")) return { color: "bg-red-500/15 text-red-400 border-red-500/20", label: action };
  if (lower.includes("settings") || lower.includes("updated")) return { color: "bg-blue-500/15 text-blue-400 border-blue-500/20", label: action };
  return { color: "bg-muted text-muted-foreground border-border", label: action };
}

const PAGE_SIZE = 25;

export default function Logs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, { username: string; email: string; role: string }>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: logsData } = await supabase
        .from("activity_logs").select("*").order("created_at", { ascending: false }).limit(1000);
      const list = logsData || [];
      setLogs(list);
      const ids = Array.from(new Set(list.map((l: any) => l.user_id).filter(Boolean)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("user_id, username, email, role").in("user_id", ids);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = p; });
        setProfileMap(map);
      }
      setLoading(false);
    })();
  }, [user]);

  const filtered = logs.filter(
    (l) =>
      (l.license_key || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.application_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.action || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.ip || "").includes(search) ||
      (l.country || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.device_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.hwid || "").toLowerCase().includes(search.toLowerCase()) ||
      (profileMap[l.user_id]?.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (profileMap[l.user_id]?.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    const headers = ["Timestamp", "Action", "By User", "Email", "Role", "License Key", "Application", "IP", "Country", "Device", "HWID"];
    const rows = filtered.map(l => [
      l.created_at,
      l.action,
      profileMap[l.user_id]?.username || "",
      profileMap[l.user_id]?.email || "",
      profileMap[l.user_id]?.role || "",
      l.license_key || "",
      l.application_name || "",
      l.ip || "",
      l.country || "",
      l.device_name || "",
      l.hwid || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_logs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <RoleLayout>
      <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
          <p className="text-sm text-muted-foreground">Track all license activity — {filtered.length} entries</p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="w-full sm:w-auto h-9 text-xs">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by key, app, action, IP, country, device..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={8} rows={8} />
      ) : (
        <>
          {/* Mobile card view */}
          <div className="block sm:hidden space-y-3">
            {paginated.length === 0 ? (
              <EmptyState icon={FileText} title="No logs found" description="Activity will appear here" />
            ) : paginated.map((log, i) => {
              const badge = getActionBadge(log.action);
              return (
                <div key={log.id} className="mobile-card animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(log.created_at)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="col-span-2"><span className="text-muted-foreground">By: </span><span className="text-foreground font-medium">{profileMap[log.user_id]?.username || "System"}</span>{profileMap[log.user_id]?.role && <span className="ml-1 text-[10px] text-muted-foreground">({profileMap[log.user_id]?.role})</span>}</div>
                    <div><span className="text-muted-foreground">Key: </span><span className="font-mono text-primary">{log.license_key ? log.license_key.slice(0, 20) + "…" : "—"}</span></div>
                    <div><span className="text-muted-foreground">App: </span><span className="text-foreground">{log.application_name || "—"}</span></div>
                    <div><span className="text-muted-foreground">IP: </span><span className="font-mono text-muted-foreground">{log.ip || "—"}</span></div>
                    <div><span className="text-muted-foreground">Country: </span><span className="text-foreground">{log.country || "—"}</span></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="table-responsive hidden sm:block">
        <div className="rounded-lg border border-border overflow-hidden min-w-[900px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <div className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> By User</div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">License Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Application</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <div className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> IP</div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Country</div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <div className="flex items-center gap-1"><Monitor className="h-3.5 w-3.5" /> Device</div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">HWID</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((log, i) => {
                const badge = getActionBadge(log.action);
                return (
                  <tr key={log.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 15}ms` }}>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {profileMap[log.user_id] ? (
                        <div className="flex flex-col">
                          <span className="text-foreground font-medium">{profileMap[log.user_id].username}</span>
                          <span className="text-[10px] text-muted-foreground">{profileMap[log.user_id].role}</span>
                        </div>
                      ) : <span className="text-muted-foreground">System</span>}
                    </td>
                    <td className="px-4 py-3 license-key text-xs">{log.license_key || "—"}</td>
                    <td className="px-4 py-3 text-foreground text-xs">{log.application_name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip || "—"}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{log.country || "—"}</td>
                    <td className="px-4 py-3 text-xs text-foreground truncate max-w-[120px]" title={log.device_name || ""}>{log.device_name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[100px]" title={log.hwid || ""}>{log.hwid ? log.hwid.slice(0, 12) + "…" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState icon={FileText} title="No logs found" description="Activity will appear here" />
          )}
        </div>
      </div>
        </>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="mt-4">
          <TablePagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
      </PageTransition>
    </RoleLayout>
  );
}
