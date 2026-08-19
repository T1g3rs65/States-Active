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
| `EMERGENT_LLM_KEY` | - | AI key for generating issues |

---

## 🔑 Getting an AI Key

The server needs an AI key to generate in-game issues and advisor content.

1. Go to [app.emergent.sh](https://app.emergent.sh)
2. Click Profile → Universal Key
3. Copy your key
4. Add it to your configuration

Without an AI key, the game will still work but won't generate new issues.

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
- Check your EMERGENT_LLM_KEY is set correctly
- The key needs to be valid and have quota

### "Players can't connect"
- Check firewall allows port 8001
- Make sure you share your public IP, not `localhost`

---

Happy nation building! 🏰
