import { DashboardLayout } from "@/components/DashboardLayout";
import { Bot, Copy, CheckCircle, Terminal, Shield, Zap, MessageSquare, Code2, AlertTriangle, Hash } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE = "https://license.galacticboosts.online/api";

const pythonBot = `import discord
from discord import app_commands
import aiohttp
import os
import datetime

# ─── Configuration ───
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "YOUR_BOT_TOKEN")
API_BASE = "${API_BASE}"
BOT_API_KEY = os.getenv("BOT_API_KEY", "YOUR_BOT_API_KEY")  # From Settings → Bot API Key
APPLICATION_ID = os.getenv("APPLICATION_ID", "YOUR_APP_UUID")  # From Applications page
LOG_CHANNEL_ID = int(os.getenv("LOG_CHANNEL_ID", "0"))  # Channel ID for logging

intents = discord.Intents.default()
client = discord.Client(intents=intents)
tree = app_commands.CommandTree(client)


# ─── Logging Helper ───
async def log_action(action: str, user: discord.User, details: dict):
    """Send a log embed to the logging channel."""
    if not LOG_CHANNEL_ID:
        return
    channel = client.get_channel(LOG_CHANNEL_ID)
    if not channel:
        return
    embed = discord.Embed(
        title=f"📋 {action}",
        color=0x2f3136,
        timestamp=datetime.datetime.utcnow()
    )
    embed.add_field(name="Performed By", value=f"{user} ({user.id})", inline=False)
    for k, v in details.items():
        embed.add_field(name=k, value=str(v), inline=True)
    embed.set_footer(text="Galactic Boosts Bot Logs")
    try:
        await channel.send(embed=embed)
    except Exception:
        pass


# ─── API Helper ───
async def api_request(endpoint: str, payload: dict, auth: bool = True):
    """Make a request to the Galactic Boosts API."""
    headers = {"Content-Type": "application/json"}
    if auth:
        headers["X-API-Key"] = BOT_API_KEY
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_BASE}/{endpoint}",
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=10)
        ) as resp:
            data = await resp.json()
            return resp.status, data


# ═══════════════════════════════════════════════════
#  HWID Reset Modal (opened when user clicks button)
# ═══════════════════════════════════════════════════
class HWIDResetModal(discord.ui.Modal, title="🔄 Reset HWID"):
    license_key = discord.ui.TextInput(
        label="License Key",
        placeholder="GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
        style=discord.TextStyle.short,
        required=True,
        max_length=50
    )

    async def on_submit(self, interaction: discord.Interaction):
        key = self.license_key.value.strip()
        await interaction.response.defer(ephemeral=True)

        try:
            status, data = await api_request("reset-hwid", {"license_key": key})

            if status == 200 and data.get("success"):
                embed = discord.Embed(
                    title="✅ HWID Reset Successful",
                    color=0x00ff00,
                    timestamp=datetime.datetime.utcnow()
                )
                embed.add_field(name="License Key", value=f"\`{key}\`", inline=False)
                embed.add_field(name="Previous HWID", value=f"\`{data.get('previous_hwid', 'N/A')}\`", inline=True)
                embed.set_footer(text="Galactic Boosts")
                await interaction.followup.send(embed=embed, ephemeral=True)

                await log_action("HWID Reset", interaction.user, {
                    "License Key": key,
                    "Previous HWID": data.get("previous_hwid", "N/A")
                })
            else:
                embed = discord.Embed(
                    title="❌ Reset Failed",
                    description=data.get("error", "Unknown error"),
                    color=0xff0000
                )
                embed.add_field(name="License Key", value=f"\`{key}\`", inline=False)
                await interaction.followup.send(embed=embed, ephemeral=True)

                await log_action("HWID Reset Failed", interaction.user, {
                    "License Key": key,
                    "Error": data.get("error", "Unknown")
                })

        except Exception as e:
            embed = discord.Embed(
                title="⚠️ Error",
                description=f"Could not connect to API: {str(e)}",
                color=0xff6600
            )
            await interaction.followup.send(embed=embed, ephemeral=True)

    async def on_error(self, interaction: discord.Interaction, error: Exception):
        await interaction.response.send_message(
            "❌ Something went wrong. Please try again.", ephemeral=True
        )


# ─── Panel Button View ───
class PanelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)  # Persistent view

    @discord.ui.button(
        label="Reset HWID",
        style=discord.ButtonStyle.primary,
        emoji="🔄",
        custom_id="hwid_reset_button"
    )
    async def reset_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(HWIDResetModal())

    @discord.ui.button(
        label="Check License",
        style=discord.ButtonStyle.secondary,
        emoji="🔍",
        custom_id="check_license_button"
    )
    async def check_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(CheckLicenseModal())


# ─── Check License Modal ───
class CheckLicenseModal(discord.ui.Modal, title="🔍 Check License"):
    license_key = discord.ui.TextInput(
        label="License Key",
        placeholder="GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX",
        style=discord.TextStyle.short,
        required=True,
        max_length=50
    )

    async def on_submit(self, interaction: discord.Interaction):
        key = self.license_key.value.strip()
        await interaction.response.defer(ephemeral=True)

        try:
            status, data = await api_request("validate", {"license_key": key, "application_id": APPLICATION_ID}, auth=False)

            if data.get("valid"):
                embed = discord.Embed(title="✅ License Valid", color=0x00ff00)
                embed.add_field(name="Key", value=f"\`{key}\`", inline=False)
                embed.add_field(name="App", value=data.get("app", "N/A"), inline=True)
                embed.add_field(name="Expires", value=data.get("expires_readable", "N/A"), inline=True)
                embed.add_field(name="HWID", value=f"\`{data.get('hwid', 'Not bound')}\`", inline=True)
                embed.add_field(name="Status", value="🟢 Active", inline=True)
            else:
                embed = discord.Embed(title="❌ License Invalid", color=0xff0000)
                embed.add_field(name="Key", value=f"\`{key}\`", inline=False)
                embed.add_field(name="Reason", value=data.get("error", "Unknown"), inline=True)

            embed.set_footer(text="Galactic Boosts")
            embed.timestamp = datetime.datetime.utcnow()
            await interaction.followup.send(embed=embed, ephemeral=True)

            await log_action("License Check", interaction.user, {"License Key": key})

        except Exception as e:
            embed = discord.Embed(
                title="⚠️ Error",
                description=f"Could not connect to API: {str(e)}",
                color=0xff6600
            )
            await interaction.followup.send(embed=embed, ephemeral=True)

    async def on_error(self, interaction: discord.Interaction, error: Exception):
        await interaction.response.send_message(
            "❌ Something went wrong. Please try again.", ephemeral=True
        )


# ═══════════════════════════════════════════════════
#  Slash Commands
# ═══════════════════════════════════════════════════

@tree.command(name="panel", description="Send the HWID Reset & License Check panel to a channel")
@app_commands.describe(channel="Channel to send the panel to")
@app_commands.default_permissions(administrator=True)
async def panel_cmd(interaction: discord.Interaction, channel: discord.TextChannel):
    embed = discord.Embed(
        title="🛡️ Galactic Boosts — License Manager",
        description=(
            "Use the buttons below to manage your license.\\n\\n"
            "🔄 **Reset HWID** — Unbind your hardware ID\\n"
            "🔍 **Check License** — View your license status & details"
        ),
        color=0x5865f2
    )
    embed.set_footer(text="Galactic Boosts • Powered by our API")
    embed.timestamp = datetime.datetime.utcnow()

    await channel.send(embed=embed, view=PanelView())
    await interaction.response.send_message(
        f"✅ Panel sent to {channel.mention}", ephemeral=True
    )
    await log_action("Panel Deployed", interaction.user, {"Channel": f"#{channel.name}"})


@tree.command(name="reset", description="Reset HWID for a license key")
@app_commands.describe(license_key="The license key to reset HWID for")
@app_commands.default_permissions(administrator=True)
async def reset_cmd(interaction: discord.Interaction, license_key: str):
    await interaction.response.defer(ephemeral=True)
    try:
        status, data = await api_request("reset-hwid", {"license_key": license_key})

        if status == 200 and data.get("success"):
            embed = discord.Embed(title="✅ HWID Reset Successful", color=0x00ff00)
            embed.add_field(name="License Key", value=f"\`{license_key}\`", inline=False)
            embed.add_field(name="Previous HWID", value=f"\`{data.get('previous_hwid', 'N/A')}\`", inline=True)
        else:
            embed = discord.Embed(
                title="❌ Reset Failed",
                description=data.get("error", "Unknown error"),
                color=0xff0000
            )
            embed.add_field(name="License Key", value=f"\`{license_key}\`", inline=False)

        embed.set_footer(text="Galactic Boosts")
        embed.timestamp = datetime.datetime.utcnow()
        await interaction.followup.send(embed=embed, ephemeral=True)

        await log_action("HWID Reset (Slash)", interaction.user, {
            "License Key": license_key,
            "Result": "Success" if data.get("success") else data.get("error", "Failed")
        })

    except Exception as e:
        embed = discord.Embed(title="⚠️ Error", description=str(e), color=0xff6600)
        await interaction.followup.send(embed=embed, ephemeral=True)


@tree.command(name="check", description="Check a license key's status and details")
@app_commands.describe(license_key="The license key to check")
async def check_cmd(interaction: discord.Interaction, license_key: str):
    await interaction.response.defer(ephemeral=True)
    try:
        status, data = await api_request("validate", {"license_key": license_key, "application_id": APPLICATION_ID}, auth=False)

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

        embed.set_footer(text="Galactic Boosts")
        embed.timestamp = datetime.datetime.utcnow()
        await interaction.followup.send(embed=embed, ephemeral=True)

        await log_action("License Check (Slash)", interaction.user, {"License Key": license_key})

    except Exception as e:
        embed = discord.Embed(title="⚠️ Error", description=str(e), color=0xff6600)
        await interaction.followup.send(embed=embed, ephemeral=True)


@tree.command(name="help", description="Show all available bot commands")
async def help_cmd(interaction: discord.Interaction):
    embed = discord.Embed(
        title="📖 Bot Commands",
        description="Here are all the commands you can use:",
        color=0x5865f2
    )
    embed.add_field(
        name="/panel <channel>",
        value="Deploy the license manager panel to a channel *(Admin)*",
        inline=False
    )
    embed.add_field(
        name="/reset <license_key>",
        value="Reset HWID for a license key *(Admin)*",
        inline=False
    )
    embed.add_field(
        name="/check <license_key>",
        value="Check a license key's status and details",
        inline=False
    )
    embed.add_field(
        name="/info",
        value="Show bot and API connection info",
        inline=False
    )
    embed.add_field(
        name="/help",
        value="Show this help message",
        inline=False
    )
    embed.set_footer(text="Galactic Boosts")
    await interaction.response.send_message(embed=embed, ephemeral=True)


@tree.command(name="info", description="Show bot and API connection info")
async def info_cmd(interaction: discord.Interaction):
    embed = discord.Embed(
        title="ℹ️ Bot Information",
        color=0x5865f2,
        timestamp=datetime.datetime.utcnow()
    )
    embed.add_field(name="Bot", value=f"{client.user}", inline=True)
    embed.add_field(name="Servers", value=str(len(client.guilds)), inline=True)
    embed.add_field(name="API", value=f"\`{API_BASE}\`", inline=False)
    embed.add_field(name="Latency", value=f"{round(client.latency * 1000)}ms", inline=True)
    embed.set_footer(text="Galactic Boosts")
    await interaction.response.send_message(embed=embed, ephemeral=True)


# ─── Bot Ready ───
@client.event
async def on_ready():
    # Register persistent view so buttons work after restart
    client.add_view(PanelView())
    # Sync slash commands with Discord
    await tree.sync()
    print(f"✅ Bot is online as {client.user}")
    print(f"   Synced {len(tree.get_commands())} slash commands")

client.run(BOT_TOKEN)`;

