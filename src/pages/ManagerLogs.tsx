import { useState, useEffect, useCallback } from "react";
import { ManagerLayout } from "@/components/ManagerLayout";
import { formatDate } from "@/lib/license";
import { Input } from "@/components/ui/input";
import { Search, Globe, Monitor, MapPin, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TablePagination } from "@/components/TablePagination";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";

function getActionBadge(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("tool online")) return { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", label: action };
  if (lower.includes("heartbeat — active")) return { color: "bg-teal-500/15 text-teal-400 border-teal-500/20", label: action };
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
const SEARCHABLE_COLUMNS = ["license_key", "application_name", "action", "ip", "country", "device_name", "hwid"];

export default function ManagerLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    let q = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (debouncedSearch) {
      const escaped = debouncedSearch.replace(/[%,()]/g, "");
      if (escaped) q = q.or(SEARCHABLE_COLUMNS.map((c) => `${c}.ilike.%${escaped}%`).join(","));
    }
    const from = (page - 1) * PAGE_SIZE;
    const { data, count } = await q.range(from, from + PAGE_SIZE - 1);
    setLogs(data || []);
    setTotalCount(count ?? (data || []).length);
    setLoading(false);
    setFetching(false);
  }, [user, debouncedSearch, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const paginated = logs;

  return (
    <ManagerLayout>
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          View all license activity (read-only) — {totalCount.toLocaleString()} entries
          {fetching && !loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </p>
      </div>

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by key, app, action, IP, country, device..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={8} rows={8} />
      ) : (
      <div className={`table-responsive ${fetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
        <div className="rounded-lg border border-border overflow-hidden min-w-[900px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">License Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Application</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground"><div className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> IP</div></th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground"><div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Country</div></th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground"><div className="flex items-center gap-1"><Monitor className="h-3.5 w-3.5" /> Device</div></th>
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
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>{badge.label}</span>
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
          {paginated.length === 0 && (
            <EmptyState icon={FileText} title={debouncedSearch ? "No matching logs" : "No logs yet"} description={debouncedSearch ? "Try a different search term" : "Activity will appear here as licenses are used"} />
          )}
        </div>
      </div>
      )}

      {totalCount > PAGE_SIZE && (
        <div className="mt-4">
          <TablePagination currentPage={page} totalItems={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
    </ManagerLayout>
  );
}
