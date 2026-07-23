import { RoleLayout } from "@/components/RoleLayout";
import { Copy, CheckCircle, AlertTriangle, Shield, Zap, BookOpen, Server, Code2, Download, Bot, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { languages } from "@/data/api-code-snippets";

const API_BASE = "https://gxauth.xyz/api";

const gxAuthAioBot = `# GX Auth AIO Discord Bot
# pip install -U discord.py aiohttp python-dotenv
#
# .env
# DISCORD_BOT_TOKEN=your_discord_bot_token
# GXAUTH_BOT_API_KEY=gk_your_key_from_gxauth_settings
# GXAUTH_API_BASE=https://gxauth.xyz/api

import os
import re
import aiohttp
import discord
from discord import app_commands
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
GXAUTH_API_BASE = os.getenv("GXAUTH_API_BASE", "https://gxauth.xyz/api").rstrip("/")
GXAUTH_BOT_API_KEY = os.getenv("GXAUTH_BOT_API_KEY", "")
LICENSE_RE = re.compile(r"^GALACTIC-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}-[A-HJ-NP-Z0-9]{5}$")

intents = discord.Intents.default()
bot = discord.Client(intents=intents)
tree = app_commands.CommandTree(bot)

async def gxauth_post(endpoint: str, payload: dict, use_key: bool = False):
    headers = {"Content-Type": "application/json"}
    if use_key:
        headers["X-API-Key"] = GXAUTH_BOT_API_KEY
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=12)) as session:
        async with session.post(f"{GXAUTH_API_BASE}/{endpoint}", json=payload, headers=headers) as response:
            data = await response.json(content_type=None)
            return response.status, data

async def gxauth_manage(action: str, **payload):
    payload["action"] = action
    return await gxauth_post("bot-manage", payload, use_key=True)

def clean_key(key: str) -> str:
    return key.strip().upper()

@tree.command(name="check_license", description="Check a GX Auth license without binding HWID")
async def check_license(interaction: discord.Interaction, license_key: str):
    key = clean_key(license_key)
    if not LICENSE_RE.match(key):
        return await interaction.response.send_message("Invalid license key format.", ephemeral=True)

    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_post("check-license", {"license_key": key})
    if status == 200 and data.get("valid"):
        embed = discord.Embed(title="License active", color=0x5C72FF)
        embed.add_field(name="Application", value=data.get("application") or "Unknown", inline=True)
        embed.add_field(name="Status", value=data.get("status") or "active", inline=True)
        embed.add_field(name="Expires", value=data.get("expires_readable") or "Unknown", inline=False)
    else:
        embed = discord.Embed(title="License check failed", description=data.get("error", "Unknown error"), color=0xFF4D4D)
    await interaction.followup.send(embed=embed, ephemeral=True)

@tree.command(name="reset_hwid", description="Reset HWID for a customer license")
async def reset_hwid(interaction: discord.Interaction, license_key: str):
    key = clean_key(license_key)
    if not GXAUTH_BOT_API_KEY:
        return await interaction.response.send_message("GXAUTH_BOT_API_KEY is missing in bot config.", ephemeral=True)
    if not LICENSE_RE.match(key):
        return await interaction.response.send_message("Invalid license key format.", ephemeral=True)

    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("reset_hwid", license_key=key)
    if status == 200 and data.get("success"):
        embed = discord.Embed(title="HWID reset complete", color=0x35D399)
        embed.add_field(name="License", value=f"\`{key}\`", inline=False)
        embed.add_field(name="Previous HWID", value=f"\`{data.get('previous_hwid') or 'none'}\`", inline=False)
    else:
        embed = discord.Embed(title="HWID reset failed", description=data.get("error", "Unknown error"), color=0xFF4D4D)
    await interaction.followup.send(embed=embed, ephemeral=True)

@tree.command(name="gx_profile", description="Show your GX Auth workspace summary")
async def gx_profile(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("profile")
    if status != 200 or not data.get("success"):
        return await interaction.followup.send(data.get("error", "Could not load profile"), ephemeral=True)
    usage = data.get("usage", {})
    tenant = data.get("tenant", {})
    embed = discord.Embed(title="GX Auth Workspace", color=0x5C72FF)
    embed.add_field(name="Plan", value=tenant.get("plan", "unknown"), inline=True)
    embed.add_field(name="Apps", value=str(usage.get("apps", 0)), inline=True)
    embed.add_field(name="Licenses", value=str(usage.get("licenses", 0)), inline=True)
    embed.add_field(name="Resellers", value=str(usage.get("resellers", 0)), inline=True)
    embed.add_field(name="Managers", value=str(usage.get("managers", 0)), inline=True)
    await interaction.followup.send(embed=embed, ephemeral=True)

@tree.command(name="gx_apps", description="List your GX Auth applications")
async def gx_apps(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("list_apps")
    apps = data.get("apps", []) if status == 200 else []
    if not apps:
        return await interaction.followup.send("No apps found.", ephemeral=True)
    lines = [f"**{app['name']}** — \`{app['id']}\`" for app in apps[:20]]
    await interaction.followup.send("\\n".join(lines), ephemeral=True)

@tree.command(name="gx_create_app", description="Create a GX Auth application")
async def gx_create_app(interaction: discord.Interaction, name: str, description: str = ""):
    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("create_app", name=name, description=description)
    if status == 200 and data.get("success"):
        app = data["app"]
        return await interaction.followup.send(f"Created app **{app['name']}**\\nID: \`{app['id']}\`", ephemeral=True)
    await interaction.followup.send(data.get("error", "Could not create app"), ephemeral=True)

@tree.command(name="gx_delete_app", description="Delete one of your GX Auth applications")
async def gx_delete_app(interaction: discord.Interaction, application_id: str):
    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("delete_app", application_id=application_id)
    await interaction.followup.send("Application deleted." if status == 200 and data.get("success") else data.get("error", "Delete failed"), ephemeral=True)

@tree.command(name="gx_create_license", description="Create a license for one of your apps")
async def gx_create_license(interaction: discord.Interaction, application_id: str, days: int = 30, owner_email: str = ""):
    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("create_license", application_id=application_id, days=days, owner_email=owner_email)
    if status == 200 and data.get("success"):
        lic = data["license"]
        return await interaction.followup.send(f"License created: \`{lic['license_key']}\`\\nExpires: {lic['expires_at']}", ephemeral=True)
    await interaction.followup.send(data.get("error", "Could not create license"), ephemeral=True)

@tree.command(name="gx_delete_license", description="Delete a license from your workspace")
async def gx_delete_license(interaction: discord.Interaction, license_key: str):
    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("delete_license", license_key=clean_key(license_key))
    await interaction.followup.send("License deleted." if status == 200 and data.get("success") else data.get("error", "Delete failed"), ephemeral=True)

@tree.command(name="gx_ban_license", description="Ban a license in your workspace")
async def gx_ban_license(interaction: discord.Interaction, license_key: str):
    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("ban_license", license_key=clean_key(license_key))
    await interaction.followup.send("License banned." if status == 200 and data.get("success") else data.get("error", "Ban failed"), ephemeral=True)

@tree.command(name="gx_unban_license", description="Unban a license in your workspace")
async def gx_unban_license(interaction: discord.Interaction, license_key: str):
    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("unban_license", license_key=clean_key(license_key))
    await interaction.followup.send("License unbanned." if status == 200 and data.get("success") else data.get("error", "Unban failed"), ephemeral=True)

@tree.command(name="gx_create_reseller", description="Create a reseller account")
async def gx_create_reseller(interaction: discord.Interaction, username: str, email: str, password: str, credits: int = 10):
    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("create_reseller", username=username, email=email, password=password, credits=credits)
    await interaction.followup.send("Reseller created." if status == 200 and data.get("success") else data.get("error", "Could not create reseller"), ephemeral=True)

@tree.command(name="gx_create_manager", description="Create a manager account")
async def gx_create_manager(interaction: discord.Interaction, username: str, email: str, password: str):
    await interaction.response.defer(ephemeral=True)
    status, data = await gxauth_manage("create_manager", username=username, email=email, password=password)
    await interaction.followup.send("Manager created." if status == 200 and data.get("success") else data.get("error", "Could not create manager"), ephemeral=True)

@bot.event
async def on_ready():
    await tree.sync()
    print(f"GX Auth AIO bot online as {bot.user}")

bot.run(BOT_TOKEN)`;

const endpoints = [
  {
    method: "POST",
    path: "/validate",
    auth: "None (public)",
    description: "Validate a license key from your software client. This is the primary endpoint your app calls on startup.",
    request: `{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "hwid": "machine-hardware-id",
  "device_name": "DESKTOP-ABC123",
  "application_id": "your-app-uuid"
}`,
    response: `{
  "valid": true,
  "expires": "2026-04-08T00:00:00Z",
  "expires_readable": "Apr 8, 2026 (31 days left)",
  "hwid": "abc123def456",
  "app": "MyApp",
  "country": "United States",
  "device_name": "DESKTOP-ABC123"
}`,
    fields: [
      { name: "license_key", type: "string", required: true, desc: "The license key to validate (max 50 chars)" },
      { name: "hwid", type: "string", required: false, desc: "Hardware ID for binding (max 100 chars). If omitted, no HWID binding occurs." },
      { name: "device_name", type: "string", required: false, desc: "Device hostname (max 100 chars). Logged for tracking and shown in Discord alerts." },
      { name: "application_id", type: "string", required: false, desc: "Application UUID. If provided, verifies the license belongs to this app. Prevents cross-app key abuse." },
    ],
    headers: [
      { name: "X-Signature", required: "If signing enabled", desc: "HMAC-SHA256 hex signature of timestamp.nonce.body using the app signing secret" },
      { name: "X-Timestamp", required: "If signing enabled", desc: "Unix timestamp (seconds). Must be within 60 seconds of server time." },
      { name: "X-Nonce", required: "If signing enabled", desc: "Unique random value per request. Reusing it is rejected as replay." },
    ],
    errors: [
      { code: 400, message: "Invalid license_key", desc: "Missing or malformed license_key field" },
      { code: 400, message: "Invalid hwid", desc: "HWID exceeds 100 characters" },
      { code: 404, message: "License not found", desc: "No license matches the provided key" },
      { code: 403, message: "License is banned", desc: "License has been banned by admin or auto-ban" },
      { code: 403, message: "License does not belong to this application", desc: "application_id was provided but doesn't match the license's app" },
      { code: 403, message: "Application is disabled", desc: "App is suspended or kill-switch is active" },
      { code: 403, message: "License expired", desc: "License expiration date has passed" },
      { code: 403, message: "HWID mismatch", desc: "Key is already bound to a different HWID" },
      { code: 403, message: "License banned for sharing", desc: "Too many unique IPs detected (anti-sharing)" },
      { code: 403, message: "Signature, timestamp, and nonce required", desc: "App requires request signing but one or more signing headers are missing" },
      { code: 403, message: "Invalid nonce", desc: "X-Nonce is missing, too short, too long, or contains unsupported characters" },
      { code: 403, message: "Request expired", desc: "X-Timestamp is older than 60 seconds (replay protection)" },
      { code: 409, message: "Replay detected", desc: "The nonce has already been used for this application" },
      { code: 403, message: "Invalid signature", desc: "HMAC signature doesn't match — possible payload tampering" },
      { code: 429, message: "Too many requests", desc: "Rate limit exceeded. Retry after window expires." },
      { code: 500, message: "Internal server error", desc: "Unexpected server error" },
    ],
  },
  {
    method: "POST",
    path: "/check-license",
    auth: "None (public)",
    description: "Lightweight read-only license lookup for client portal websites. Returns license validity, application name, expiry, and owner — without HWID binding, IP tracking, or activity logging.",
    request: `{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"
}`,
    response: `{
  "valid": true,
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "application": "My Bot Name",
  "status": "active",
  "expires_at": "2026-12-31T00:00:00Z",
  "expires_readable": "Dec 31, 2026 (265 days left)",
  "owner_name": "John Doe",
  "is_used": true,
  "is_banned": false
}`,
    fields: [
      { name: "license_key", type: "string", required: true, desc: "The license key to check (max 50 chars)" },
    ],
    errors: [
      { code: 400, message: "Invalid license_key", desc: "Missing or malformed license_key field" },
      { code: 404, message: "License not found", desc: "No license matches the provided key" },
      { code: 403, message: "License is banned", desc: "License has been banned" },
      { code: 403, message: "Application is disabled", desc: "App is suspended or kill-switch is active" },
      { code: 410, message: "License expired", desc: "License expiration date has passed" },
      { code: 429, message: "Too many requests", desc: "Rate limit exceeded" },
      { code: 500, message: "Internal server error", desc: "Unexpected server error" },
    ],
  },
  {
    method: "POST",
    path: "/create-reseller",
    auth: "Bearer token (admin only)",
    description: "Create a new reseller account. Requires admin authentication via Authorization header.",
    request: `{
  "username": "reseller_name",
  "email": "reseller@example.com",
  "password": "securePassword123",
  "credits": 50,
  "allowed_apps": ["app-uuid-1", "app-uuid-2"]
}`,
    response: `{
  "success": true,
  "reseller_id": "uuid",
  "message": "Reseller \\"reseller_name\\" created"
}`,
    fields: [
      { name: "username", type: "string", required: true, desc: "Display name for the reseller" },
      { name: "email", type: "string", required: true, desc: "Reseller login email" },
      { name: "password", type: "string", required: true, desc: "Reseller login password" },
      { name: "credits", type: "number", required: false, desc: "Initial credits (default: 10)" },
      { name: "allowed_apps", type: "string[]", required: false, desc: "Array of application UUIDs the reseller can generate keys for" },
    ],
    errors: [
      { code: 401, message: "Unauthorized", desc: "Missing or invalid Authorization header" },
      { code: 403, message: "Admin access required", desc: "Caller does not have admin role" },
      { code: 400, message: "Missing required fields", desc: "username, email, or password is missing" },
      { code: 400, message: "(varies)", desc: "Auth user creation failed (e.g. email already exists)" },
      { code: 500, message: "Internal server error", desc: "Unexpected server error" },
    ],
  },
  {
    method: "POST",
    path: "/heartbeat",
    auth: "None (public)",
    description: "Lightweight status check for running clients. Call every 30-60 seconds to detect bans, suspensions, or kill switch instantly. Logs activity with country tracking.",
    request: `{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "application_id": "your-app-uuid"
}`,
    response: `{
  "active": true,
  "app": "MyApp",
  "country": "United States"
}`,
    fields: [
      { name: "license_key", type: "string", required: true, desc: "The license key to check (max 50 chars)" },
      { name: "application_id", type: "string", required: false, desc: "Application UUID. If provided, verifies the license belongs to this app." },
    ],
    errors: [
      { code: 400, message: "Invalid license_key", desc: "Missing or malformed license_key field" },
      { code: 403, message: "License does not belong to this application", desc: "application_id was provided but doesn't match the license's app" },
      { code: 404, message: "License not found", desc: "No license matches the provided key" },
      { code: 429, message: "Too many requests", desc: "Rate limit exceeded" },
      { code: 500, message: "Internal server error", desc: "Unexpected server error" },
    ],
  },
  {
    method: "POST",
    path: "/reset-hwid",
    auth: "X-API-Key or Bearer token",
    description: "Reset HWID binding for a license key. Authenticate with a Bot API Key (from Settings) or admin Bearer token.",
    request: `{
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX"
}`,
    response: `{
  "success": true,
  "message": "HWID reset successfully",
  "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
  "previous_hwid": "abc123def456"
}`,
    fields: [
      { name: "license_key", type: "string", required: true, desc: "The license key to reset HWID for (max 50 chars)" },
    ],
    headers: [
      { name: "X-API-Key", required: "Yes (preferred)", desc: "Bot API Key from Settings page — never expires, ideal for bots" },
      { name: "Authorization", required: "Alternative", desc: "Bearer <admin_access_token> — JWT-based, expires" },
    ],
    errors: [
      { code: 400, message: "Invalid license_key", desc: "Missing or malformed key" },
      { code: 400, message: "No HWID bound", desc: "License has no HWID to reset" },
      { code: 401, message: "Unauthorized", desc: "Missing or invalid API key / token" },
      { code: 404, message: "License not found", desc: "No license matches the key" },
    ],
  },
  {
    method: "POST",
    path: "/bot-manage",
    auth: "X-API-Key (Bot API Key)",
    description: "Owner-scoped GX Auth AIO endpoint for Discord bots and automation. The key owner can manage only their own workspace apps, licenses, resellers, and managers.",
    request: `{
  "action": "create_license",
  "application_id": "your-app-uuid",
  "days": 30,
  "owner_email": "customer@example.com"
}`,
    response: `{
  "success": true,
  "license": {
    "id": "uuid",
    "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
    "expires_at": "2026-08-22T00:00:00Z"
  }
}`,
    fields: [
      { name: "action", type: "string", required: true, desc: "One of: profile, list_apps, create_app, delete_app, list_licenses, create_license, delete_license, ban_license, unban_license, reset_hwid, list_resellers, create_reseller, delete_reseller, list_managers, create_manager, delete_manager" },
      { name: "application_id", type: "uuid", required: "For app/license actions", desc: "Application UUID from the owner workspace" },
      { name: "license_key", type: "string", required: "For license actions", desc: "License key to delete, ban, unban, or reset" },
      { name: "email", type: "string", required: "For team creation", desc: "Reseller or manager login email" },
      { name: "password", type: "string", required: "For team creation", desc: "Temporary password for reseller/manager account" },
    ],
    headers: [
      { name: "X-API-Key", required: "Yes", desc: "Bot API Key generated from the owner's Settings page" },
    ],
    errors: [
      { code: 400, message: "Unsupported action", desc: "Action is missing or not supported" },
      { code: 401, message: "Invalid Bot API Key", desc: "Missing, revoked, or invalid key" },
      { code: 403, message: "Action not allowed for this workspace", desc: "The target app/license/user does not belong to the key owner" },
      { code: 404, message: "(varies)", desc: "Target app, license, reseller, or manager was not found" },
    ],
  },
];

export default function ApiDocs() {
  const [activeLang, setActiveLang] = useState("python");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyCode = (code: string, label?: string) => {
    navigator.clipboard.writeText(code);
    setCopiedText(label || "code");
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedText(null), 1500);
  };

  return (
    <RoleLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">Complete guide to integrate GX Auth into your software</p>
          <a
            href="/openapi.json"
            download="galactic-boosts-openapi.json"
            className="inline-flex items-center gap-2 self-start rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download OpenAPI Spec (v3.0)
          </a>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
          <BookOpen className="h-4 w-4 text-primary" /> Table of Contents
        </h2>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-muted-foreground list-decimal list-inside">
          <li><a href="#setup" className="hover:text-primary transition-colors">Setup Guide</a></li>
          <li><a href="#base-url" className="hover:text-primary transition-colors">Base URL</a></li>
          <li><a href="#endpoints" className="hover:text-primary transition-colors">API Endpoints</a></li>
          <li><a href="#hwid" className="hover:text-primary transition-colors">HWID Binding</a></li>
          <li><a href="#request-signing" className="hover:text-primary transition-colors">Request Signing (HMAC)</a></li>
          <li><a href="#discord-bot" className="hover:text-primary transition-colors">GX Auth AIO Discord Bot</a></li>
          <li><a href="#security" className="hover:text-primary transition-colors">Security Features</a></li>
          <li><a href="#examples" className="hover:text-primary transition-colors">Code Examples</a></li>
          <li><a href="#quickstart" className="hover:text-primary transition-colors">Quick Start</a></li>
        </ol>
      </div>

      {/* Setup Guide */}
      <div id="setup" className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
          <Zap className="h-5 w-5 text-primary" /> Setup Guide
        </h2>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Step 1 — Create an Application</h3>
            <p>Go to <strong className="text-foreground">Applications</strong> in the sidebar and click <strong className="text-foreground">Create Application</strong>. Give it a name and optional description. This represents your software product.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Step 2 — Generate License Keys</h3>
            <p>Navigate to <strong className="text-foreground">Licenses</strong>, select your application, choose a duration (1 Day, 1 Week, 1 Month, or Lifetime), and generate keys. Each key follows the format <code className="text-foreground bg-secondary/50 px-1 rounded">GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX</code>.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Step 3 — Integrate the API</h3>
            <p>Copy the code example below for your language (Python, C#, Node.js, C++, Go, Java, or Rust). Add it to your project and call the <code className="text-foreground bg-secondary/50 px-1 rounded">/validate</code> endpoint on startup.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Step 4 — Build &amp; Distribute</h3>
            <p>Build your project into an executable (<code className="text-foreground bg-secondary/50 px-1 rounded">.exe</code>, <code className="text-foreground bg-secondary/50 px-1 rounded">.dll</code>, binary, etc.) using your language's build tool (PyInstaller, .NET publish, go build, cargo build, etc.). Distribute to your users along with their license keys.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Step 5 — Monitor &amp; Manage</h3>
            <p>Use the <strong className="text-foreground">Dashboard</strong> to monitor validations in real-time. View logs, ban/unban keys, reset HWIDs, and toggle the kill switch from the dashboard. Sellers can configure their own Discord webhook in <strong className="text-foreground">Settings</strong>; platform-wide security controls live in the <strong className="text-foreground">Admin Panel</strong>.</p>
          </div>
        </div>
      </div>

      {/* Base URL */}
      <div id="base-url" className="mb-6 rounded-lg border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <Server className="h-3.5 w-3.5" /> Base URL
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-secondary/50 px-3 py-2 font-mono text-sm text-foreground break-all">{API_BASE}</code>
          <button
            onClick={() => copyCode(API_BASE, "base-url")}
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors shrink-0"
          >
            {copiedText === "base-url" ? <><CheckCircle className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
        </div>
      </div>

      {/* Endpoints */}
      <div id="endpoints" className="mb-10 space-y-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Code2 className="h-5 w-5 text-primary" /> API Endpoints
        </h2>
        {endpoints.map((ep) => (
          <div key={ep.path} className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-border px-4 py-3">
              <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {ep.method}
              </span>
              <span className="font-mono text-sm text-foreground">{ep.path}</span>
              <span className="rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{ep.auth}</span>
            </div>
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm text-muted-foreground">{ep.description}</p>
            </div>

            {/* Request / Response */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
              <div className="p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Request Body</p>
                <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{ep.request}</pre>
              </div>
              <div className="p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Success Response (200)</p>
                <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{ep.response}</pre>
              </div>
            </div>

            {/* Fields */}
            {"fields" in ep && ep.fields && (
              <div className="border-t border-border p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Request Fields</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="pb-2 pr-4 font-medium">Field</th>
                        <th className="pb-2 pr-4 font-medium">Type</th>
                        <th className="pb-2 pr-4 font-medium">Required</th>
                        <th className="pb-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.fields.map((f) => (
                        <tr key={f.name} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-foreground">{f.name}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{f.type}</td>
                          <td className="py-2 pr-4">
                            {f.required ? (
                              <span className="text-emerald-400 font-medium">Yes</span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </td>
                          <td className="py-2 text-muted-foreground">{f.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Headers */}
            {"headers" in ep && ep.headers && (
              <div className="border-t border-border p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Request Headers (for signed requests)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="pb-2 pr-4 font-medium">Header</th>
                        <th className="pb-2 pr-4 font-medium">Required</th>
                        <th className="pb-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.headers.map((h: any) => (
                        <tr key={h.name} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-foreground">{h.name}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{h.required}</td>
                          <td className="py-2 text-muted-foreground">{h.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Errors */}
            {"errors" in ep && ep.errors && (
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
                      {ep.errors.map((err, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-mono text-foreground">{err.code}</td>
                          <td className="py-2 pr-4 font-mono text-destructive">{err.message}</td>
                          <td className="py-2 text-muted-foreground">{err.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* How HWID Works */}
      <div id="hwid" className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">How HWID Binding Works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Your app sends the license key + a hardware ID (HWID) to the <code className="text-foreground bg-secondary/50 px-1 rounded">/validate</code> endpoint.</li>
          <li>On <strong className="text-foreground">first validation</strong>, the HWID is bound to that license permanently.</li>
          <li>Subsequent validations from a <strong className="text-foreground">different HWID</strong> are rejected with a 403 error.</li>
          <li>Admins can <strong className="text-foreground">reset HWID</strong> from the Licenses page to allow re-binding.</li>
          <li>If <code className="text-foreground bg-secondary/50 px-1 rounded">hwid</code> is not sent, the license validates without binding.</li>
        </ol>
      </div>

      {/* Request Signing */}
      <div id="request-signing" className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
          <Shield className="h-5 w-5 text-primary" /> Request Signing (HMAC-SHA256)
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Prevent payload tampering by enabling request signing on your application. When enabled, every validation request must include an HMAC-SHA256 signature.</p>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">How it works</h3>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Enable <strong className="text-foreground">Request Signing</strong> in the Application details dialog and copy the <strong className="text-foreground">Signing Secret</strong>.</li>
              <li>In your client, build the JSON body string, generate a unique nonce, then compute: <code className="text-foreground bg-secondary/50 px-1 rounded">HMAC-SHA256(secret, timestamp + "." + nonce + "." + body)</code></li>
              <li>Send the hex-encoded signature as <code className="text-foreground bg-secondary/50 px-1 rounded">X-Signature</code>, the unix timestamp as <code className="text-foreground bg-secondary/50 px-1 rounded">X-Timestamp</code>, and the nonce as <code className="text-foreground bg-secondary/50 px-1 rounded">X-Nonce</code>.</li>
              <li>The server verifies the signature and rejects requests older than <strong className="text-foreground">60 seconds</strong> or duplicate nonces.</li>
            </ol>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <h3 className="font-semibold text-foreground mb-2">Security benefits</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Prevents modification of license_key, hwid, or device_name in transit</li>
              <li>60-second timestamp window plus one-time nonces blocks replay attacks</li>
              <li>Per-application secrets — compromise of one app doesn't affect others</li>
              <li>Backward compatible — apps without signing enabled continue to work normally</li>
            </ul>
          </div>
        </div>
      </div>

      {/* GX Auth AIO Discord Bot */}
      <div id="discord-bot" className="mb-8 rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Bot className="h-5 w-5 text-primary" /> GX Auth AIO Discord Bot
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Owners can generate a Bot API Key in Settings, paste it into the bot config, and let Discord staff check licenses or reset customer HWIDs without logging into the dashboard.
            </p>
          </div>
          <button
            onClick={() => copyCode(gxAuthAioBot, "gxauth-aio-bot")}
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {copiedText === "gxauth-aio-bot" ? <><CheckCircle className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy Bot</>}
          </button>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground"><KeyRound className="h-4 w-4 text-primary" /> 1. Generate Key</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">Open Settings, generate a Bot API Key, then save. This key can only control resources owned by that account.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="mb-1 text-sm font-semibold text-foreground">2. Add Config</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">Put the key in <code className="text-primary">GXAUTH_BOT_API_KEY</code> with your Discord bot token.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="mb-1 text-sm font-semibold text-foreground">3. Manage in Discord</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">Use <code className="text-primary">/check_license</code> and <code className="text-primary">/reset_hwid</code>. Requests are scoped by the API key owner.</p>
          </div>
        </div>
        <pre className="max-h-[520px] overflow-auto rounded-lg border border-border bg-secondary/40 p-4 font-mono text-xs leading-relaxed text-foreground">
          {gxAuthAioBot}
        </pre>
      </div>

      {/* Security Features */}
      <div id="security" className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
          <Shield className="h-5 w-5 text-primary" /> Security Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="font-semibold text-foreground text-sm mb-1">Rate Limiting</h3>
            <p className="text-xs text-muted-foreground">Configurable max attempts per IP within a time window. Returns 429 when exceeded. Platform admins adjust this in Admin Panel.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="font-semibold text-foreground text-sm mb-1">Anti-Sharing (IP Tracking)</h3>
            <p className="text-xs text-muted-foreground">Tracks unique IPs per license. Auto-bans keys exceeding the threshold. Platform admins configure thresholds in Admin Panel.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="font-semibold text-foreground text-sm mb-1">Kill Switch</h3>
            <p className="text-xs text-muted-foreground">Instantly disable all validations for an application. Toggle from the Applications page.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="font-semibold text-foreground text-sm mb-1">Request Signing</h3>
            <p className="text-xs text-muted-foreground">HMAC-SHA256 request signing prevents payload tampering and replay attacks. Enable per-app from Applications page.</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <h3 className="font-semibold text-foreground text-sm mb-1">Discord Webhooks</h3>
            <p className="text-xs text-muted-foreground">Real-time alerts for validations, rejections, and bans. Set webhook URL in Settings.</p>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div id="examples">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
          <Code2 className="h-5 w-5 text-primary" /> Client Integration Examples
        </h2>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Signed Body Rule</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sign the exact JSON string you send. If your client signs formatted JSON but posts minified JSON, HMAC will fail.
            </p>
          </div>
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Required Headers</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              HMAC apps must send <code className="text-primary">X-Signature</code>, <code className="text-primary">X-Timestamp</code>, and <code className="text-primary">X-Nonce</code>.
            </p>
          </div>
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Replay Protection</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Timestamps expire after 60 seconds and each nonce can only be used once per application.
            </p>
          </div>
        </div>
        <Tabs value={activeLang} onValueChange={setActiveLang}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <TabsList className="flex-wrap h-auto">
              {languages.map((lang) => (
                <TabsTrigger key={lang.id} value={lang.id}>{lang.label}</TabsTrigger>
              ))}
            </TabsList>
            <button
              onClick={() => {
                const lang = languages.find((l) => l.id === activeLang);
                if (lang) copyCode(lang.code, `lang-${lang.id}`);
              }}
              className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              {copiedText === `lang-${activeLang}` ? <><CheckCircle className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
          </div>
          {languages.map((lang) => (
            <TabsContent key={lang.id} value={lang.id}>
              <pre className="rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground overflow-x-auto leading-relaxed max-h-[500px] overflow-y-auto">
                {lang.code}
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Quick Start */}
      <div id="quickstart" className="mt-10 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">Quick Start Checklist</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Create an <strong className="text-foreground">Application</strong> in the dashboard.</li>
          <li>Generate <strong className="text-foreground">License Keys</strong> for that application.</li>
          <li>Copy the code example above into your project.</li>
          <li>Replace the API URL if needed (it's embedded in the snippet).</li>
          <li>Call <code className="text-foreground bg-secondary/50 px-1 rounded">/validate</code> on startup with the user's key + HWID + device_name.</li>
          <li>If <code className="text-foreground bg-secondary/50 px-1 rounded">valid: true</code> → run your app. Otherwise → show the error and exit.</li>
          <li>The code snippets include a <strong className="text-foreground">"Save license key"</strong> prompt — users can type <code className="text-foreground bg-secondary/50 px-1 rounded">y</code> to save their key locally so they don't need to re-enter it.</li>
          <li>Build your project as an executable and distribute with license keys.</li>
          <li>(Optional) Set up <strong className="text-foreground">Discord webhooks</strong> in Settings. Platform admins manage anti-sharing and rate limits in Admin Panel.</li>
          <li>(Optional) Create <strong className="text-foreground">Resellers</strong> to let others distribute keys on your behalf.</li>
        </ol>
      </div>
    </RoleLayout>
  );
}
