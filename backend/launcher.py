"""
SovereignHex - Standalone Server Launcher
Run this to start your own game server!
"""

import os
import sys
import json
import secrets
import webbrowser
from pathlib import Path

# Default configuration
DEFAULT_CONFIG = {
    "server_name": "My SovereignHex Server",
    "server_description": "A SovereignHex game server",
    "world_seed": 123456,
    "max_players": 50,
    "port": 8001,
    "allow_migration": True,
    "visibility": "public",
    "openclaw_gateway_token": "",
    "auto_open_browser": True
}

CONFIG_FILE = "server_config.json"

def load_config():
    """Load or create configuration file."""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
            # Merge with defaults for any missing keys
            for key, value in DEFAULT_CONFIG.items():
                if key not in config:
                    config[key] = value
            return config
    else:
        # Create default config
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG.copy()

def save_config(config):
    """Save configuration to file."""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

def print_banner():
    """Print welcome banner."""
    print("\n" + "="*60)
    print("   🏰 RISE OF NATIONS - GAME SERVER 🏰")
    print("="*60)

def print_config(config):
    """Print current configuration."""
    print("\n📋 Current Configuration:")
    print(f"   Server Name: {config['server_name']}")
    print(f"   World Seed:  {config['world_seed']}")
    print(f"   Max Players: {config['max_players']}")
    print(f"   Port:        {config['port']}")
    print(f"   Migration:   {'Enabled' if config['allow_migration'] else 'Disabled'}")
    print(f"   Visibility:  {config['visibility']}")
    print(f"   Gateway:     {'Set ✓' if config['openclaw_gateway_token'] else 'Not Set ✗'}")

def configure_server(config):
    """Interactive configuration."""
    print("\n⚙️  Server Configuration")
    print("-" * 40)
    
    # Server name
    name = input(f"Server Name [{config['server_name']}]: ").strip()
    if name:
        config['server_name'] = name
    
    # Description
    desc = input(f"Description [{config['server_description']}]: ").strip()
    if desc:
        config['server_description'] = desc
    
    # World seed
    seed = input(f"World Seed [{config['world_seed']}] (different seed = different map): ").strip()
    if seed:
        try:
            config['world_seed'] = int(seed)
        except ValueError:
            print("Invalid seed, keeping current value")
    
    # Max players
    players = input(f"Max Players [{config['max_players']}]: ").strip()
    if players:
        try:
            config['max_players'] = int(players)
        except ValueError:
            print("Invalid number, keeping current value")
    
    # Port
    port = input(f"Port [{config['port']}]: ").strip()
    if port:
        try:
            config['port'] = int(port)
        except ValueError:
            print("Invalid port, keeping current value")
    
    # Migration
    migration = input(f"Allow Nation Migration? (y/n) [{'y' if config['allow_migration'] else 'n'}]: ").strip().lower()
    if migration in ['y', 'yes']:
        config['allow_migration'] = True
    elif migration in ['n', 'no']:
        config['allow_migration'] = False
    
    # OpenClaw gateway token (replaces the removed Emergent LLM key)
    print("\n🔑 OpenClaw Gateway Token (for AI-generated in-game content)")
    print("   Get it from your OpenClaw gateway config (OPENCLAW_GATEWAY_TOKEN)")
    key = input(f"Gateway Token [{'*' * 8 if config['openclaw_gateway_token'] else 'not set'}]: ").strip()
    if key:
        config['openclaw_gateway_token'] = key
    
    save_config(config)
    print("\n✅ Configuration saved!")
    return config

def start_server(config):
    """Start the game server."""
    print("\n🚀 Starting server...")
    
    # Set environment variables
    os.environ['SERVER_NAME'] = config['server_name']
    os.environ['SERVER_DESCRIPTION'] = config['server_description']
    os.environ['WORLD_SEED'] = str(config['world_seed'])
    os.environ['MAX_PLAYERS'] = str(config['max_players'])
    os.environ['ALLOW_MIGRATION'] = str(config['allow_migration']).lower()
    os.environ['SERVER_VISIBILITY'] = config['visibility']
    
    if config['openclaw_gateway_token']:
        os.environ['OPENCLAW_GATEWAY_TOKEN'] = config['openclaw_gateway_token']
    
    # MongoDB - use local file-based DB for simplicity if not set
    if 'MONGO_URL' not in os.environ:
        os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
    
    port = config['port']
    
    print(f"\n✅ Server starting on port {port}")
    print(f"   Local:   http://localhost:{port}")
    print(f"   Network: http://<your-ip>:{port}")
    print("\n   Press Ctrl+C to stop the server")
    print("-" * 40)
    
    # Open browser if configured
    if config.get('auto_open_browser', True):
        webbrowser.open(f"http://localhost:{port}/api/server/info")
    
    # Import and run uvicorn
    try:
        import uvicorn
        uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
    except ImportError:
        print("\n❌ Error: uvicorn not found. Please install dependencies:")
        print("   pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

def main():
    """Main entry point."""
    print_banner()
    
    config = load_config()
    
    while True:
        print_config(config)
        print("\n📌 Options:")
        print("   [1] Start Server")
        print("   [2] Configure Server")
        print("   [3] Generate New World Seed")
        print("   [4] Exit")
        
        choice = input("\nSelect option (1-4): ").strip()
        
        if choice == '1':
            start_server(config)
            break
        elif choice == '2':
            config = configure_server(config)
        elif choice == '3':
            config['world_seed'] = secrets.randbelow(1000000)
            save_config(config)
            print(f"\n🌍 New world seed generated: {config['world_seed']}")
        elif choice == '4':
            print("\nGoodbye! 👋")
            break
        else:
            print("\nInvalid option, please try again.")

if __name__ == "__main__":
    main()