const nodejsBot = `const {
  Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder,
  TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits,
  REST, Routes
} = require("discord.js");

// ─── Configuration ───
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "YOUR_BOT_TOKEN";
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "YOUR_CLIENT_ID";
const API_BASE = "${API_BASE}";
const BOT_API_KEY = process.env.BOT_API_KEY || "YOUR_BOT_API_KEY"; // From Settings → Bot API Key
const APPLICATION_ID = process.env.APPLICATION_ID || "YOUR_APP_UUID"; // From Applications page
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || "";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ─── Logging Helper ───
async function logAction(action, user, details) {
  if (!LOG_CHANNEL_ID) return;
  const channel = client.channels.cache.get(LOG_CHANNEL_ID);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setTitle(\`📋 \${action}\`)
    .setColor(0x2f3136)
    .addFields({ name: "Performed By", value: \`\${user.tag} (\${user.id})\`, inline: false })
    .setTimestamp()
    .setFooter({ text: "Galactic Boosts Bot Logs" });
  for (const [k, v] of Object.entries(details)) {
    embed.addFields({ name: k, value: String(v), inline: true });
  }
  try { await channel.send({ embeds: [embed] }); } catch {}
}

// ─── API Helper ───
async function apiRequest(endpoint, payload, auth = true) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers["X-API-Key"] = BOT_API_KEY;
  const res = await fetch(\`\${API_BASE}/\${endpoint}\`, {
    method: "POST", headers, body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ─── Register Slash Commands ───
const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Send the license manager panel to a channel")
    .addChannelOption(opt =>
      opt.setName("channel").setDescription("Target channel")
        .addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Reset HWID for a license key")
    .addStringOption(opt =>
      opt.setName("license_key").setDescription("The license key").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName("check")
    .setDescription("Check a license key's status")
    .addStringOption(opt =>
      opt.setName("license_key").setDescription("The license key").setRequired(true)),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all bot commands"),
  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Show bot and API info"),
].map(cmd => cmd.toJSON());

// ─── Interaction Handler ───
client.on("interactionCreate", async (interaction) => {
  // ── Button Interactions ──
  if (interaction.isButton()) {
    if (interaction.customId === "hwid_reset_button") {
      const modal = new ModalBuilder()
        .setCustomId("hwid_reset_modal")
        .setTitle("🔄 Reset HWID")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("license_key")
              .setLabel("License Key")
              .setPlaceholder("GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(50)
          )
        );
      return interaction.showModal(modal);
    }
    if (interaction.customId === "check_license_button") {
      const modal = new ModalBuilder()
        .setCustomId("check_license_modal")
        .setTitle("🔍 Check License")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("license_key")
              .setLabel("License Key")
              .setPlaceholder("GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(50)
          )
        );
      return interaction.showModal(modal);
    }
  }

  // ── Modal Submissions ──
  if (interaction.isModalSubmit()) {
    const key = interaction.fields.getTextInputValue("license_key").trim();

    if (interaction.customId === "hwid_reset_modal") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { status, data } = await apiRequest("reset-hwid", { license_key: key });
        let embed;
        if (status === 200 && data.success) {
          embed = new EmbedBuilder()
            .setTitle("✅ HWID Reset Successful").setColor(0x00ff00)
            .addFields(
              { name: "License Key", value: \`\\\`\${key}\\\`\`, inline: false },
              { name: "Previous HWID", value: \`\\\`\${data.previous_hwid || "N/A"}\\\`\`, inline: true }
            );
        } else {
          embed = new EmbedBuilder()
            .setTitle("❌ Reset Failed").setColor(0xff0000)
            .setDescription(data.error || "Unknown error")
            .addFields({ name: "License Key", value: \`\\\`\${key}\\\`\` });
        }
        embed.setFooter({ text: "Galactic Boosts" }).setTimestamp();
        await interaction.followUp({ embeds: [embed], ephemeral: true });
        await logAction("HWID Reset (Panel)", interaction.user, {
          "License Key": key,
          Result: data.success ? "Success" : (data.error || "Failed")
        });
      } catch (err) {
        const embed = new EmbedBuilder()
          .setTitle("⚠️ Error").setDescription(err.message).setColor(0xff6600);
        await interaction.followUp({ embeds: [embed], ephemeral: true });
      }
      return;
    }

    if (interaction.customId === "check_license_modal") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { data } = await apiRequest("validate", { license_key: key, application_id: APPLICATION_ID }, false);
        let embed;
        if (data.valid) {
          embed = new EmbedBuilder()
            .setTitle("✅ License Valid").setColor(0x00ff00)
            .addFields(
              { name: "Key", value: \`\\\`\${key}\\\`\`, inline: false },
              { name: "App", value: data.app || "N/A", inline: true },
              { name: "Expires", value: data.expires_readable || "N/A", inline: true },
              { name: "HWID", value: \`\\\`\${data.hwid || "Not bound"}\\\`\`, inline: true },
              { name: "Status", value: "🟢 Active", inline: true }
            );
        } else {
          embed = new EmbedBuilder()
            .setTitle("❌ License Invalid").setColor(0xff0000)
            .addFields(
              { name: "Key", value: \`\\\`\${key}\\\`\`, inline: false },
              { name: "Reason", value: data.error || "Unknown", inline: true }
            );
        }
        embed.setFooter({ text: "Galactic Boosts" }).setTimestamp();
        await interaction.followUp({ embeds: [embed], ephemeral: true });
        await logAction("License Check (Panel)", interaction.user, { "License Key": key });
      } catch (err) {
        const embed = new EmbedBuilder()
          .setTitle("⚠️ Error").setDescription(err.message).setColor(0xff6600);
        await interaction.followUp({ embeds: [embed], ephemeral: true });
      }
      return;
    }
  }

  // ── Slash Commands ──
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "panel") {
    const channel = interaction.options.getChannel("channel");
    const panelEmbed = new EmbedBuilder()
      .setTitle("🛡️ Galactic Boosts — License Manager")
      .setDescription(
        "Use the buttons below to manage your license.\\n\\n" +
        "🔄 **Reset HWID** — Unbind your hardware ID\\n" +
        "🔍 **Check License** — View your license status & details"
      )
      .setColor(0x5865f2)
      .setFooter({ text: "Galactic Boosts • Powered by our API" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("hwid_reset_button")
        .setLabel("Reset HWID")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔄"),
      new ButtonBuilder()
        .setCustomId("check_license_button")
        .setLabel("Check License")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔍")
    );

    await channel.send({ embeds: [panelEmbed], components: [row] });
    await interaction.reply({ content: \`✅ Panel sent to \${channel}\`, ephemeral: true });
    await logAction("Panel Deployed", interaction.user, { Channel: \`#\${channel.name}\` });
  }

  if (interaction.commandName === "reset") {
    const licenseKey = interaction.options.getString("license_key");
    await interaction.deferReply({ ephemeral: true });
    try {
      const { status, data } = await apiRequest("reset-hwid", { license_key: licenseKey });
      let embed;
      if (status === 200 && data.success) {
        embed = new EmbedBuilder()
          .setTitle("✅ HWID Reset Successful").setColor(0x00ff00)
          .addFields(
            { name: "License Key", value: \`\\\`\${licenseKey}\\\`\`, inline: false },
            { name: "Previous HWID", value: \`\\\`\${data.previous_hwid || "N/A"}\\\`\`, inline: true }
          );
      } else {
        embed = new EmbedBuilder()
          .setTitle("❌ Reset Failed").setColor(0xff0000)
          .setDescription(data.error || "Unknown error")
          .addFields({ name: "License Key", value: \`\\\`\${licenseKey}\\\`\` });
      }
      embed.setFooter({ text: "Galactic Boosts" }).setTimestamp();
      await interaction.followUp({ embeds: [embed], ephemeral: true });
      await logAction("HWID Reset (Slash)", interaction.user, {
        "License Key": licenseKey,
        Result: data.success ? "Success" : (data.error || "Failed")
      });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Error").setDescription(err.message).setColor(0xff6600);
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  }

  if (interaction.commandName === "check") {
    const licenseKey = interaction.options.getString("license_key");
    await interaction.deferReply({ ephemeral: true });
    try {
      const { data } = await apiRequest("validate", { license_key: licenseKey, application_id: APPLICATION_ID }, false);
      let embed;
      if (data.valid) {
        embed = new EmbedBuilder()
          .setTitle("✅ License Valid").setColor(0x00ff00)
          .addFields(
            { name: "Key", value: \`\\\`\${licenseKey}\\\`\`, inline: false },
            { name: "App", value: data.app || "N/A", inline: true },
            { name: "Expires", value: data.expires_readable || "N/A", inline: true },
            { name: "HWID", value: \`\\\`\${data.hwid || "Not bound"}\\\`\`, inline: true }
          );
      } else {
        embed = new EmbedBuilder()
          .setTitle("❌ License Invalid").setColor(0xff0000)
          .addFields(
            { name: "Key", value: \`\\\`\${licenseKey}\\\`\`, inline: false },
            { name: "Reason", value: data.error || "Unknown", inline: true }
          );
      }
      embed.setFooter({ text: "Galactic Boosts" }).setTimestamp();
      await interaction.followUp({ embeds: [embed], ephemeral: true });
      await logAction("License Check (Slash)", interaction.user, { "License Key": licenseKey });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Error").setDescription(err.message).setColor(0xff6600);
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  }

  if (interaction.commandName === "help") {
    const embed = new EmbedBuilder()
      .setTitle("📖 Bot Commands")
      .setDescription("Here are all the commands you can use:")
      .setColor(0x5865f2)
      .addFields(
        { name: "/panel <channel>", value: "Deploy the license manager panel *(Admin)*", inline: false },
        { name: "/reset <license_key>", value: "Reset HWID for a license key *(Admin)*", inline: false },
        { name: "/check <license_key>", value: "Check a license key's status", inline: false },
        { name: "/info", value: "Show bot and API connection info", inline: false },
        { name: "/help", value: "Show this help message", inline: false }
      )
      .setFooter({ text: "Galactic Boosts" });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === "info") {
    const embed = new EmbedBuilder()
      .setTitle("ℹ️ Bot Information")
      .setColor(0x5865f2)
      .addFields(
        { name: "Bot", value: \`\${client.user.tag}\`, inline: true },
        { name: "Servers", value: String(client.guilds.cache.size), inline: true },
        { name: "API", value: \`\\\`\${API_BASE}\\\`\`, inline: false },
        { name: "Latency", value: \`\${client.ws.ping}ms\`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "Galactic Boosts" });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

// ─── Bot Ready ───
client.on("ready", async () => {
  // Register slash commands
  const rest = new REST().setToken(BOT_TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log(\`✅ Bot is online as \${client.user.tag}\`);
  console.log(\`   Registered \${commands.length} slash commands\`);
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
          <Bot className="h-6 w-6 text-primary" /> Discord Bot Guide — Slash Commands
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Set up a Discord bot with slash commands, interactive panels, modals & full logging</p>
      </div>

      {/* Overview */}
      <div className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
          <Zap className="h-5 w-5 text-primary" /> Overview
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          This bot uses <strong className="text-foreground">Discord slash commands</strong> and <strong className="text-foreground">interactive components</strong> (buttons & modals).
          The <code className="text-foreground bg-secondary/50 px-1 rounded">/panel</code> command sends an embed with buttons — users click to open a modal, paste their license key, and get instant results. All actions are logged.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <code className="text-sm text-primary font-mono">/panel #channel</code>
            <p className="text-xs text-muted-foreground mt-1">Deploy interactive panel with Reset HWID & Check License buttons</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <code className="text-sm text-primary font-mono">/reset &lt;key&gt;</code>
            <p className="text-xs text-muted-foreground mt-1">Quick HWID reset via slash command (Admin)</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <code className="text-sm text-primary font-mono">/check &lt;key&gt;</code>
            <p className="text-xs text-muted-foreground mt-1">Check license validity, expiry, HWID & app info</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <code className="text-sm text-primary font-mono">/help</code>
            <p className="text-xs text-muted-foreground mt-1">Show all available bot commands</p>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <code className="text-sm text-primary font-mono">/info</code>
            <p className="text-xs text-muted-foreground mt-1">Show bot status, latency & API endpoint</p>
          </div>
        </div>
      </div>

      {/* How the Panel Works */}
      <div className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
          <Hash className="h-5 w-5 text-primary" /> How the Panel Works
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            <p>Admin runs <code className="text-foreground bg-secondary/50 px-1 rounded">/panel #support</code> — bot sends a beautiful embed with two buttons to that channel</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            <p>User clicks <strong className="text-foreground">🔄 Reset HWID</strong> or <strong className="text-foreground">🔍 Check License</strong> — a modal pops up asking for their license key</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
            <p>User pastes their key and clicks Submit — bot calls the API and returns results as an <strong className="text-foreground">ephemeral</strong> message (only visible to that user)</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
            <p>Every action is logged to your configured log channel with user info, timestamps, and results</p>
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
          <li>Your <strong className="text-foreground">Bot API Key</strong> from Settings page (click Generate)</li>
          <li><span className="text-foreground font-medium">(Node.js only)</span> Your bot's <strong className="text-foreground">Application/Client ID</strong> from the Developer Portal</li>
        </ol>
      </div>

      {/* Setup Steps */}
      <div className="mb-8 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Terminal className="h-5 w-5 text-primary" /> Setup Steps
        </h2>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Step 1 — Create a Discord Bot</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">discord.com/developers/applications</a></li>
            <li>Click <strong className="text-foreground">New Application</strong>, name it (e.g. "HWID Reset Bot")</li>
            <li>Copy the <strong className="text-foreground">Application ID</strong> — you'll need this for Node.js as <code className="text-foreground bg-secondary/50 px-1 rounded">CLIENT_ID</code></li>
            <li>Navigate to <strong className="text-foreground">Bot</strong> → Click <strong className="text-foreground">Add Bot</strong></li>
            <li>Click <strong className="text-foreground">Reset Token</strong> and copy your bot token — keep it safe!</li>
          </ol>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Step 2 — Invite Bot to Your Server</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Go to <strong className="text-foreground">OAuth2</strong> → <strong className="text-foreground">URL Generator</strong></li>
            <li>Under <strong className="text-foreground">Scopes</strong>, select <code className="text-foreground bg-secondary/50 px-1 rounded">bot</code> and <code className="text-foreground bg-secondary/50 px-1 rounded">applications.commands</code></li>
            <li>Under <strong className="text-foreground">Bot Permissions</strong>, select <code className="text-foreground bg-secondary/50 px-1 rounded">Send Messages</code>, <code className="text-foreground bg-secondary/50 px-1 rounded">Embed Links</code>, and <code className="text-foreground bg-secondary/50 px-1 rounded">Use Slash Commands</code></li>
            <li>Copy the generated URL and open it in your browser to invite the bot</li>
          </ol>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Step 3 — Get Your Bot API Key</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>The <code className="text-foreground bg-secondary/50 px-1 rounded">/reset-hwid</code> endpoint requires authentication. Generate a simple API key:</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Go to <strong className="text-foreground">Settings</strong> in the sidebar</li>
              <li>Find the <strong className="text-foreground">Bot API Key</strong> field under Discord Notifications</li>
              <li>Click <strong className="text-foreground">Generate</strong> to create a new key</li>
              <li>Click <strong className="text-foreground">Save Changes</strong></li>
              <li>Copy the key — this is your <code className="text-foreground bg-secondary/50 px-1 rounded">BOT_API_KEY</code></li>
            </ol>
            <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                <strong>No token expiry!</strong> Unlike auth tokens, the Bot API Key never expires. Send it as the <code className="bg-secondary/50 px-1 rounded">X-API-Key</code> header — no JWT or login flow needed.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Step 4 — Set a Log Channel (Optional)</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Create a private channel in your server (e.g. <code className="text-foreground bg-secondary/50 px-1 rounded">#bot-logs</code>)</li>
            <li>Right-click the channel → <strong className="text-foreground">Copy Channel ID</strong> (enable Developer Mode in Discord settings first)</li>
            <li>Set it as <code className="text-foreground bg-secondary/50 px-1 rounded">LOG_CHANNEL_ID</code> in the bot config</li>
            <li>All HWID resets, license checks, and panel deployments will be logged there</li>
          </ol>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Step 5 — Configure & Run the Bot</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Copy the bot code below (Python or Node.js)</li>
            <li>Replace the config values: <code className="text-foreground bg-secondary/50 px-1 rounded">BOT_TOKEN</code>, <code className="text-foreground bg-secondary/50 px-1 rounded">BOT_API_KEY</code>, <code className="text-foreground bg-secondary/50 px-1 rounded">LOG_CHANNEL_ID</code></li>
            <li><span className="text-foreground font-medium">(Node.js only)</span> Also set <code className="text-foreground bg-secondary/50 px-1 rounded">CLIENT_ID</code></li>
            <li>Install dependencies and run:
              <div className="mt-2 space-y-2">
                <div className="rounded bg-secondary/50 p-2 font-mono text-xs">
                  <span className="text-muted-foreground"># Python</span><br />
                  pip install discord.py aiohttp<br />
                  python bot.py
                </div>
                <div className="rounded bg-secondary/50 p-2 font-mono text-xs">
                  <span className="text-muted-foreground"># Node.js</span><br />
                  npm install discord.js<br />
                  node bot.js
                </div>
              </div>
            </li>
            <li>Slash commands will auto-register on first startup (may take up to 1 hour to appear globally, or use a guild-specific command for instant sync)</li>
          </ol>
        </div>
      </div>

      {/* API Endpoint Reference */}
      <div className="mb-8 rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-border px-4 py-3">
          <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">POST</span>
          <span className="font-mono text-sm text-foreground">/reset-hwid</span>
          <span className="rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">X-API-Key (Bot API Key)</span>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm text-muted-foreground">Reset HWID binding for a license key. Authenticate with Bot API Key or admin Bearer token.</p>
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
                  <td className="py-2 pr-4 font-mono text-foreground">X-API-Key</td>
                  <td className="py-2 text-muted-foreground">&lt;your_bot_api_key&gt; (preferred for bots)</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-foreground">Authorization</td>
                  <td className="py-2 text-muted-foreground">Bearer &lt;admin_access_token&gt; (alternative)</td>
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
              <pre className="p-4 font-mono text-xs text-foreground overflow-x-auto max-h-[600px] overflow-y-auto">{pythonBot}</pre>
            </div>
          </TabsContent>
          <TabsContent value="nodejs">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
                <span className="text-xs font-medium text-muted-foreground">bot.js</span>
                <CopyBtn code={nodejsBot} label="nodejs" />
              </div>
              <pre className="p-4 font-mono text-xs text-foreground overflow-x-auto max-h-[600px] overflow-y-auto">{nodejsBot}</pre>
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
          <li><strong className="text-foreground">Persistent panels:</strong> The bot re-registers the button view on startup, so panels keep working after restarts</li>
          <li><strong className="text-foreground">Ephemeral responses:</strong> All results are sent as ephemeral messages — only the user who clicked sees them</li>
          <li><strong className="text-foreground">Rate limit:</strong> Add a cooldown to prevent spam (e.g. 1 reset per user per 5 minutes)</li>
          <li><strong className="text-foreground">Guild commands:</strong> For instant slash command sync, register commands per-guild instead of globally during development</li>
          <li><strong className="text-foreground">API Key auth:</strong> The Bot API Key never expires — no need for token refresh or login flows</li>
          <li><strong className="text-foreground">Hosting:</strong> Run the bot on a VPS, Railway, or Replit to keep it online 24/7</li>
        </ul>

        <h3 className="font-semibold text-foreground mt-6 mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Heartbeat Endpoint — Instant Kill on Ban
        </h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            Use the <code className="text-foreground bg-secondary/50 px-1 rounded">/heartbeat</code> endpoint in your client software to check if a license is still active every 30–60 seconds.
            If you ban a key, suspend an app, or flip the kill switch, the client will detect it on the next heartbeat and <strong className="text-foreground">exit immediately</strong>.
          </p>
          <pre className="rounded bg-secondary/50 p-3 font-mono text-xs text-foreground overflow-x-auto">{`POST /heartbeat
{ "license_key": "GALACTIC-XXXXX-XXXXX-XXXXX-XXXXX" }

// Response when active:
{ "active": true }

// Response when banned/expired/disabled:
{ "active": false, "reason": "License is banned" }`}</pre>
          <p className="text-xs text-muted-foreground">
            Add this to your client code as a background thread/timer. See the API Docs code examples — they include a heartbeat loop that calls <code className="text-foreground bg-secondary/50 px-1 rounded">sys.exit()</code> / <code className="text-foreground bg-secondary/50 px-1 rounded">process.exit()</code> when the license becomes invalid.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
