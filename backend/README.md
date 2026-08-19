# Rise of Nations - Server Hosting

## 🐳 Docker (One Command!)

### Quick Start
```bash
docker-compose up -d
```
**That's it!** Server runs at http://localhost:8001

### Customize Your Server
Edit `docker-compose.yml`:
```yaml
- SERVER_NAME=My Awesome Server
- WORLD_SEED=999999          # Different seed = different map!
- MAX_PLAYERS=100
- ALLOW_MIGRATION=true
```

### Commands
```bash
# Start server
docker-compose up -d

# Stop server
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart
```

---

## 🪟 Windows (No Install Required!)

1. Download the server files
2. Double-click `RUN_SERVER.bat`
3. Follow the prompts

The script automatically:
- Downloads Python (portable)
- Installs dependencies
- Helps set up database
- Starts the server

---

## 📁 Files You Need

**For Docker:**
- `Dockerfile`
- `docker-compose.yml`
- `requirements_server.txt`
- `server.py`
- `models.py`
- `ai_service.py`
- `economy_utils.py`
- `policy_service.py`

**For Windows:**
- All Python files (*.py)
- `RUN_SERVER.bat`
- `START_SERVER.ps1`
- `requirements_server.txt`

---

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `SERVER_NAME` | My Nation Server | Your server's name |
| `WORLD_SEED` | 123456 | Map seed - change for unique world! |
| `MAX_PLAYERS` | 50 | Maximum players |
| `ALLOW_MIGRATION` | true | Accept nations from other servers |

---

## 🌐 Make Your Server Public

Register with the server browser:
```bash
curl -X POST https://grokapi-server.preview.emergentagent.com/api/servers/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Server Name",
    "description": "Your description",
    "world_seed": 123456,
    "host_url": "http://your-ip:8001",
    "admin_token": "secret-token-here",
    "allow_migration": true
  }'
```

---

## 💾 Backup Your World

```bash
# Docker
docker exec nation-mongo mongodump --out /backup
docker cp nation-mongo:/backup ./backup
```

Happy nation building! 🏰
