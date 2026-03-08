import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { mockLogs } from "@/lib/mock-data";
import { formatDate } from "@/lib/license";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Logs() {
  const [search, setSearch] = useState("");

  const filtered = mockLogs.filter(
    (l) =>
      l.license_key.toLowerCase().includes(search.toLowerCase()) ||
      l.application.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.ip.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-sm text-muted-foreground">Track all license activity and system events</p>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
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
            {filtered.map((log) => (
              <tr key={log.id} className="table-row-hover border-b border-border">
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(log.timestamp)}</td>
                <td className="px-4 py-3 text-foreground">{log.action}</td>
                <td className="px-4 py-3 license-key text-xs">{log.license_key}</td>
                <td className="px-4 py-3 text-foreground">{log.application}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.hwid}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No logs found</div>
        )}
      </div>
    </DashboardLayout>
  );
}
