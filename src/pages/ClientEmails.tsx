import { useEffect, useMemo, useState } from "react";
import { RoleLayout } from "@/components/RoleLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Search, Download, Copy, Users, Key, AppWindow, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/license";

type ClientLicense = {
  id: string;
  owner_email: string | null;
  owner_name: string | null;
  license_key: string;
  status: string;
  created_at: string;
  last_used: string | null;
  application_id: string;
  applications?: { name?: string | null } | null;
};

export default function ClientEmails() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ClientLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("licenses")
      .select("id, owner_email, owner_name, license_key, status, created_at, last_used, application_id, applications(name)")
      .eq("user_id", user.id)
      .not("owner_email", "is", null)
      .neq("owner_email", "")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data || []) as unknown as ClientLicense[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.owner_email?.toLowerCase().includes(q) ||
      row.owner_name?.toLowerCase().includes(q) ||
      row.license_key.toLowerCase().includes(q) ||
      row.applications?.name?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const uniqueEmails = useMemo(() => new Set(rows.map((row) => row.owner_email?.toLowerCase()).filter(Boolean)).size, [rows]);
  const uniqueApps = useMemo(() => new Set(rows.map((row) => row.application_id)).size, [rows]);
  const activeCount = rows.filter((row) => row.status === "active").length;

  const copyEmail = async (email: string) => {
    await navigator.clipboard?.writeText(email);
    toast.success("Client email copied");
  };

  const exportCsv = () => {
    const headers = ["Email", "Owner Name", "Application", "License Key", "Status", "Created", "Last Used"];
    const csvRows = filtered.map((row) => [
      row.owner_email || "",
      row.owner_name || "",
      row.applications?.name || "Unknown",
      row.license_key,
      row.status,
      row.created_at,
      row.last_used || "",
    ]);
    const csv = [headers, ...csvRows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client_emails_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} client records`);
  };

  return (
    <RoleLayout>
      <PageTransition>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <Mail className="h-5 w-5 text-primary" />
              Client Emails
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Buyer emails from your own apps and license keys only.
            </p>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="border-border/60">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unique Clients</p>
                <p className="text-2xl font-bold">{uniqueEmails}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-primary/10 p-2">
                <Key className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Client Licenses</p>
                <p className="text-2xl font-bold">{rows.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-primary/10 p-2">
                <AppWindow className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Apps With Clients</p>
                <p className="text-2xl font-bold">{uniqueApps}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Download Portal Clients</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeCount} active licenses with buyer email data.
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, app, license..."
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-secondary/20 px-4 py-10 text-center">
                <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">No client emails found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add Buyer Email while generating licenses to show users here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => row.owner_email && copyEmail(row.owner_email)}
                          className="flex max-w-[260px] items-center gap-2 text-left text-sm font-medium text-foreground hover:text-primary"
                        >
                          <span className="truncate">{row.owner_email}</span>
                          <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.owner_name || "-"}</TableCell>
                      <TableCell>{row.applications?.name || "Unknown"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{row.license_key}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "active" ? "secondary" : "outline"} className={row.status === "active" ? "text-emerald-400 border-emerald-400/30" : ""}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.last_used ? formatDate(row.last_used) : `Created ${formatDate(row.created_at)}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageTransition>
    </RoleLayout>
  );
}
