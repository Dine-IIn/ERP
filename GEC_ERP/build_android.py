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

def log(msg, symbol="🚀"):
    print(f"\n{symbol} {msg}")

def run_cmd(cmd, cwd=None):
    print(f"  [EXEC] {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"❌ Command failed with returncode {res.returncode}: {cmd}")
        sys.exit(res.returncode)

def main():
    root_dir = Path(__file__).resolve().parent
    os.chdir(root_dir)

    print("=" * 60)
    print("🤖 GEC ERP - Android Mobile App Builder (.APK)")
    print("=" * 60)

    # 1. Build Web Assets
    log("Step 1/4: Building Production Web Assets (Vite)...", "📦")
    run_cmd("corepack pnpm run build" if shutil.which("corepack") else "npm run build")

    # 2. Check and initialize Capacitor
    log("Step 2/4: Verifying Capacitor Android dependencies...", "📱")
    if not (root_dir / "node_modules" / "@capacitor" / "android").exists():
        print("  Installing @capacitor/core and @capacitor/android...")
        run_cmd("npm install @capacitor/core @capacitor/android @capacitor/cli --save-dev")

    # Check if android platform folder exists
    android_dir = root_dir / "android"
    if not android_dir.exists():
        log("Initializing Android platform project scaffold...", "🛠️")
        run_cmd("npx cap add android")

    # 3. Sync Web Assets with Android Project
    log("Step 3/4: Syncing web bundle to Android native container...", "🔄")
    run_cmd("npx cap sync android")

    # 4. Build APK with Gradle
    log("Step 4/4: Compiling Android APK binary with Gradle...", "⚡")
    gradle_cmd = "gradlew.bat assembleDebug" if os.name == "nt" else "./gradlew assembleDebug"
    
    if (android_dir / ("gradlew.bat" if os.name == "nt" else "gradlew")).exists():
        run_cmd(gradle_cmd, cwd=str(android_dir))
        
        apk_path = android_dir / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"
        if apk_path.exists():
            out_apk = root_dir / "GEC_ERP_Mobile_App.apk"
            shutil.copy(str(apk_path), str(out_apk))
            print("\n" + "=" * 60)
            print(f"🎉 SUCCESS! Android APK generated successfully!")
            print(f"📂 Location: {out_apk.resolve()}")
            print(f"📲 You can install this APK on any Android phone/tablet.")
            print("=" * 60)
            return
    
    print("\n" + "=" * 60)
    print("📱 Capacitor Android project synced successfully!")
    print(f"📂 Android Studio Project: {android_dir.resolve()}")
    print("💡 To build APK via Android Studio:")
    print("   Run: npx cap open android")
    print("=" * 60)

if __name__ == "__main__":
    main()
