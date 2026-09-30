// Cliente mínimo do Chrome DevTools Protocol usando o WebSocket nativo do Node (>= 22).
// Sem dependências externas.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];

export function findBrowser() {
  const b = BROWSERS.find((p) => existsSync(p));
  if (!b) throw new Error("Nenhum navegador Chromium encontrado.");
  return b;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Lança o Chrome headless com porta de depuração remota.
 */
export async function launchBrowser({ profileDir, port = 9333, width = 1280, height = 720 }) {
  rmSync(profileDir, { recursive: true, force: true });
  mkdirSync(profileDir, { recursive: true });

  const args = [
    "--headless=new",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    `--user-data-dir=${profileDir}`,
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
    "about:blank",
  ];

  const proc = spawn(findBrowser(), args, { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  proc.stderr.on("data", (d) => (stderr += d));

  // Aguarda o endpoint de depuração
  let info;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      info = await res.json();
      break;
    } catch {
      await sleep(100);
    }
  }
  if (!info) {
    proc.kill();
    throw new Error("Não foi possível conectar ao DevTools:\n" + stderr);
  }

  return { proc, port, kill: () => proc.kill() };
}

/**
 * Conexão CDP com uma página.
 */
export class CdpPage {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
      } else if (msg.method) {
        (this.listeners.get(msg.method) || []).forEach((fn) => fn(msg.params));
      }
    });
  }

  static async connect(port) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find((t) => t.type === "page");
    if (!page) throw new Error("Nenhuma página encontrada no navegador.");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", rej, { once: true });
    });
    return new CdpPage(ws);
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  /** Avalia uma expressão JS na página e devolve o valor (serializado como JSON). */
  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    }
    return result.value;
  }

  async screenshot(path) {
    const { data } = await this.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path, Buffer.from(data, "base64"));
  }

  /** Pressiona/solta uma tecla (gera eventos DOM keydown/keyup reais). */
  async keyDown(key, code) {
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk(key) });
  }
  async keyUp(key, code) {
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk(key) });
  }
  /** Segura uma tecla por `ms` milissegundos. */
  async holdKey(key, code, ms) {
    await this.keyDown(key, code);
    await sleep(ms);
    await this.keyUp(key, code);
  }

  close() {
    this.ws.close();
  }
}

function vk(key) {
  const map = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };
  if (map[key]) return map[key];
  return key.toUpperCase().charCodeAt(0);
}

export { sleep, resolve };
