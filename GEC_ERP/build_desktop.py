#!/usr/bin/env python3
"""
====================================================================
GEC ERP - Automated Desktop App (.EXE) Build Pipeline
====================================================================
This script automates:
1. Compiling React + Vite optimized production web assets
2. Setting up lightweight desktop wrapper
3. Packaging native Windows executable (.exe)
4. Outputting final executable location
"""

import os
import sys
import subprocess
import shutil
import json
from pathlib import Path

def log(msg, symbol="🚀"):
    print(f"\n{symbol} {msg}")

def run_cmd(cmd, cwd=None):
    print(f"  [EXEC] {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"❌ Command failed with code {res.returncode}: {cmd}")
        sys.exit(res.returncode)

def main():
    root_dir = Path(__file__).resolve().parent
    os.chdir(root_dir)

    print("=" * 60)
    print("💻 GEC ERP - Windows Desktop Application Builder (.EXE)")
    print("=" * 60)

    # 1. Build Web Assets
    log("Step 1/3: Building Production Web Assets (Vite)...", "📦")
    run_cmd("corepack pnpm run build" if shutil.which("corepack") else "npm run build")

    # 2. Setup Electron Desktop Host if needed
    log("Step 2/3: Configuring Desktop Native Host Container...", "🖥️")
    desktop_entry = root_dir / "desktop-main.cjs"
    if not desktop_entry.exists():
        content = """const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 320,
    minHeight: 200,
    title: 'GEC ERP - Enterprise Manufacturing System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
"""
        desktop_entry.write_text(content, encoding="utf-8")

    # 3. Package Windows Executable
    log("Step 3/3: Packaging Windows Desktop Application (.exe)...", "⚡")
    if not (root_dir / "node_modules" / "electron").exists():
        print("  Installing Electron & Builder packaging tool...")
        run_cmd("npm install electron electron-builder --save-dev")

    # Run electron builder
    builder_cmd = "npx electron-builder --win portable --dir"
    try:
        run_cmd(builder_cmd)
        dist_desktop = root_dir / "dist" / "win-unpacked"
        print("\n" + "=" * 60)
        print("🎉 SUCCESS! Desktop App Built Successfully!")
        print(f"📂 Desktop App Folder: {dist_desktop.resolve()}")
        print("=" * 60)
    except Exception as e:
        print("\n💡 Standalone Desktop project configured.")
        print("   To launch desktop client now: npx electron desktop-main.cjs")

if __name__ == "__main__":
    main()
