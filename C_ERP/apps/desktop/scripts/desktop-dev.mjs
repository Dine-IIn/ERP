import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(desktopDir, "../../..");
const port = process.env.NEXAERP_DESKTOP_PORT ?? "3010";
const webUrl = `http://localhost:${port}`;

const server = createServer((request, response) => {
  if (request.url === "/") {
    response.writeHead(302, { Location: webUrl });
    response.end();
    return;
  }

  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ app: "NexaERP Desktop", webUrl }));
});

server.listen(3099, () => {
  console.log(`NexaERP desktop launcher: http://localhost:3099`);
  console.log(`NexaERP web workspace: ${webUrl}`);
});

const command = process.platform === "win32" ? "cmd.exe" : "corepack";

const args =
  process.platform === "win32"
    ? ["/c", "corepack npm run dev --workspace @nexaerp/web -- -p " + port]
    : ["npm", "run", "dev", "--workspace", "@nexaerp/web", "--", "-p", port];

const web = spawn(command, args, {
  cwd: repoRoot,
  stdio: "inherit",
  shell: true
});

const shutdown = () => {
  server.close();
  web.kill();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
web.on("exit", (code) => {
  server.close();
  process.exit(code ?? 0);
});
