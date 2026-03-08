import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { mockStats, mockLogs, mockLicenses } from "@/lib/mock-data";
import { formatDate, getLicenseStatusColor } from "@/lib/license";
import { AppWindow, Key, CheckCircle, XCircle, Ban, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const barData = [
  { name: "Mon", validations: 45 },
  { name: "Tue", validations: 62 },
  { name: "Wed", validations: 38 },
  { name: "Thu", validations: 71 },
  { name: "Fri", validations: 55 },
  { name: "Sat", validations: 29 },
  { name: "Sun", validations: 18 },
];

const pieData = [
  { name: "Active", value: mockStats.activeLicenses, color: "hsl(142, 72%, 45%)" },
  { name: "Expired", value: mockStats.expiredLicenses, color: "hsl(0, 72%, 55%)" },
  { name: "Banned", value: mockStats.bannedLicenses, color: "hsl(38, 92%, 55%)" },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your license management system</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Apps" value={mockStats.totalApps} icon={AppWindow} change="+1 this week" changeType="positive" />
        <StatCard title="Total Licenses" value={mockStats.totalLicenses.toLocaleString()} icon={Key} change="+23 today" changeType="positive" />
        <StatCard title="Active" value={mockStats.activeLicenses} icon={CheckCircle} change="34.4%" changeType="positive" />
        <StatCard title="Expired" value={mockStats.expiredLicenses} icon={XCircle} change="47.8%" changeType="negative" />
        <StatCard title="Banned" value={mockStats.bannedLicenses} icon={Ban} change="17.7%" changeType="neutral" />
        <StatCard title="Resellers" value={mockStats.totalResellers} icon={Users} change="3 active" changeType="neutral" />
      </div>

      {/* Charts */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">License Validations (7 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
              <XAxis dataKey="name" stroke="hsl(215, 12%, 50%)" fontSize={12} />
              <YAxis stroke="hsl(215, 12%, 50%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 12%)",
                  border: "1px solid hsl(220, 14%, 18%)",
                  borderRadius: "6px",
                  color: "hsl(210, 20%, 92%)",
                }}
              />
              <Bar dataKey="validations" fill="hsl(174, 72%, 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">License Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 12%)",
                  border: "1px solid hsl(220, 14%, 18%)",
                  borderRadius: "6px",
                  color: "hsl(210, 20%, 92%)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center gap-6">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Latest Licenses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Activity</h3>
          <div className="space-y-3">
            {mockLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-md bg-secondary/30 px-3 py-2.5">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse-glow" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{log.action}</p>
                  <p className="font-mono text-xs text-muted-foreground truncate">{log.license_key}</p>
                  <p className="text-xs text-muted-foreground">{log.application} · {formatDate(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Latest Licenses</h3>
          <div className="space-y-3">
            {mockLicenses.slice(0, 5).map((lic) => (
              <div key={lic.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="license-key truncate">{lic.license_key}</p>
                  <p className="text-xs text-muted-foreground">{lic.application_name}</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLicenseStatusColor(lic.status)}`}>
                  {lic.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
