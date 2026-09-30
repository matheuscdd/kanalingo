// Teste do fluxo de corrida: mensagem inicial, largada no primeiro input, cronômetro,
// chegada (teleporta para perto da linha), tela final e reinício com R.
// Uso: node tools/race.mjs

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, CdpPage, sleep } from "./cdp.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = 3115;
const OUT_DIR = resolve(ROOT, "tools/out");
mkdirSync(OUT_DIR, { recursive: true });

const server = spawn(process.execPath, [resolve(ROOT, "tools/serve.mjs"), String(PORT)], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((res) => server.stdout.once("data", res));

const browser = await launchBrowser({ profileDir: resolve(OUT_DIR, "profile_race"), port: 9337 });
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

  await page.send("Page.navigate", { url: `http://localhost:${PORT}/?smoke=1` });
  let ready = false;
  for (let i = 0; i < 600 && !ready; i++) {
    ready = await page.evaluate("!!(window.__game && window.__game.ready)").catch(() => false);
    if (!ready) await sleep(100);
  }
  if (!ready) throw new Error("cena não ficou pronta em 60 s");

  const dbg = async () => JSON.parse(await page.evaluate("JSON.stringify(window.__game.debug())"));
  const finishZ = await page.evaluate("(async () => (await import('/js/config.js')).TRACK.finishZ)()");

  await sleep(800);
  const s0 = await dbg();
  check(s0.race.phase === "ready", `fase inicial 'ready' (${s0.race.phase})`);
  check(typeof s0.message === "string" && /Acelere/.test(s0.message), "mensagem de largada visível");
  check(s0.timer === "00:00.00", `cronômetro zerado (${s0.timer})`);
  await page.screenshot(resolve(OUT_DIR, "race_1_ready.png"));

  // Primeiro input inicia a corrida
  await page.holdKey("w", "KeyW", 1200);
  const s1 = await dbg();
  check(s1.race.phase === "racing", `largou no primeiro input (${s1.race.phase})`);
  check(s1.message === null, "mensagem de largada escondida");
  check(s1.race.elapsed > 1 && s1.race.elapsed < 2.5, `cronômetro contando (${s1.race.elapsed}s)`);
  check(s1.timer !== "00:00.00", `HUD do cronômetro atualizado (${s1.timer})`);

  // Teleporta para 80 m antes da chegada (mantém a corrida em andamento) e acelera
  await page.evaluate(`window.__game.car.teleport(0, ${finishZ - 80})`);
  await sleep(300);
  await page.keyDown("w", "KeyW");
  let done = null;
  for (let i = 0; i < 200; i++) {
    const s = await dbg();
    if (s.race.phase === "finished") {
      done = s;
      break;
    }
    await sleep(100);
  }
  await page.keyUp("w", "KeyW");
  check(!!done, "cruzou a linha de chegada");
  if (done) {
    console.log("Chegada:", JSON.stringify(done.race), "pos:", JSON.stringify(done.pos));
    check(done.pos.z >= finishZ, `posição além da linha (z=${done.pos.z})`);
    check(done.race.finalTime > 0, `tempo final registrado (${done.race.finalTime}s)`);
    check(typeof done.message === "string" && /Chegada/.test(done.message), "mensagem de chegada visível");
    check(/R para/.test(done.message || ""), "mensagem indica R para reiniciar");
    check(
      (done.message || "").includes(done.timer),
      `HUD do cronômetro (${done.timer}) bate com o tempo final da mensagem`
    );
    await sleep(600);
    await page.screenshot(resolve(OUT_DIR, "race_2_finish.png"));

    // Não cai da pista após a chegada (barreira de fundo)
    await page.holdKey("w", "KeyW", 3000);
    const sEnd = await dbg();
    check(Math.abs(sEnd.pos.y - 0.65) < 0.3, `continua no asfalto após a chegada (y=${sEnd.pos.y}, z=${sEnd.pos.z})`);
    check(sEnd.race.finalTime === done.race.finalTime, "tempo final congelado");
  }

  // Reinício
  await page.holdKey("r", "KeyR", 100);
  await sleep(600);
  const s3 = await dbg();
  check(s3.race.phase === "ready", `R volta para 'ready' (${s3.race.phase})`);
  check(Math.abs(s3.pos.z - 2) < 1 && Math.abs(s3.pos.x) < 0.5, `carro na largada (${s3.pos.x}, ${s3.pos.z})`);
  check(s3.timer === "00:00.00", `cronômetro zerado após R (${s3.timer})`);
  check(typeof s3.message === "string" && /Acelere/.test(s3.message), "mensagem de largada de volta");
  check(s3.bounces === 0, "contagem de batidas zerada");

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
console.log("OK: fluxo de corrida completo.");
