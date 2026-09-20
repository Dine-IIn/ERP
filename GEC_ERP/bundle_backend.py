import subprocess
import os
from pathlib import Path

def bundle_backend(root_dir: Path):
    backend_dir = root_dir / "backend"
    dist_dir = backend_dir / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)
    
    out_file = dist_dir / "server.mjs"
    
    esbuild_exe = root_dir / "node_modules" / ".bin" / "esbuild.cmd"
    if not esbuild_exe.exists():
        esbuild_exe = Path(r"D:\ERP\GEC_ERP\node_modules\.bin\esbuild.cmd")
        
    cmd = [
        str(esbuild_exe),
        str(backend_dir / "src" / "server.js"),
        "--bundle",
        "--platform=node",
        "--target=node20",
        "--format=esm",
        f"--outfile={out_file}"
    ]
    
    print(f"Bundling backend {backend_dir / 'src' / 'server.js'} -> {out_file}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("STDOUT:", res.stdout)
    if res.stderr:
        print("STDERR:", res.stderr)
    if res.returncode != 0:
        raise RuntimeError(f"esbuild failed with code {res.returncode}")
    print(f"✅ Standalone Backend Bundle created successfully! Size: {out_file.stat().st_size / (1024*1024):.2f} MB")

if __name__ == "__main__":
    bundle_backend(Path(r"D:\ERP\GEC_ERP"))
