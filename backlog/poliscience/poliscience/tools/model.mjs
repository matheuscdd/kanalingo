// Inspeção do modelo do carro: carrega o jogo, verifica que o .glb foi aplicado
// e tira screenshots de lado/frente/chase para conferir orientação e escala.
// Uso: node tools/model.mjs [--flip]

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, CdpPage, sleep } from "./cdp.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = 3114;
const OUT_DIR = resolve(ROOT, "tools/out");
const FLIP = process.argv.includes("--flip");
mkdirSync(OUT_DIR, { recursive: true });

const server = spawn(process.execPath, [resolve(ROOT, "tools/serve.mjs"), String(PORT)], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((res) => server.stdout.once("data", res));

const browser = await launchBrowser({ profileDir: resolve(OUT_DIR, "profile_model"), port: 9336 });
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

  await page.send("Page.navigate", { url: `http://localhost:${PORT}/?smoke=1&police=0${FLIP ? "&flip=1" : ""}` });
  let ready = false;
  for (let i = 0; i < 900 && !ready; i++) {
    ready = await page.evaluate("!!(window.__game && window.__game.ready)").catch(() => false);
    if (!ready) await sleep(100);
  }
  if (!ready) throw new Error("cena não ficou pronta em 90 s");

  const dbg = async () => JSON.parse(await page.evaluate("JSON.stringify(window.__game.debug())"));
  await sleep(1000);
  const s = await dbg();
  console.log("Modelo:", JSON.stringify(s.model));
  check(s.model.loaded === true, "modelo .glb carregado");
  if (s.model.loaded) {
    check(Math.abs(s.model.size.z - 4.5) < 0.05, `comprimento normalizado ~4.5 m (${s.model.size.z?.toFixed(2)})`);
    check(s.model.size.x > 1.2 && s.model.size.x < 2.6, `largura plausível (${s.model.size.x?.toFixed(2)} m)`);
    check(s.model.size.y > 0.8 && s.model.size.y < 1.8, `altura plausível (${s.model.size.y?.toFixed(2)} m)`);
    check(s.model.wheelCount >= 3, `rodas detectadas para girar (${s.model.wheelCount})`);
  }

  // Anda um pouco para as rodas girarem e o carro assentar, depois para
  await page.holdKey("w", "KeyW", 700);
  await sleep(1500);
  const s2 = await dbg();
  check(Math.abs(s2.pos.y - 0.65) < 0.3, `carro continua assentado após andar (y=${s2.pos.y})`);

  const p = s2.pos;
  // Lado direito do carro, olhando para -X; a frente do carro (+Z) fica à DIREITA da imagem
  await page.evaluate(`window.__game.viewFrom([${p.x + 7}, ${p.y + 1.5}, ${p.z}], [${p.x}, ${p.y}, ${p.z}])`);
  await sleep(400);
  await page.screenshot(resolve(OUT_DIR, "model_1_side.png"));

  // De frente (câmera em +Z olhando para -Z)
  await page.evaluate(`window.__game.viewFrom([${p.x}, ${p.y + 1.2}, ${p.z + 7}], [${p.x}, ${p.y}, ${p.z}])`);
  await sleep(400);
  await page.screenshot(resolve(OUT_DIR, "model_2_front.png"));

  // Chase cam normal
  await page.evaluate("window.__game.viewChase()");
  await sleep(400);
  await page.screenshot(resolve(OUT_DIR, "model_3_chase.png"));

  // --- Esterço parado: segura D, olha de frente/acima para ver as rodas viradas ---
  await page.keyDown("d", "KeyD");
  await sleep(600);
  const sSteer = await dbg();
  check(sSteer.pose.steer > 0.3, `rodas esterçam parado (steer=${sSteer.pose.steer} rad)`);
  check(Math.abs(sSteer.pose.yaw) < 0.05, `corpo quase não guina parado (yaw=${sSteer.pose.yaw})`);
  const q = sSteer.pos;
  // Vista frontal baixa em três quartos: a roda dianteira esquerda fica visível
  await page.evaluate(`window.__game.viewFrom([${q.x - 3.2}, ${q.y + 0.7}, ${q.z + 4.8}], [${q.x}, ${q.y - 0.3}, ${q.z + 1.6}])`);
  await sleep(300);
  await page.screenshot(resolve(OUT_DIR, "model_4_steer_front.png"));
  await page.keyUp("d", "KeyD");
  await page.evaluate("window.__game.viewChase()");

  // --- Troca de faixa em velocidade: nariz guina para a direita, rolagem sutil ---
  await page.evaluate("window.__game.car.teleport(-3, 20)");
  await sleep(300);
  await page.keyDown("w", "KeyW");
  await sleep(1500);
  await page.keyDown("d", "KeyD");
  // Rolagem e esterço aparecem enquanto o carro gira; em diagonal reta somem
  let maxRoll = 0;
  let maxSteer = 0;
  for (let i = 0; i < 6; i++) {
    const p = (await dbg()).pose;
    maxRoll = Math.max(maxRoll, p.roll);
    maxSteer = Math.max(maxSteer, p.steer);
    if (i === 1) await page.screenshot(resolve(OUT_DIR, "model_5_turn_chase.png"));
    await sleep(80);
  }
  await sleep(200);
  const sTurn = await dbg();
  console.log("Pose em curva:", JSON.stringify(sTurn.pose), "heading:", sTurn.heading, "vx:", sTurn.vx, "speed:", sTurn.speed, "picos:", { maxRoll, maxSteer });
  check(sTurn.pose.yaw > 0.05 && sTurn.pose.yaw <= 0.3, `nariz guina para a direita em velocidade (yaw=${sTurn.pose.yaw})`);
  check(sTurn.pose.yaw === sTurn.heading, "corpo aponta para onde o carro vai (yaw = heading)");
  check(maxRoll > 0 && maxRoll <= 0.04, `rolagem sutil para fora durante a curva (pico ${maxRoll})`);
  check(maxSteer > 0, `rodas esterçadas durante a curva (pico ${maxSteer})`);
  await page.keyUp("d", "KeyD");
  await page.keyUp("w", "KeyW");

  // Frenagem: nariz mergulha
  await page.keyDown("s", "KeyS");
  await sleep(300);
  const sBrake = await dbg();
  check(sBrake.pose.pitch > 0, `frear mergulha o nariz (pitch=${sBrake.pose.pitch})`);
  await page.keyUp("s", "KeyS");

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
console.log("OK: modelo aplicado. Screenshots em tools/out/model_*.png");
