// Teste dirigido: abre o jogo headless, simula teclas e verifica que o carro
// acelera, se desloca lateralmente e para. Tira screenshots em tools/out/drive_*.png
// Uso: node tools/drive.mjs

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, CdpPage, sleep } from "./cdp.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = 3112;
const OUT_DIR = resolve(ROOT, "tools/out");
mkdirSync(OUT_DIR, { recursive: true });

const server = spawn(process.execPath, [resolve(ROOT, "tools/serve.mjs"), String(PORT)], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((res) => server.stdout.once("data", res));

const browser = await launchBrowser({ profileDir: resolve(OUT_DIR, "profile_drive"), port: 9334 });
const consoleLines = [];
const failures = [];
const check = (cond, msg) => {
  console.log(`${cond ? "✔" : "✖"} ${msg}`);
  if (!cond) failures.push(msg);
};

try {
  const page = await CdpPage.connect(browser.port);
  await page.send("Runtime.enable");
  await page.send("Page.enable");
  await page.send("Log.enable");
  page.on("Runtime.consoleAPICalled", (p) => {
    consoleLines.push(`[${p.type}] ${p.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
  });
  page.on("Runtime.exceptionThrown", (p) => {
    consoleLines.push(`[exception] ${p.exceptionDetails.exception?.description || p.exceptionDetails.text}`);
  });
  page.on("Log.entryAdded", (p) => {
    if (p.entry.level === "error") consoleLines.push(`[log-error] ${p.entry.text} ${p.entry.url || ""}`);
  });

  // Sem obstáculos: este teste valida só a direção (colisão é testada em collide.mjs)
  await page.send("Page.navigate", { url: `http://localhost:${PORT}/?smoke=1&obstacles=0&police=0` });
  let ready = false;
  for (let i = 0; i < 600 && !ready; i++) {
    ready = await page.evaluate("!!(window.__game && window.__game.ready)").catch(() => false);
    if (!ready) await sleep(100);
  }
  if (!ready) throw new Error("cena não ficou pronta em 60 s");

  const dbg = async () => JSON.parse(await page.evaluate("JSON.stringify(window.__game.debug())"));

  // Deixa o carro assentar no chão
  await sleep(1500);
  const s0 = await dbg();
  console.log("Inicial:", JSON.stringify(s0));
  check(Math.abs(s0.pos.y - 0.65) < 0.2, `carro assentado no chão (y=${s0.pos.y})`);
  check(s0.speedKmh === 0, "parado no início");

  // Parado, segurar para o lado só vira as rodas: o carro não se desloca nem gira.
  // (A corrida começa com esse input; a largada não depende de acelerar.)
  await page.keyDown("d", "KeyD");
  await sleep(1000);
  const sSide = await dbg();
  await page.keyUp("d", "KeyD");
  console.log("Parado + D 1s:", JSON.stringify({ pos: sSide.pos, heading: sSide.heading, pose: sSide.pose }));
  check(Math.abs(sSide.pos.x - s0.pos.x) < 0.02, `parado não anda de lado (x ${s0.pos.x} -> ${sSide.pos.x})`);
  check(Math.abs(sSide.pos.z - s0.pos.z) < 0.02, `parado não anda para frente (z ${s0.pos.z} -> ${sSide.pos.z})`);
  check(Math.abs(sSide.heading) < 1e-3, `parado o corpo não gira (heading ${sSide.heading})`);
  check(sSide.pose.steer > 0.3, `mas as rodas esterçam (${sSide.pose.steer} rad)`);
  await sleep(600); // rodas voltam ao centro

  // Devagar, o deslocamento lateral é pequeno: ~1 s a poucos km/h
  await page.keyDown("w", "KeyW");
  await sleep(250);
  await page.keyUp("w", "KeyW");
  const sSlow0 = await dbg();
  await page.holdKey("d", "KeyD", 800);
  const sSlow1 = await dbg();
  console.log("Devagar + D 0.8s:", JSON.stringify({ speed: sSlow0.speed, x0: sSlow0.pos.x, x1: sSlow1.pos.x, heading: sSlow1.heading }));
  const slowDx = sSlow1.pos.x - sSlow0.pos.x;
  check(slowDx > 0 && slowDx < 1.5, `devagar desloca pouco para o lado (${slowDx.toFixed(2)} m a ${sSlow0.speed} m/s)`);
  check(sSlow1.heading > 0.02, `devagar o nariz aponta para o lado (heading ${sSlow1.heading})`);
  await page.evaluate("window.__game.restart()");
  await sleep(600);

  // Acelera com W por 3 s
  await page.holdKey("w", "KeyW", 3000);
  const s1 = await dbg();
  console.log("Após W 3s:", JSON.stringify(s1));
  check(s1.speed > 20, `acelerou (speed=${s1.speed} m/s)`);
  check(s1.pos.z > s0.pos.z + 20, `avançou na pista (z=${s1.pos.z})`);
  check(String(s1.speedKmh) === s1.hudSpeed, `velocímetro mostra ${s1.hudSpeed} km/h`);
  check(s1.cameraFov > s0.cameraFov, `FOV abriu com a velocidade (${s0.cameraFov} -> ${s1.cameraFov})`);
  await page.screenshot(resolve(OUT_DIR, "drive_1_accel.png"));

  // Vira à direita com seta por 1 s (mantendo acelerador)
  await page.keyDown("ArrowUp", "ArrowUp");
  await page.holdKey("ArrowRight", "ArrowRight", 1000);
  const s2 = await dbg();
  console.log("Após → 1s:", JSON.stringify(s2));
  check(s2.pos.x > s1.pos.x + 1, `deslocou para a direita (x=${s2.pos.x})`);
  check(s2.speed >= s1.speed, "seta ↑ também acelera");

  // Vira à esquerda com A por 2,5 s: deve cruzar o centro e parar na parede esquerda
  await page.holdKey("a", "KeyA", 2500);
  await page.keyUp("ArrowUp", "ArrowUp");
  const s3 = await dbg();
  console.log("Após A 2.5s:", JSON.stringify(s3));
  check(s3.pos.x < -4, `foi para a esquerda (x=${s3.pos.x})`);
  check(s3.pos.x > -7.5, `não atravessou a parede (x=${s3.pos.x})`);
  check(Math.abs(s3.pos.y - 0.65) < 0.3, `continua no chão (y=${s3.pos.y})`);
  await page.screenshot(resolve(OUT_DIR, "drive_2_left.png"));

  // Freia com S até parar
  await page.holdKey("s", "KeyS", 2500);
  const s4 = await dbg();
  console.log("Após S 2.5s:", JSON.stringify(s4));
  check(s4.speed <= 0, `freou/deu ré (speed=${s4.speed})`);

  // Reset com R
  await page.holdKey("r", "KeyR", 100);
  await sleep(500);
  const s5 = await dbg();
  console.log("Após R:", JSON.stringify(s5));
  check(Math.abs(s5.pos.z - 2) < 1 && Math.abs(s5.pos.x) < 0.5, `reset voltou à largada (${s5.pos.x}, ${s5.pos.z})`);
  check(s5.speedKmh === 0, "reset zerou velocidade");

  page.close();
} catch (err) {
  console.error("FALHOU:", err.message);
  failures.push(err.message);
} finally {
  browser.kill();
  server.kill();
}

console.log("\n--- Console do navegador ---");
for (const l of consoleLines) console.log(l);
console.log("--- fim ---\n");

const errors = consoleLines.filter((l) => /^\[(error|exception|log-error)\]/.test(l));
if (errors.length) failures.push(`${errors.length} erro(s) de console`);

if (failures.length) {
  console.error(`FALHOU (${failures.length}):\n - ` + failures.join("\n - "));
  process.exit(1);
}
console.log("OK: carro dirigível.");
