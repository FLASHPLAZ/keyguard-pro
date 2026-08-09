import { useState, useEffect, useCallback } from "react";
import { ResellerLayout } from "@/components/ResellerLayout";
import { formatDate } from "@/lib/license";
import { Input } from "@/components/ui/input";
import { Search, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TablePagination } from "@/components/TablePagination";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";

const PAGE_SIZE = 25;
const SEARCHABLE_COLUMNS = ["license_key", "application_name", "action", "ip", "hwid"];

export default function ResellerLogs() {
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
      .eq("user_id", user.id)
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

  const filtered = logs;

  return (
    <ResellerLayout>
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Track your license activity and events — {totalCount.toLocaleString()} entries
          {fetching && !loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </p>
      </div>

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by key, app, action, IP..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : (
      <div className={`table-responsive ${fetching ? "opacity-60 transition-opacity" : "transition-opacity"}`}>
        <div className="rounded-lg border border-border overflow-hidden min-w-[700px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">License Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Application</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP Address</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">HWID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id} className="table-row-hover border-b border-border animate-fade-in" style={{ animationDelay: `${i * 20}ms` }}>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3 text-foreground">{log.action}</td>
                  <td className="px-4 py-3 license-key text-xs">{log.license_key || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{log.application_name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.hwid || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState icon={FileText} title={debouncedSearch ? "No matching logs" : "No logs yet"} description={debouncedSearch ? "Try a different search term" : "Your license activity will appear here"} />
          )}
        </div>
      </div>
      )}

      {totalCount > PAGE_SIZE && (
        <div className="mt-4">
          <TablePagination currentPage={page} totalItems={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
    </ResellerLayout>
  );
}
