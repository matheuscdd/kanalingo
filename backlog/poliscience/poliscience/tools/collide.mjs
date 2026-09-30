// Teste de colisão: posiciona o carro alinhado com o primeiro obstáculo, acelera
// e verifica o rebote (velocidade negativa, recuo em Z, atordoamento, recuperação).
// Uso: node tools/collide.mjs

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, CdpPage, sleep } from "./cdp.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = 3113;
const OUT_DIR = resolve(ROOT, "tools/out");
mkdirSync(OUT_DIR, { recursive: true });

const server = spawn(process.execPath, [resolve(ROOT, "tools/serve.mjs"), String(PORT)], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((res) => server.stdout.once("data", res));

const browser = await launchBrowser({ profileDir: resolve(OUT_DIR, "profile_collide"), port: 9335 });
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

  // Sem polícia: este teste isola o rebote em obstáculos (a polícia tem tools/police.mjs)
  await page.send("Page.navigate", { url: `http://localhost:${PORT}/?smoke=1&police=0` });
  let ready = false;
  for (let i = 0; i < 600 && !ready; i++) {
    ready = await page.evaluate("!!(window.__game && window.__game.ready)").catch(() => false);
    if (!ready) await sleep(100);
  }
  if (!ready) throw new Error("cena não ficou pronta em 60 s");

  const dbg = async () => JSON.parse(await page.evaluate("JSON.stringify(window.__game.debug())"));

  // Primeiro obstáculo (menor z)
  const first = JSON.parse(
    await page.evaluate(
      "JSON.stringify([...window.__game.obstacles.specs].sort((a,b)=>a.z-b.z)[0])"
    )
  );
  console.log("Primeiro obstáculo:", JSON.stringify(first));

  // Posiciona o carro 30 m antes, alinhado em X
  await page.evaluate(`window.__game.car.teleport(${first.x}, ${first.z - 30})`);
  await sleep(600);
  const s0 = await dbg();
  console.log("Posicionado:", JSON.stringify(s0));
  check(Math.abs(s0.pos.x - first.x) < 0.2 && Math.abs(s0.pos.z - (first.z - 30)) < 0.5, "teleport funcionou");

  // Acelera até bater (poll a cada 50 ms)
  await page.keyDown("w", "KeyW");
  let hit = null;
  let maxZ = -Infinity;
  let speedBefore = 0;
  for (let i = 0; i < 200; i++) {
    const s = await dbg();
    maxZ = Math.max(maxZ, s.pos.z);
    if (s.bounces > 0) {
      hit = s;
      break;
    }
    speedBefore = s.speed;
    await sleep(50);
  }
  check(!!hit, "colisão detectada com obstáculo");
  if (hit) {
    console.log("Batida:", JSON.stringify(hit));
    check(hit.speed < 0, `velocidade ficou negativa após batida (${hit.speed})`);
    check(hit.stun > 0, `atordoamento ativo (${hit.stun}s)`);
    check(speedBefore > 5, `estava em movimento antes (${speedBefore} m/s)`);
    check(hit.pos.z < first.z, `carro ficou antes do obstáculo (z=${hit.pos.z} < ${first.z})`);
    await page.screenshot(resolve(OUT_DIR, "collide_1_hit.png"));

    // Ainda segurando W: durante o stun deve recuar
    await sleep(250);
    const s2 = await dbg();
    console.log("Durante stun:", JSON.stringify(s2));
    check(s2.pos.z < hit.pos.z + 0.5, `recuou em Z (${hit.pos.z} -> ${s2.pos.z})`);

    // Após o stun (0,5 s) com W pressionado deve voltar a acelerar para frente
    await sleep(1500);
    const s3 = await dbg();
    console.log("Após stun:", JSON.stringify(s3));
    // Com W segurado o carro pode ter batido de novo no mesmo obstáculo (stun reativado)
    check(s3.stun === 0 || s3.bounces > 1, `atordoamento expirou ou nova batida (stun=${s3.stun}, bounces=${s3.bounces})`);
    check(s3.speed > 0 || s3.bounces > 1, `voltou a andar para frente ou bateu de novo (speed=${s3.speed}, bounces=${s3.bounces})`);
    check(Math.abs(s3.pos.y - 0.65) < 0.3, `continua no chão (y=${s3.pos.y})`);
    await page.screenshot(resolve(OUT_DIR, "collide_2_after.png"));
  }
  await page.keyUp("w", "KeyW");

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
console.log("OK: rebote funcionando.");
