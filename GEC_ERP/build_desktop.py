#!/usr/bin/env python3
"""
====================================================================
GEC ERP - Automated Tauri Windows Desktop Builder (.EXE / .MSI)
====================================================================
This script:
1. Terminates any running gec-erp / makensis processes to release Windows file locks
2. Compiles React + Vite production web bundle
3. Packages native Windows installers (.exe setup and .msi) via Tauri
4. Displays the final output artifact locations
"""

import os
import sys
import subprocess
import shutil
import time
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def log(msg, symbol="[*]"):
    print(f"\n{symbol} {msg}")

def kill_running_instances():
    try:
        cmd = 'powershell -NoProfile -Command "Get-Process | Where-Object { $_.Name -match \'gec-erp|makensis|rustc|cargo|candle|light\' } | Stop-Process -Force -ErrorAction SilentlyContinue"'
        subprocess.run(cmd, shell=True, capture_output=True)
        time.sleep(1)
    except Exception:
        pass

def run_cmd(cmd, cwd=None):
    print(f"  [EXEC] {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"\n[ERROR] Command failed with code {res.returncode}: {cmd}")
        sys.exit(res.returncode)

def main():
    root_dir = Path(__file__).resolve().parent
    os.chdir(root_dir)

    print("=" * 65)
    print("GEC ERP - Windows Desktop Application Builder (Tauri .EXE / .MSI)")
    print("=" * 65)

    # 1. Release locks
    log("Step 1/3: Clearing any running instances & file locks...", "[1/3]")
    kill_running_instances()

    # Clean previous nsis bundle folder if exists to prevent os error 1224
    bundle_nsis = root_dir / "frontend" / "src-tauri" / "target" / "release" / "bundle" / "nsis"
    if bundle_nsis.exists():
        try:
            shutil.rmtree(bundle_nsis, ignore_errors=True)
        except Exception:
            pass

    # 2. Build Tauri Desktop App
    log("Step 2/3: Building Web Assets & Tauri Native Binaries...", "[2/3]")
    pnpm_cmd = "corepack pnpm tauri:build" if shutil.which("corepack") else "pnpm tauri:build"
    run_cmd(pnpm_cmd, cwd=root_dir)

    # 3. Output results
    log("Step 3/3: Verifying Generated Installers & Executables...", "[3/3]")
    release_dir = root_dir / "frontend" / "src-tauri" / "target" / "release"
    nsis_installer = release_dir / "bundle" / "nsis" / "GEC ERP_1.0.0_x64-setup.exe"
    msi_installer = release_dir / "bundle" / "msi" / "GEC ERP_1.0.0_x64_en-US.msi"
    standalone_exe = release_dir / "gec-erp.exe"

    print("\n" + "=" * 65)
    print("SUCCESS! Desktop App Built Successfully!")
    print("=" * 65)
    if nsis_installer.exists():
        print(f"  Setup Installer (.exe): {nsis_installer.resolve()}")
    if msi_installer.exists():
        print(f"  MSI Installer (.msi):   {msi_installer.resolve()}")
    if standalone_exe.exists():
        print(f"  Standalone Binary:       {standalone_exe.resolve()}")
    print("=" * 65)

if __name__ == "__main__":
    main()
