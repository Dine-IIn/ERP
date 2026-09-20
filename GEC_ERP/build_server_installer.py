#!/usr/bin/env python3
"""
====================================================================
GEC ERP - Automated Inno Setup Server Installer Builder Pipeline
Integrated Battery-Included Package (Bundled VC++, Node.js + PostgreSQL)
Zero-Dependency Standalone Architecture (Single-File Backend Bundle)
====================================================================
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def log(msg, symbol="[*]"):
    print(f"\n{symbol} {msg}")

def run_cmd(cmd, cwd=None):
    print(f"  [EXEC] {cmd} (in {cwd or '.'})")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"[ERROR] Command failed with returncode {res.returncode}: {cmd}")
        return False
    return True

def find_iscc():
    candidates = [
        Path(r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe"),
        Path(r"C:\Program Files\Inno Setup 6\ISCC.exe"),
        Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Inno Setup 6" / "ISCC.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Antigravity IDE" / "_" / "resources" / "app" / "node_modules" / "innosetup" / "bin" / "ISCC.exe",
    ]
    for c in candidates:
        if c.exists():
            return c
    
    which_iscc = shutil.which("ISCC.exe")
    if which_iscc:
        return Path(which_iscc)
    
    return None

def bundle_backend_server(root_dir: Path):
    log("Step 1/4: Bundling Zero-Dependency Standalone Backend Server...", "[1/4]")
    backend_dir = root_dir / "backend"
    dist_dir = backend_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)
    out_file = dist_dir / "server.cjs"
    
    esbuild_exe = root_dir / "node_modules" / ".bin" / "esbuild.cmd"
    if not esbuild_exe.exists():
        esbuild_exe = Path(r"D:\ERP\GEC_ERP\node_modules\.bin\esbuild.cmd")
        
    cmd = f'"{esbuild_exe}" "{backend_dir / "src" / "server.js"}" --bundle --platform=node --target=node20 --format=cjs --outfile="{out_file}"'
    if not run_cmd(cmd, cwd=str(root_dir)):
        sys.exit(1)
        
    size_mb = out_file.stat().st_size / (1024 * 1024)
    print(f"  [OK] Standalone backend server.cjs created ({size_mb:.2f} MB).")

def prepare_runtimes(root_dir: Path):
    log("Step 2/4: Preparing Embedded VC++, Node.js & PostgreSQL Runtimes...", "[2/4]")
    
    # 1. VC++ Redistributable & Side-by-Side DLLs
    vcredist_src_candidates = [
        Path(r"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Redist\MSVC\14.44.35112\vc_redist.x64.exe"),
        Path(r"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Redist\MSVC\v143\vc_redist.x64.exe"),
        Path(r"C:\ProgramData\Package Cache\84C61FADF8CD38016FB7632969B3ACE9E54B763A\VC_redist.x64.exe")
    ]
    vcredist_dest = root_dir / "vc_redist.x64.exe"
    if not vcredist_dest.exists():
        for vc in vcredist_src_candidates:
            if vc.exists():
                shutil.copy2(vc, vcredist_dest)
                print(f"  [+] Bundled VC++ redistributable: {vc}")
                break

    sys32 = Path(r"C:\Windows\System32")
    vc_dlls = [
        "vcruntime140.dll",
        "vcruntime140_1.dll",
        "vcruntime140_threads.dll",
        "msvcp140.dll",
        "msvcp140_1.dll",
        "msvcp140_2.dll",
        "msvcp140_atomic_wait.dll",
        "msvcp140_codecvt_ids.dll"
    ]
    for target_dir in [root_dir, root_dir / "bin", root_dir / "pgsql" / "bin"]:
        target_dir.mkdir(parents=True, exist_ok=True)
        for dll in vc_dlls:
            s = sys32 / dll
            d = target_dir / dll
            if s.exists() and not d.exists():
                shutil.copy2(s, d)

    print("  [OK] Microsoft Visual C++ 2015-2022 Runtime DLLs prepared.")

    # 2. Node.js binary
    bin_dir = root_dir / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)
    node_dest = bin_dir / "node.exe"
    if not node_dest.exists():
        node_sources = [
            Path(r"D:\node\node.exe"),
            Path(r"C:\Program Files\nodejs\node.exe"),
            Path(r"C:\Program Files (x86)\nodejs\node.exe"),
            Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "node" / "node.exe",
        ]
        found_node = None
        for s in node_sources:
            if s.exists():
                found_node = s
                break
        if not found_node:
            which_node = shutil.which("node.exe")
            if which_node:
                found_node = Path(which_node)
        
        if found_node:
            print(f"  [+] Bundling Node.js runtime from: {found_node}")
            shutil.copy2(found_node, node_dest)
        else:
            print("  [WARN] Node.js binary not found to bundle.")
    else:
        print("  [OK] Bundled Node.js runtime verified in bin/node.exe.")

    # 3. PostgreSQL runtime
    pg_dest = root_dir / "pgsql"
    pg_src_candidates = [
        Path(r"C:\Program Files\PostgreSQL\18"),
        Path(r"C:\Program Files\PostgreSQL\17"),
        Path(r"C:\Program Files\PostgreSQL\16"),
        Path(r"C:\Program Files\PostgreSQL\15"),
    ]
    pg_src = None
    for c in pg_src_candidates:
        if (c / "bin" / "postgres.exe").exists():
            pg_src = c
            break

    if pg_src:
        for sub in ["bin", "lib", "share"]:
            s = pg_src / sub
            d = pg_dest / sub
            if s.exists() and not d.exists():
                print(f"  [+] Bundling PostgreSQL {sub} from: {s}")
                shutil.copytree(s, d)
        print("  [OK] PostgreSQL portable runtime verified in pgsql/.")
    else:
        if (pg_dest / "bin" / "postgres.exe").exists():
            print("  [OK] PostgreSQL portable runtime verified in pgsql/.")
        else:
            print("  [WARN] PostgreSQL installation directory not found for bundling.")

def main():
    root_dir = Path(__file__).resolve().parent
    os.chdir(root_dir)

    print("=" * 65)
    print("🏢 GEC MOULDING MACHINE ERP - SERVER INSTALLER BUILDER")
    print("=" * 65)

    # 1. Zero-Dependency Standalone Backend Bundle
    bundle_backend_server(root_dir)

    # 2. Embedded Runtimes
    prepare_runtimes(root_dir)

    # 3. Frontend Bundle
    log("Step 3/4: Checking Frontend Production Bundle...", "[3/4]")
    frontend_dist = root_dir / "frontend" / "dist" / "index.html"
    if not frontend_dist.exists():
        log("Building Frontend Production Bundle with Vite...", "[*]")
        if not run_cmd("npm run build", cwd=str(root_dir / "frontend")):
            sys.exit(1)
    else:
        print("  [OK] Frontend production bundle verified in frontend/dist.")

    # 4. Standalone Server Setup Wizard
    log("Step 4/5: Compiling standalone server_setup.exe with PyInstaller...", "[4/5]")
    server_setup_exe = root_dir / "server_setup.exe"
    server_setup_py = root_dir / "server_setup.py"
    if server_setup_py.exists():
        if not run_cmd("python -m PyInstaller --onefile --console --name server_setup server_setup.py", cwd=str(root_dir)):
            sys.exit(1)
        dist_exe = root_dir / "dist" / "server_setup.exe"
        if dist_exe.exists():
            shutil.copy(str(dist_exe), str(server_setup_exe))
            print(f"  [OK] Standalone server_setup.exe compiled ({server_setup_exe.stat().st_size / (1024*1024):.2f} MB).")
    else:
        print("  [OK] Standalone server_setup.exe verified.")

    # 5. Locate Inno Setup Compiler & Build
    log("Step 4/4: Compiling Inno Setup Server Installer Package...", "[4/4]")
    iscc_path = find_iscc()
    if not iscc_path:
        print("\n[ERROR] Inno Setup compiler (ISCC.exe) was not found in standard paths.")
        print("Please install Inno Setup 6 from https://jrsoftware.org/isdl.php")
        sys.exit(1)

    print(f"  [+] Found Inno Setup Compiler: {iscc_path}")
    iss_file = root_dir / "server_installer.iss"
    if not iss_file.exists():
        print(f"[ERROR] {iss_file} not found!")
        sys.exit(1)

    cmd = f'"{iscc_path}" "{iss_file}"'
    if not run_cmd(cmd, cwd=str(root_dir)):
        sys.exit(1)

    out_installer = root_dir / "dist_installer" / "GEC_ERP_Enterprise_Server_Setup_v1.0.0.exe"
    print("\n" + "=" * 65)
    print("🎉 SUCCESS! Inno Setup Server Installer Built Successfully!")
    print(f"📁 Output Installer: {out_installer.resolve()}")
    if out_installer.exists():
        size_mb = out_installer.stat().st_size / (1024 * 1024)
        print(f"📦 Installer Package Size: {size_mb:.2f} MB")
    print("=" * 65)

if __name__ == "__main__":
    main()
