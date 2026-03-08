import { DashboardLayout } from "@/components/DashboardLayout";
import { Bot, Copy, CheckCircle, Terminal, Shield, Zap, MessageSquare, Code2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

const pythonBot = `import discord
from discord.ext import commands
import requests
import os

# ─── Configuration ───
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "YOUR_BOT_TOKEN")
API_BASE = "${API_BASE}"
ADMIN_AUTH_TOKEN = os.getenv("ADMIN_AUTH_TOKEN", "YOUR_SUPABASE_AUTH_TOKEN")

bot = commands.Bot(command_prefix="!", intents=discord.Intents.default())

@bot.event
async def on_ready():
    print(f"✅ Bot is online as {bot.user}")

@bot.command(name="reset")
async def reset_hwid(ctx, license_key: str = None):
    """Reset HWID for a license key. Usage: !reset GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"""
    if not license_key:
        embed = discord.Embed(
            title="❌ Missing License Key",
            description="Usage: \`!reset GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX\`",
            color=0xff0000
        )
        await ctx.send(embed=embed)
        return

    try:
        response = requests.post(
            f"{API_BASE}/reset-hwid",
            json={"license_key": license_key},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {ADMIN_AUTH_TOKEN}"
            },
            timeout=10
        )
        data = response.json()

        if response.status_code == 200 and data.get("success"):
            embed = discord.Embed(
                title="✅ HWID Reset Successful",
                color=0x00ff00
            )
            embed.add_field(name="License Key", value=f"\`{license_key}\`", inline=False)
            embed.add_field(name="Previous HWID", value=f"\`{data.get('previous_hwid', 'N/A')}\`", inline=True)
            embed.set_footer(text="Galactic Boosts")
        else:
            embed = discord.Embed(
                title="❌ Reset Failed",
                description=data.get("error", "Unknown error"),
                color=0xff0000
            )
            embed.add_field(name="License Key", value=f"\`{license_key}\`", inline=False)

        await ctx.send(embed=embed)

    except Exception as e:
        embed = discord.Embed(
            title="⚠️ Error",
            description=f"Could not connect to API: {str(e)}",
            color=0xff6600
        )
        await ctx.send(embed=embed)

@bot.command(name="check")
async def check_license(ctx, license_key: str = None):
    """Check license status. Usage: !check GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"""
    if not license_key:
        embed = discord.Embed(
            title="❌ Missing License Key",
            description="Usage: \`!check GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX\`",
            color=0xff0000
        )
        await ctx.send(embed=embed)
        return

    try:
        response = requests.post(
            f"{API_BASE}/validate",
            json={"license_key": license_key},
            timeout=10
        )
        data = response.json()

        if data.get("valid"):
            embed = discord.Embed(title="✅ License Valid", color=0x00ff00)
            embed.add_field(name="Key", value=f"\`{license_key}\`", inline=False)
            embed.add_field(name="App", value=data.get("app", "N/A"), inline=True)
            embed.add_field(name="Expires", value=data.get("expires_readable", "N/A"), inline=True)
            embed.add_field(name="HWID", value=f"\`{data.get('hwid', 'Not bound')}\`", inline=True)
        else:
            embed = discord.Embed(title="❌ License Invalid", color=0xff0000)
            embed.add_field(name="Key", value=f"\`{license_key}\`", inline=False)
            embed.add_field(name="Reason", value=data.get("error", "Unknown"), inline=True)

        await ctx.send(embed=embed)

    except Exception as e:
        embed = discord.Embed(
            title="⚠️ Error",
            description=f"Could not connect to API: {str(e)}",
            color=0xff6600
        )
        await ctx.send(embed=embed)

bot.run(BOT_TOKEN)`;

const nodejsBot = `const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

// ─── Configuration ───
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "YOUR_BOT_TOKEN";
const API_BASE = "${API_BASE}";
const ADMIN_AUTH_TOKEN = process.env.ADMIN_AUTH_TOKEN || "YOUR_SUPABASE_AUTH_TOKEN";
const PREFIX = "!";

const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
]});

client.on("ready", () => console.log(\`✅ Bot is online as \${client.user.tag}\`));

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (command === "reset") {
    const licenseKey = args[0];
    if (!licenseKey) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Missing License Key")
        .setDescription("Usage: \`!reset GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX\`")
        .setColor(0xff0000);
      return message.reply({ embeds: [embed] });
    }

    try {
      const res = await fetch(\`\${API_BASE}/reset-hwid\`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${ADMIN_AUTH_TOKEN}\`,
        },
        body: JSON.stringify({ license_key: licenseKey }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const embed = new EmbedBuilder()
          .setTitle("✅ HWID Reset Successful")
          .addFields(
            { name: "License Key", value: \`\\\`\${licenseKey}\\\`\`, inline: false },
            { name: "Previous HWID", value: \`\\\`\${data.previous_hwid || "N/A"}\\\`\`, inline: true },
          )
          .setColor(0x00ff00)
          .setFooter({ text: "Galactic Boosts" });
        message.reply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle("❌ Reset Failed")
          .setDescription(data.error || "Unknown error")
          .addFields({ name: "License Key", value: \`\\\`\${licenseKey}\\\`\` })
          .setColor(0xff0000);
        message.reply({ embeds: [embed] });
      }
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Error")
        .setDescription(\`Could not connect to API: \${err.message}\`)
        .setColor(0xff6600);
      message.reply({ embeds: [embed] });
    }
  }

  if (command === "check") {
    const licenseKey = args[0];
    if (!licenseKey) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Missing License Key")
        .setDescription("Usage: \`!check GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX\`")
        .setColor(0xff0000);
      return message.reply({ embeds: [embed] });
    }

    try {
      const res = await fetch(\`\${API_BASE}/validate\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: licenseKey }),
      });
      const data = await res.json();

      if (data.valid) {
        const embed = new EmbedBuilder()
          .setTitle("✅ License Valid")
          .addFields(
            { name: "Key", value: \`\\\`\${licenseKey}\\\`\`, inline: false },
            { name: "App", value: data.app || "N/A", inline: true },
            { name: "Expires", value: data.expires_readable || "N/A", inline: true },
            { name: "HWID", value: \`\\\`\${data.hwid || "Not bound"}\\\`\`, inline: true },
          )
          .setColor(0x00ff00);
        message.reply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle("❌ License Invalid")
          .addFields(
            { name: "Key", value: \`\\\`\${licenseKey}\\\`\`, inline: false },
            { name: "Reason", value: data.error || "Unknown", inline: true },
          )
          .setColor(0xff0000);
        message.reply({ embeds: [embed] });
      }
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Error")
        .setDescription(\`Could not connect to API: \${err.message}\`)
        .setColor(0xff6600);
      message.reply({ embeds: [embed] });
    }
  }
});

client.login(BOT_TOKEN);`;

export default function BotGuide() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedText(label);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedText(null), 1500);
  };

  const CopyBtn = ({ code, label }: { code: string; label: string }) => (
    <button
      onClick={() => copyCode(code, label)}
      className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors shrink-0"
    >
      {copiedText === label ? <><CheckCircle className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" /> Discord HWID Reset Bot Guide
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Set up a Discord bot to let users reset their HWID and check license status</p>
      </div>

      {/* Overview */}
      <div className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
          <Zap className="h-5 w-5 text-primary" /> Overview
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          This guide walks you through creating a Discord bot that connects to your Galactic Boosts API.
          Users can run commands to reset their hardware ID or check license status directly in your Discord server.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <code className="text-sm text-primary font-mono">!reset &lt;key&gt;</code>
            <p className="text-xs text-muted-foreground mt-1">Reset HWID binding for a license key</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <code className="text-sm text-primary font-mono">!check &lt;key&gt;</code>
            <p className="text-xs text-muted-foreground mt-1">Check if a license is valid and view details</p>
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
          <Shield className="h-5 w-5 text-primary" /> Prerequisites
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>A Discord server where you have <strong className="text-foreground">Manage Server</strong> permission</li>
          <li>A Discord bot created via the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord Developer Portal</a></li>
          <li>Python 3.8+ or Node.js 18+ installed on the machine running the bot</li>
          <li>Your <strong className="text-foreground">Admin Auth Token</strong> — obtain this by logging in and copying your session token from the browser</li>
        </ol>
      </div>

      {/* Step-by-step */}
      <div className="mb-8 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Terminal className="h-5 w-5 text-primary" /> Setup Steps
        </h2>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Step 1 — Create a Discord Bot</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">discord.com/developers/applications</a></li>
            <li>Click <strong className="text-foreground">New Application</strong>, name it (e.g. "HWID Reset Bot")</li>
            <li>Navigate to <strong className="text-foreground">Bot</strong> → Click <strong className="text-foreground">Add Bot</strong></li>
            <li>Under <strong className="text-foreground">Privileged Gateway Intents</strong>, enable <strong className="text-foreground">Message Content Intent</strong></li>
            <li>Click <strong className="text-foreground">Reset Token</strong> and copy your bot token — keep it safe!</li>
          </ol>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Step 2 — Invite Bot to Your Server</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Go to <strong className="text-foreground">OAuth2</strong> → <strong className="text-foreground">URL Generator</strong></li>
            <li>Under <strong className="text-foreground">Scopes</strong>, select <code className="text-foreground bg-secondary/50 px-1 rounded">bot</code></li>
            <li>Under <strong className="text-foreground">Bot Permissions</strong>, select <code className="text-foreground bg-secondary/50 px-1 rounded">Send Messages</code> and <code className="text-foreground bg-secondary/50 px-1 rounded">Embed Links</code></li>
            <li>Copy the generated URL and open it in your browser to invite the bot</li>
          </ol>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Step 3 — Get Your Admin Auth Token</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>The <code className="text-foreground bg-secondary/50 px-1 rounded">/reset-hwid</code> endpoint requires admin authentication. To get your token:</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Log into the Galactic Boosts dashboard</li>
              <li>Open your browser's <strong className="text-foreground">Developer Tools</strong> (F12)</li>
              <li>Go to <strong className="text-foreground">Application</strong> → <strong className="text-foreground">Local Storage</strong></li>
              <li>Find the key containing <code className="text-foreground bg-secondary/50 px-1 rounded">access_token</code> — copy its value</li>
              <li>This is your <code className="text-foreground bg-secondary/50 px-1 rounded">ADMIN_AUTH_TOKEN</code></li>
            </ol>
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                <strong>Security:</strong> Auth tokens expire. For a production bot, implement a login flow that signs in with your admin email/password using the Supabase Auth API and refreshes the token automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Step 4 — Configure & Run the Bot</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Copy the bot code below (Python or Node.js)</li>
            <li>Replace <code className="text-foreground bg-secondary/50 px-1 rounded">YOUR_BOT_TOKEN</code> with your Discord bot token</li>
            <li>Replace <code className="text-foreground bg-secondary/50 px-1 rounded">YOUR_SUPABASE_AUTH_TOKEN</code> with your admin auth token</li>
            <li>Install dependencies and run:
              <div className="mt-2 space-y-2">
                <div className="rounded bg-secondary/50 p-2 font-mono text-xs">
                  <span className="text-muted-foreground"># Python</span><br />
                  pip install discord.py requests<br />
                  python bot.py
                </div>
                <div className="rounded bg-secondary/50 p-2 font-mono text-xs">
                  <span className="text-muted-foreground"># Node.js</span><br />
                  npm install discord.js<br />
                  node bot.js
                </div>
              </div>
            </li>
          </ol>
        </div>
      </div>

      {/* API Endpoint Reference */}
      <div className="mb-8 rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-border px-4 py-3">
          <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">POST</span>
          <span className="font-mono text-sm text-foreground">/reset-hwid</span>
          <span className="rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">Bearer token (admin only)</span>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm text-muted-foreground">Reset HWID binding for a license key. Requires admin authentication.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Request Body</p>
              <CopyBtn code='{"license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"}' label="req" />
            </div>
            <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{`{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"
}`}</pre>
          </div>
          <div className="p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Success Response (200)</p>
            <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{`{
  "success": true,
  "message": "HWID reset successfully",
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "previous_hwid": "abc123def456"
}`}</pre>
          </div>
        </div>
        <div className="border-t border-border p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Required Headers</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Header</th>
                  <th className="pb-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-foreground">Authorization</td>
                  <td className="py-2 text-muted-foreground">Bearer &lt;admin_access_token&gt;</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-foreground">Content-Type</td>
                  <td className="py-2 text-muted-foreground">application/json</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="border-t border-border p-4">
          <p className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
            <AlertTriangle className="h-3 w-3" /> Error Responses
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Error</th>
                  <th className="pb-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-foreground">400</td>
                  <td className="py-2 pr-4 font-mono text-destructive">Invalid license_key</td>
                  <td className="py-2 text-muted-foreground">Missing or malformed key</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-foreground">400</td>
                  <td className="py-2 pr-4 font-mono text-destructive">No HWID bound</td>
                  <td className="py-2 text-muted-foreground">License has no HWID to reset</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-foreground">401</td>
                  <td className="py-2 pr-4 font-mono text-destructive">Unauthorized</td>
                  <td className="py-2 text-muted-foreground">Missing or invalid token</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-foreground">403</td>
                  <td className="py-2 pr-4 font-mono text-destructive">Admin access required</td>
                  <td className="py-2 text-muted-foreground">User is not an admin</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-foreground">404</td>
                  <td className="py-2 pr-4 font-mono text-destructive">License not found</td>
                  <td className="py-2 text-muted-foreground">No license matches the key</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bot Code */}
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
          <Code2 className="h-5 w-5 text-primary" /> Bot Code
        </h2>
        <Tabs defaultValue="python">
          <TabsList className="bg-secondary/50 border border-border mb-4">
            <TabsTrigger value="python" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              🐍 Python
            </TabsTrigger>
            <TabsTrigger value="nodejs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              ⬢ Node.js
            </TabsTrigger>
          </TabsList>
          <TabsContent value="python">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
                <span className="text-xs font-medium text-muted-foreground">bot.py</span>
                <CopyBtn code={pythonBot} label="python" />
              </div>
              <pre className="p-4 font-mono text-xs text-foreground overflow-x-auto max-h-[500px] overflow-y-auto">{pythonBot}</pre>
            </div>
          </TabsContent>
          <TabsContent value="nodejs">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
                <span className="text-xs font-medium text-muted-foreground">bot.js</span>
                <CopyBtn code={nodejsBot} label="nodejs" />
              </div>
              <pre className="p-4 font-mono text-xs text-foreground overflow-x-auto max-h-[500px] overflow-y-auto">{nodejsBot}</pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Tips */}
      <div className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
          <MessageSquare className="h-5 w-5 text-primary" /> Tips & Best Practices
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Restrict commands:</strong> Add role checks so only staff or verified users can run <code className="text-foreground bg-secondary/50 px-1 rounded">!reset</code></li>
          <li><strong className="text-foreground">Rate limit:</strong> Add a cooldown to prevent spam (e.g. 1 reset per user per 5 minutes)</li>
          <li><strong className="text-foreground">Logging channel:</strong> Forward all reset actions to a private admin channel for auditing</li>
          <li><strong className="text-foreground">Token refresh:</strong> For production, automate login via Supabase Auth API instead of using a static token</li>
          <li><strong className="text-foreground">Slash commands:</strong> Upgrade from prefix commands to Discord slash commands for a better UX</li>
          <li><strong className="text-foreground">Hosting:</strong> Run the bot on a VPS, Railway, or Replit to keep it online 24/7</li>
        </ul>
      </div>
    </DashboardLayout>
  );
}
