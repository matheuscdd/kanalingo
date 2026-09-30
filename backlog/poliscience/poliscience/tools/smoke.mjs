// Smoke test: serve o jogo, abre no Chrome headless via DevTools Protocol,
// espera a cena ficar pronta, roda alguns segundos, captura console e screenshot.
// Uso: node tools/smoke.mjs [--wait=ms]

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, CdpPage, sleep } from "./cdp.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = 3111;
const OUT_DIR = resolve(ROOT, "tools/out");
const waitArg = process.argv.find((a) => a.startsWith("--wait="));
const WAIT_MS = waitArg ? Number(waitArg.split("=")[1]) : 4000;

mkdirSync(OUT_DIR, { recursive: true });

const server = spawn(process.execPath, [resolve(ROOT, "tools/serve.mjs"), String(PORT)], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((res) => server.stdout.once("data", res));

const browser = await launchBrowser({ profileDir: resolve(OUT_DIR, "profile") });
const consoleLines = [];
let exitCode = 0;

try {
  const page = await CdpPage.connect(browser.port);
  await page.send("Runtime.enable");
  await page.send("Page.enable");
  await page.send("Log.enable");

  page.on("Runtime.consoleAPICalled", (p) => {
    const text = p.args.map((a) => a.value ?? a.description ?? "").join(" ");
    consoleLines.push(`[${p.type}] ${text}`);
  });
  page.on("Runtime.exceptionThrown", (p) => {
    consoleLines.push(`[exception] ${p.exceptionDetails.exception?.description || p.exceptionDetails.text}`);
  });
  page.on("Log.entryAdded", (p) => {
    if (p.entry.level === "error") consoleLines.push(`[log-error] ${p.entry.text} ${p.entry.url || ""}`);
  });

  const url = `http://localhost:${PORT}/?smoke=1`;
  console.log(`Abrindo ${url}`);
  await page.send("Page.navigate", { url });

  // Espera a cena ficar pronta (window.__game.ready) por até 60 s
  let ready = false;
  for (let i = 0; i < 600; i++) {
    ready = await page.evaluate("!!(window.__game && window.__game.ready)").catch(() => false);
    if (ready) break;
    await sleep(100);
  }
  if (!ready) throw new Error("cena não ficou pronta em 60 s");
  console.log("Cena pronta. Rodando...");

  await sleep(WAIT_MS);

  const info = await page.evaluate("JSON.stringify(window.__game.debug())");
  console.log("Estado:", info);

  await page.screenshot(resolve(OUT_DIR, "smoke.png"));
  page.close();
} catch (err) {
  console.error("FALHOU:", err.message);
  exitCode = 1;
} finally {
  browser.kill();
  server.kill();
}

console.log("\n--- Console do navegador ---");
for (const l of consoleLines) console.log(l);
console.log("--- fim ---\n");

const errors = consoleLines.filter((l) => /^\[(error|exception|log-error)\]/.test(l));
if (errors.length) {
  console.error(`FALHOU: ${errors.length} erro(s) de console.`);
  exitCode = 1;
}
if (exitCode === 0) console.log("OK: cena pronta sem erros. Screenshot em tools/out/smoke.png");
process.exit(exitCode);
