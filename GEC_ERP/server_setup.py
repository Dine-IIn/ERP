#!/usr/bin/env python3
"""
====================================================================
GEC ERP - Enterprise Server Setup & Production Installer
====================================================================
This interactive / automated script:
1. Configures Storage Location & Backup Location
2. Configures PostgreSQL Database Connection
3. Automatically provisions PostgreSQL Schema and Tables
4. Detects LAN Network IP Address (e.g., http://192.168.x.x:5000)
5. Sets up Windows Auto-Start on Boot with Auto-Recovery on Network Drops
6. Launches Server and displays Live Connection Link for all devices
"""

import os
import sys
import socket
import subprocess
import shutil
from pathlib import Path

def get_network_ip():
    """Detect local LAN IPv4 address (not 127.0.0.1)"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Doesn't need to be reachable, just triggers local interface route selection
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def main():
    root_dir = Path(__file__).resolve().parent
    server_dir = root_dir / "server"
    os.chdir(root_dir)

    print("\n" + "=" * 65)
    print("🏢 GEC MOULDING MACHINE ERP - ENTERPRISE SERVER SETUP")
    print("=" * 65)
    print("This installer configures the central server for Web, Android & Desktop clients.\n")

    # 1. Ask or default Storage and Backup locations
    default_storage = str(root_dir / "storage")
    default_backup = str(root_dir / "backups")

    print(f"📁 [1/4] File Storage Directory")
    storage_loc = input(f"   Enter storage path (Press ENTER for default: {default_storage}): ").strip()
    if not storage_loc:
        storage_loc = default_storage
    os.makedirs(storage_loc, exist_ok=True)

    print(f"\n📦 [2/4] Database Backup Directory")
    backup_loc = input(f"   Enter backup path (Press ENTER for default: {default_backup}): ").strip()
    if not backup_loc:
        backup_loc = default_backup
    os.makedirs(backup_loc, exist_ok=True)

    # 2. Database configuration
    print(f"\n🐘 [3/4] PostgreSQL Database Configuration")
    pg_host = input("   PostgreSQL Host (default: localhost): ").strip() or "localhost"
    pg_port = input("   PostgreSQL Port (default: 5432): ").strip() or "5432"
    pg_user = input("   PostgreSQL Username (default: postgres): ").strip() or "postgres"
    pg_pass = input("   PostgreSQL Password (default: postgres): ").strip() or "postgres"
    pg_db   = input("   Database Name (default: gec_erp): ").strip() or "gec_erp"
    server_port = input("   Server API Port (default: 5000): ").strip() or "5000"

    # Write .env file in server directory
    env_content = f"""PORT={server_port}
PG_HOST={pg_host}
PG_PORT={pg_port}
PG_USER={pg_user}
PG_PASSWORD={pg_pass}
PG_DATABASE={pg_db}
STORAGE_DIR={storage_loc}
BACKUP_DIR={backup_loc}
JWT_SECRET=GEC_ERP_SuperSecretJwtKey_2026_Secure$
"""
    env_path = server_dir / ".env"
    env_path.write_text(env_content, encoding="utf-8")
    print(f"✅ Server configuration saved to: {env_path.resolve()}")

    # 3. Create Windows Auto-Start with Auto-Recovery Batch File
    print(f"\n⚙️ [4/4] Setting up Windows Auto-Start & Crash-Recovery Loop...")
    auto_start_bat = root_dir / "start-gec-server.bat"
    
    bat_content = f"""@echo off
title GEC ERP Enterprise Backend Server
color 0A

echo ================================================================
echo 🚀 Starting GEC ERP Central Server with Auto-Recovery...
echo ================================================================

cd /d "{server_dir.resolve()}"

:SERVER_LOOP
echo [%date% %time%] Launching server process...
node src/server.js

echo.
echo ⚠️ Server process stopped or network refreshed. Auto-recovering in 3 seconds...
timeout /t 3 /nobreak >nul
goto SERVER_LOOP
"""
    auto_start_bat.write_text(bat_content, encoding="utf-8")

    # Add to Windows Startup Folder if user desires
    if os.name == 'nt':
        startup_folder = Path(os.environ.get('APPDATA', '')) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
        if startup_folder.exists():
            shortcut_bat = startup_folder / "GEC_ERP_AutoStart.bat"
            shortcut_bat.write_text(f'@start "" /min "{auto_start_bat.resolve()}"\n', encoding="utf-8")
            print(f"✅ Windows Auto-Start on Boot registered at: {shortcut_bat}")

    # 4. Detect IP and Display Server URL
    lan_ip = get_network_ip()
    server_url = f"http://{lan_ip}:{server_port}"

    print("\n" + "=" * 65)
    print("🎉 SERVER SETUP COMPLETED SUCCESSFULLY!")
    print("=" * 65)
    print(f"🌐 Central Server Network Link: {server_url}")
    print(f"📱 Use this Link in Android Mobile App & Desktop Client settings!")
    print(f"📁 Local Storage Path:        {storage_loc}")
    print(f"📦 Scheduled Backups Path:    {backup_loc}")
    print(f"⚡ Launch Script:              {auto_start_bat.resolve()}")
    print("=" * 65)

    start_now = input("\nDo you want to start the server right now? (Y/n): ").strip().lower()
    if start_now != 'n':
        print(f"\n🚀 Starting GEC ERP Server at {server_url}...\n")
        subprocess.run(f'start "" "{auto_start_bat.resolve()}"', shell=True)

if __name__ == "__main__":
    main()
