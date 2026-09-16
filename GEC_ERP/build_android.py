#!/usr/bin/env python3
"""
====================================================================
GEC ERP - Automated Android App (.APK) Build Pipeline
====================================================================
This script automates:
1. Building React + Vite optimized web distribution
2. Synchronizing Capacitor Android native wrapper
3. Compiling Android APK using Gradle
4. Outputting final APK binary location
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

# Force utf-8 standard output if supported
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def log(msg, symbol="[*]"):
    print(f"\n{symbol} {msg}")

def run_cmd(cmd, cwd=None):
    print(f"  [EXEC] {cmd} (in {cwd or '.'})")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"[ERROR] Command failed with returncode {res.returncode}: {cmd}")
        sys.exit(res.returncode)

def main():
    root_dir = Path(__file__).resolve().parent
    frontend_dir = root_dir / "frontend"
    android_dir = frontend_dir / "android"

    print("=" * 60)
    print("GEC ERP - Android Mobile App Builder (.APK)")
    print("=" * 60)

    # Auto-detect Android SDK
    sdk_candidates = [
        os.environ.get("ANDROID_HOME"),
        os.environ.get("ANDROID_SDK_ROOT"),
        "D:\\game dev\\software\\Android_SDK",
        "C:\\Users\\" + os.environ.get("USERNAME", "") + "\\AppData\\Local\\Android\\Sdk",
        "C:\\Android\\Sdk",
    ]
    detected_sdk = None
    for cand in sdk_candidates:
        if cand and Path(cand).exists():
            detected_sdk = Path(cand).resolve()
            break

    if detected_sdk:
        print(f"[+] Detected Android SDK: {detected_sdk}")
        os.environ["ANDROID_HOME"] = str(detected_sdk)
        os.environ["ANDROID_SDK_ROOT"] = str(detected_sdk)
        if android_dir.exists():
            local_props = android_dir / "local.properties"
            escaped_path = str(detected_sdk).replace("\\", "\\\\")
            local_props.write_text(f"sdk.dir={escaped_path}\n", encoding="utf-8")
    else:
        print("[!] Warning: Could not automatically find Android SDK folder.")

    # 1. Build Web Assets
    log("Step 1/4: Building Production Web Assets (Vite)...", "[1/4]")
    build_cmd = "npm run build"
    run_cmd(build_cmd, cwd=str(frontend_dir))

    # 2. Check and initialize Capacitor
    log("Step 2/4: Verifying Capacitor Android scaffold...", "[2/4]")
    cap_bin = frontend_dir / "node_modules" / ".bin" / ("cap.cmd" if os.name == "nt" else "cap")
    cap_exec = f'"{cap_bin}"' if cap_bin.exists() else "npx cap"

    if not android_dir.exists():
        log("Initializing Android platform project scaffold...", "[*]")
        run_cmd(f"{cap_exec} add android", cwd=str(frontend_dir))

    # 3. Sync Web Assets with Android Project
    log("Step 3/4: Syncing web bundle to Android native container...", "[3/4]")
    run_cmd(f"{cap_exec} sync android", cwd=str(frontend_dir))

    # 4. Build APK with Gradle
    log("Step 4/4: Compiling Android APK binary with Gradle...", "[4/4]")
    gradle_cmd = "gradlew.bat assembleDebug" if os.name == "nt" else "./gradlew assembleDebug"
    gradle_wrapper = android_dir / ("gradlew.bat" if os.name == "nt" else "gradlew")
    
    if gradle_wrapper.exists():
        run_cmd(gradle_cmd, cwd=str(android_dir))
        
        apk_path = android_dir / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"
        if apk_path.exists():
            out_apk = root_dir / "GEC_ERP_Mobile_App.apk"
            shutil.copy(str(apk_path), str(out_apk))
            print("\n" + "=" * 60)
            print("[SUCCESS] Android APK generated successfully!")
            print(f"Location: {out_apk.resolve()}")
            print("You can install this APK directly on any Android phone/tablet.")
            print("=" * 60)
            return
    
    print("\n" + "=" * 60)
    print("Capacitor Android project synced successfully!")
    print(f"Android Studio Project: {android_dir.resolve()}")
    print("To build APK via Android Studio:")
    print("   Run: cd frontend && npm run cap:open")
    print("=" * 60)

if __name__ == "__main__":
    main()
