import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(desktopDir, "../..");

const requiredFiles = [
  resolve(repoRoot, "apps/web/package.json"),
  resolve(repoRoot, "apps/web/app/page.tsx"),
  resolve(desktopDir, "scripts/desktop-dev.mjs")
];

await Promise.all(requiredFiles.map((file) => access(file)));
console.log("desktop node launcher ok");
