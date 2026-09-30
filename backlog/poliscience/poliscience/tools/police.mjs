// Teste da viatura no navegador (Havok real):
//  A) retrovisor espelhado, giroflex, atraso da largada, perseguição, encurralar e "pego"
//  B) batida carro-carro (a viatura acerta a traseira do jogador parado)
//  C) com obstáculos: a viatura atravessa o campo sem bater e pega o jogador parado
// Screenshots em tools/out/police_*.png
// Uso: node tools/police.mjs

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, CdpPage, sleep } from "./cdp.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = 3116;
const OUT_DIR = resolve(ROOT, "tools/out");
mkdirSync(OUT_DIR, { recursive: true });

const server = spawn(process.execPath, [resolve(ROOT, "tools/serve.mjs"), String(PORT)], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((res) => server.stdout.once("data", res));

const browser = await launchBrowser({ profileDir: resolve(OUT_DIR, "profile_police"), port: 9338 });
const consoleLines = [];
const failures = [];
const check = (cond, msg) => {
  console.log(`${cond ? "✔" : "✖"} ${msg}`);
  if (!cond) failures.push(msg);
};
const shot = (page, name) => page.screenshot(resolve(OUT_DIR, `police_${name}.png`));

async function open(page, query) {
  await page.send("Page.navigate", { url: `http://localhost:${PORT}/?smoke=1&${query}` });
  let ready = false;
  for (let i = 0; i < 600 && !ready; i++) {
    ready = await page.evaluate("!!(window.__game && window.__game.ready)").catch(() => false);
    if (!ready) await sleep(100);
  }
  if (!ready) throw new Error("cena não ficou pronta em 60 s");
  await sleep(800);
}

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

  const dbg = async () => JSON.parse(await page.evaluate("JSON.stringify(window.__game.debug())"));
  const gapOf = (s) => s.pos.z - s.police.pos.z;

  // ================= A) perseguição sem obstáculos =================
  console.log("\n== A) perseguição ==");
  await open(page, "obstacles=0");
  let s = await dbg();
  check(!!s.police, "viatura criada");
  check(s.police.model?.loaded === true, "modelo da viatura carregado");
  check(s.cameras.includes("mirrorCam"), `retrovisor ativo (${s.cameras.join(", ")})`);
  check(s.police.mode === "idle" && Math.abs(s.police.pos.z + 26) < 1, `viatura parada atrás (z=${s.police.pos.z})`);
  check(s.police.hudDistance === `${Math.round(s.police.distance)} m`, `HUD mostra a distância (${s.police.hudDistance})`);

  // Giroflex alterna
  const phases = new Set();
  for (let i = 0; i < 8; i++) {
    phases.add((await dbg()).police.sirenPhase);
    await sleep(110);
  }
  check(phases.size === 2, `giroflex alterna (${[...phases].join(",")})`);

  // Retrovisor espelhado: viatura à DIREITA do jogador (x>0) deve aparecer à direita no espelho
  await page.evaluate("window.__game.police.car.teleport(4.2, -14)");
  await sleep(700);
  await shot(page, "0_mirror_right");
  await page.evaluate("window.__game.restart()");
  await sleep(500);

  // Largada: a viatura espera o atraso
  await page.keyDown("w", "KeyW");
  await sleep(700);
  s = await dbg();
  check(s.race.phase === "racing", "corrida começou");
  check(!s.police.active && Math.abs(s.police.speed) < 0.5, `viatura espera o atraso da largada (elapsed=${s.race.elapsed})`);

  await sleep(3500);
  const sChase1 = await dbg();
  console.log("Perseguição:", JSON.stringify(sChase1.police), "jogador z:", sChase1.pos.z);
  check(sChase1.police.active && sChase1.police.mode === "chase", `viatura em perseguição (${sChase1.police.mode})`);
  check(sChase1.police.speed > 25, `viatura acelerou (${sChase1.police.speed} m/s)`);
  await shot(page, "1_chase");

  await sleep(5000);
  const sChase2 = await dbg();
  console.log("Perseguição +5s:", JSON.stringify(sChase2.police), "jogador z:", sChase2.pos.z, "v:", sChase2.speed);
  check(gapOf(sChase2) < gapOf(sChase1), `viatura se aproxima (${gapOf(sChase1).toFixed(1)} -> ${gapOf(sChase2).toFixed(1)} m)`);
  check(Math.abs(sChase2.police.pos.x - sChase2.pos.x) < 1.2, `viatura na faixa do jogador (dx=${(sChase2.police.pos.x - sChase2.pos.x).toFixed(2)})`);
  check(Math.abs(sChase2.police.pos.y - 0.65) < 0.3, `viatura no chão (y=${sChase2.police.pos.y})`);
  await page.keyUp("w", "KeyW");

  // Para o carro: a viatura encosta ao lado e o medidor enche
  await page.holdKey("s", "KeyS", 1800);
  let busted = null;
  let sawBox = false;
  let maxBust = 0;
  for (let i = 0; i < 100; i++) {
    const t = await dbg();
    sawBox ||= t.police.mode === "box";
    maxBust = Math.max(maxBust, t.police.bust);
    if (t.race.phase === "busted") {
      busted = t;
      break;
    }
    if (i === 12) await shot(page, "2_boxing");
    await sleep(100);
  }
  check(sawBox, "viatura entrou no modo encurralar");
  check(!!busted, `jogador foi pego (medidor máx ${maxBust.toFixed(2)})`);
  if (busted) {
    console.log("Pego:", JSON.stringify(busted.police), "jogador:", JSON.stringify(busted.pos));
    const dx = Math.abs(busted.police.pos.x - busted.pos.x);
    check(dx > 2.1, `viatura ao lado do jogador, não atrás (dx=${dx.toFixed(2)})`);
    check(busted.police.rams === 0, `encostou sem bater (${busted.police.rams} batidas)`);
    check(/Pego/.test(busted.message ?? ""), "mensagem de 'pego' visível");
    check(busted.controlsEnabled === false, "controles do jogador desligados");
    check(busted.police.hudBust === "100", `medidor do HUD cheio (${busted.police.hudBust}%)`);
    await sleep(500);
    await shot(page, "3_busted");

    const zBefore = busted.pos.z;
    await page.holdKey("w", "KeyW", 1000);
    const after = await dbg();
    check(Math.abs(after.pos.z - zBefore) < 1.5, `acelerar não move o carro depois de pego (${zBefore} -> ${after.pos.z})`);
  }

  await page.holdKey("r", "KeyR", 100);
  await sleep(600);
  s = await dbg();
  check(s.race.phase === "ready" && s.controlsEnabled, "R reinicia e devolve os controles");
  check(Math.abs(s.police.pos.z + 26) < 1 && s.police.bust === 0 && s.police.mode === "idle", `viatura de volta à largada (z=${s.police.pos.z})`);

  // ================= B) batida carro-carro =================
  console.log("\n== B) batida ==");
  await page.holdKey("w", "KeyW", 1500); // largada + passa o atraso da viatura
  await page.evaluate(`(() => {
    const g = window.__game;
    g.car.teleport(0, 150);
    g.police.car.teleport(0, 136);
    g.police.car.state.speed = 40;
  })()`);
  let ram = null;
  for (let i = 0; i < 40 && !ram; i++) {
    await sleep(75);
    const t = await dbg();
    if (t.police.rams > 0) ram = t;
  }
  check(!!ram, "viatura bateu na traseira do jogador");
  if (ram) {
    console.log("Batida:", JSON.stringify({ player: ram.speed, police: ram.police.speed, dz: gapOf(ram) }));
    check(ram.speed > 0 && ram.speed < 30, `jogador empurrado para frente (${ram.speed} m/s)`);
  }
  await sleep(1500);
  s = await dbg();
  const dz = Math.abs(gapOf(s));
  const dxB = Math.abs(s.pos.x - s.police.pos.x);
  check(dz > 4.4 || dxB > 2.0, `carros se separaram (dz=${dz.toFixed(2)}, dx=${dxB.toFixed(2)})`);
  check(Math.abs(s.pos.y - 0.65) < 0.3 && Math.abs(s.police.pos.y - 0.65) < 0.3, `ninguém voou (y=${s.pos.y}/${s.police.pos.y})`);
  await shot(page, "4_after_ram");

  // ================= C) com obstáculos =================
  console.log("\n== C) obstáculos ==");
  await open(page, "seed=42");
  const specs = JSON.parse(await page.evaluate("JSON.stringify(window.__game.obstacles.specs)"));
  let safeZ = null;
  for (let z = 420; z < 560 && safeZ === null; z += 2) {
    if (specs.every((o) => Math.abs(o.z - z) > 14)) safeZ = z;
  }
  check(safeZ !== null, `ponto livre para o jogador esperar (z=${safeZ})`);

  await page.holdKey("w", "KeyW", 1400); // largada; a viatura sai
  await page.evaluate(`window.__game.car.teleport(0, ${safeZ})`);
  let caught = null;
  let last = null;
  for (let i = 0; i < 160 && !caught; i++) {
    await sleep(250);
    last = await dbg();
    if (last.race.phase === "busted") caught = last;
    if (i === 16) await shot(page, "5_obstacles_mirror");
  }
  console.log("Final C:", JSON.stringify(last.police), "jogador z:", last.pos.z);
  check(last.police.bounces === 0, `viatura não bateu em obstáculos (${last.police.bounces})`);
  check(!!caught, `viatura atravessou o campo e pegou o jogador (fase ${last.race.phase})`);
  if (caught) await shot(page, "6_obstacles_busted");

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
console.log("OK: polícia funcionando.");
