import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { formatDate } from "@/lib/license";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, CreditCard, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Resellers() {
  const { user } = useAuth();
  const [resellers, setResellers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCredits, setNewCredits] = useState(10);

  const fetchData = async () => {
    if (!user) return;
    const [resRes, appRes] = await Promise.all([
      supabase.from("resellers").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("id, name"),
    ]);
    setResellers(resRes.data || []);
    setApps(appRes.data || []);
  };

  useEffect(() => { fetchData(); }, [user]);

  const filtered = resellers.filter((r) =>
    r.username.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  const createReseller = async () => {
    if (!newUsername.trim() || !newEmail.trim() || !user) return;
    const { error } = await supabase.from("resellers").insert({
      username: newUsername.trim(),
      email: newEmail.trim(),
      credits: newCredits,
      admin_id: user.id,
    });
    if (error) { toast.error(error.message); return; }
    setNewUsername("");
    setNewEmail("");
    setNewCredits(10);
    setDialogOpen(false);
    toast.success(`Reseller "${newUsername}" created`);
    fetchData();
  };

  const addCredits = async (id: string, current: number) => {
    await supabase.from("resellers").update({ credits: current + 10 }).eq("id", id);
    toast.success("Added 10 credits");
    fetchData();
  };

  const deleteReseller = async (id: string) => {
    await supabase.from("resellers").delete().eq("id", id);
    toast.success("Reseller deleted");
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resellers</h1>
          <p className="text-sm text-muted-foreground">Manage reseller accounts and credits</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Reseller</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Create Reseller</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="bg-secondary border-border" />
              <Input placeholder="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-secondary border-border" />
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Initial Credits</label>
                <Input type="number" min={1} value={newCredits} onChange={(e) => setNewCredits(Number(e.target.value))} className="bg-secondary border-border" />
              </div>
              <Button onClick={createReseller} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search resellers..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-secondary border-border pl-10" />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Credits</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Generated</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="table-row-hover border-b border-border">
                <td className="px-4 py-3 font-medium text-foreground">{r.username}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                <td className="px-4 py-3"><span className="font-mono text-primary font-semibold">{r.credits}</span></td>
                <td className="px-4 py-3 text-foreground">{r.total_generated}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => addCredits(r.id, r.credits)} title="Add 10 credits">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteReseller(r.id)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No resellers found</div>
        )}
      </div>
    </DashboardLayout>
  );
}
