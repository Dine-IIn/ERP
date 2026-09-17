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

def kill_running_instances(root_dir):
    """
    Forcefully terminates any active GEC ERP app instances, installers,
    or makensis compilers to ensure Windows file locks are completely released.
    """
    # 1. Standard taskkill by exact executable names
    kill_targets = [
        "gec-erp.exe",
        "GEC ERP.exe",
        "GEC ERP_1.0.0_x64-setup.exe",
        "makensis.exe",
        "tauri.exe"
    ]
    for proc in kill_targets:
        subprocess.run(f'taskkill /F /IM "{proc}" /T', capture_output=True, shell=True)

    # 2. PowerShell wildcard process killer for any lingering subprocesses (Edge WebView2, background workers)
    ps_killer = (
        'powershell -NoProfile -Command "'
        'Get-Process -ErrorAction SilentlyContinue | '
        'Where-Object { $_.ProcessName -match \'(?i)gec|makensis\' } | '
        'Stop-Process -Force -ErrorAction SilentlyContinue"'
    )
    subprocess.run(ps_killer, capture_output=True, shell=True)
    time.sleep(1.5)

    # 3. Clean up locked release binaries and NSIS bundles
    release_dir = root_dir / "frontend" / "src-tauri" / "target" / "release"
    if release_dir.exists():
        # Clean deps
        deps_dir = release_dir / "deps"
        if deps_dir.exists():
            for f in deps_dir.glob("gec_erp*"):
                try:
                    f.unlink(missing_ok=True)
                except Exception:
                    pass

        # Clean release executables
        for f in release_dir.glob("gec-erp.*"):
            try:
                f.unlink(missing_ok=True)
            except Exception:
                pass

        # Clean previous NSIS setup executables
        nsis_bundle = release_dir / "bundle" / "nsis"
        if nsis_bundle.exists():
            for f in nsis_bundle.glob("*.exe"):
                for _ in range(3):
                    try:
                        f.unlink(missing_ok=True)
                        break
                    except PermissionError:
                        subprocess.run(ps_killer, capture_output=True, shell=True)
                        time.sleep(1)

def run_build_with_retry(pnpm_cmd, frontend_dir, root_dir, max_retries=3):
    for attempt in range(1, max_retries + 1):
        print(f"  [EXEC] {pnpm_cmd} (Attempt {attempt}/{max_retries})")
        res = subprocess.run(pnpm_cmd, shell=True, cwd=str(frontend_dir))
        if res.returncode == 0:
            return True
        print(f"\n[WARN] Build attempt {attempt} encountered lock or exit code {res.returncode}. Terminating running processes and retrying...")
        kill_running_instances(root_dir)
        time.sleep(2)
    
    print(f"\n[ERROR] Build failed after {max_retries} attempts: {pnpm_cmd}")
    sys.exit(1)

def main():
    root_dir = Path(__file__).resolve().parent
    os.chdir(root_dir)

    print("=" * 65)
    print("GEC ERP - Windows Desktop Application Builder (Tauri .EXE / .MSI)")
    print("=" * 65)

    # 1. Release locks
    log("Step 1/3: Clearing any running instances & file locks...", "[1/3]")
    kill_running_instances(root_dir)

    # 2. Build Tauri Desktop App
    log("Step 2/3: Building Web Assets & Tauri Native Binaries...", "[2/3]")
    frontend_dir = root_dir / "frontend"
    pnpm_cmd = "corepack pnpm tauri build" if shutil.which("corepack") else "pnpm tauri build"
    run_build_with_retry(pnpm_cmd, frontend_dir, root_dir)

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
