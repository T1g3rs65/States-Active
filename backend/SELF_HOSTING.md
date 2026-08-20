# SovereignHex - Self-Hosted Server Guide

Host your own SovereignHex game server!

## 🚀 Quick Start Options

### Option 1: Docker (Easiest - Recommended)

**All-in-One (includes MongoDB):**
```bash
docker run -d -p 8001:8001 \
  -v sovereignhex-data:/data/db \
  -e SERVER_NAME="My World" \
  -e WORLD_SEED="12345" \
  sovereignhex/server:standalone
```

That's it! Your server will be available at `http://localhost:8001`

**With Docker Compose:**
```bash
docker-compose up -d
```

### Option 2: Windows EXE

1. **Download** the server files
2. **Double-click** `RUN_SERVER.bat`
3. **Follow** the interactive setup wizard

The launcher will guide you through:
- Setting your server name & description
- Choosing a world seed (different seeds = different maps!)
- Configuring migration settings
- Adding your AI key

---

## ⚙️ Configuration

Use environment variables (Docker) or edit `server_config.json` (EXE):

| Setting | Default | Description |
|---------|---------|-------------|
| `SERVER_NAME` | My SovereignHex Server | Display name |
| `SERVER_DESCRIPTION` | ... | Server description |
| `WORLD_SEED` | 123456 | Map seed - **different seed = unique world!** |
| `MAX_PLAYERS` | 50 | Maximum players |
| `ALLOW_MIGRATION` | true | Allow nations to migrate here |
| `OPENCLAW_GATEWAY_TOKEN` | - | OpenClaw gateway token for AI content generation |

---

## 🔑 Getting an AI Token

The server needs an OpenClaw gateway token to generate in-game issues and advisor content.

1. Your OpenClaw gateway exposes an OpenAI-compatible endpoint at `OPENCLAW_GATEWAY_URL`
   (default `http://127.0.0.1:18789/v1`)
2. Set `OPENCLAW_GATEWAY_TOKEN` to the gateway token (see the OpenClaw gateway config)
3. Add it to your configuration

Without a token, the game will still work but won't generate new issues.

---

## 🌐 Registering Your Server

To appear in the public server browser, your server automatically registers when online.

Or keep it private and share the URL directly with friends!

---

## 🔧 Troubleshooting

### "MongoDB connection failed"
- Docker: Make sure you're using the standalone image
- EXE: Install MongoDB from [mongodb.com](https://mongodb.com/try/download/community)

### "No issues generating"
- Check your OPENCLAW_GATEWAY_TOKEN is set correctly
- The gateway endpoint must be reachable and the token valid

### "Players can't connect"
- Check firewall allows port 8001
- Make sure you share your public IP, not `localhost`

---

Happy nation building! 🏰
