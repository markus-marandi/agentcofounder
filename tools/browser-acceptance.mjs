import { spawn } from "node:child_process";
import { access, readFile, writeFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { terminateProcessTree, usesDetachedProcessGroup } from "../src/process-tree.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACTS = path.join(ROOT, "artifacts", "browser-acceptance");

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function browserPath() {
  const candidates = [
    process.env.CHALLENGE_BROWSER_PATH,
    process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : undefined,
    process.platform === "win32" ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" : undefined,
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined,
    process.platform === "linux" ? "/usr/bin/google-chrome" : undefined,
    process.platform === "linux" ? "/usr/bin/chromium" : undefined,
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next standard location.
    }
  }
  return undefined;
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitFor(url, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      last = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${label} did not become ready: ${String(last)}`);
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  async send(method, params = {}) {
    const id = ++this.nextId;
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.socket.send(JSON.stringify({ id, method, params }));
    return await result;
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(cdp, expression) {
  const response = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function ready(cdp, expectedUrl) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (
      (await evaluate(
        cdp,
        `location.href.startsWith(${JSON.stringify(expectedUrl)}) && document.readyState !== 'loading' && Boolean(document.body)`,
      ))
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("page did not finish loading");
}

async function assertPage(cdp, label, expression) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const diagnostic = await evaluate(
    cdp,
    "({ url: location.href, title: document.title, body: document.body?.innerText?.slice(0, 300) ?? '' })",
  );
  throw new Error(`${label} failed: ${JSON.stringify(diagnostic)}`);
}

async function screenshot(cdp, name) {
  const image = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(path.join(ARTIFACTS, `${name}.png`), image.data, "base64");
}

async function run() {
  const appDirectory = path.resolve(argumentValue("--app-dir") ?? path.join(ROOT, "app-template"));
  const parameters = JSON.parse(await readFile(path.join(appDirectory, "parameters.json"), "utf8"));
  const expectedProduct = String(parameters.product?.name ?? "");
  const expectedEntity = String(parameters.entities?.[0]?.label ?? parameters.entities?.[0]?.name ?? "");
  const executable = await browserPath();
  if (!executable) throw new Error("No supported browser path found. Set CHALLENGE_BROWSER_PATH.");
  const [appPort, debuggingPort] = await Promise.all([freePort(), freePort()]);
  const profile = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-browser-"));
  await mkdir(ARTIFACTS, { recursive: true });
  const npmInvocation =
    process.platform === "win32"
      ? {
          command: process.execPath,
          prefix: [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")],
        }
      : { command: "npm", prefix: [] };
  const server = spawn(npmInvocation.command, [...npmInvocation.prefix, "run", "dev", "--", "--port", String(appPort)], {
    cwd: appDirectory,
    detached: usesDetachedProcessGroup(),
    env: process.env,
    shell: false,
    stdio: "ignore",
  });
  let browser;
  let cdp;
  const checks = [];

  try {
    const appUrl = `http://127.0.0.1:${appPort}`;
    await waitFor(appUrl, "application");
    browser = spawn(
      executable,
      [
        "--headless=new",
        `--remote-debugging-port=${debuggingPort}`,
        `--user-data-dir=${profile}`,
        "--no-first-run",
        "--disable-gpu",
        "--window-size=1440,900",
        appUrl,
      ],
      { detached: usesDetachedProcessGroup(), shell: false, stdio: "ignore" },
    );
    const targetsResponse = await waitFor(`http://127.0.0.1:${debuggingPort}/json/list`, "browser debugger");
    const targets = await targetsResponse.json();
    const page = targets.find((target) => target.type === "page");
    if (!page?.webSocketDebuggerUrl) throw new Error("browser exposed no page target");
    cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.open();
    await Promise.all([cdp.send("Page.enable"), cdp.send("Runtime.enable")]);

    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Page.navigate", { url: appUrl });
    await ready(cdp, appUrl);
    await assertPage(cdp, "wide product shell", "Boolean(document.querySelector('main h1') && document.querySelector('input[aria-label=Search]'))");
    await assertPage(cdp, "wide API docs navigation", "[...document.querySelectorAll('a')].some(a => a.textContent.includes('API docs') && a.getAttribute('href') === '/api-docs')");
    await assertPage(cdp, "rendered limitations", "Boolean(document.querySelector('[data-limitations]'))");
    await assertPage(cdp, "wide sidebar", "[...document.querySelectorAll('nav[aria-label=Sections]')].some(n => getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().width > 0)");
    await assertPage(cdp, "wide mobile-menu suppression", "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Open menu')); return b && getComputedStyle(b).display === 'none'; })()");
    await screenshot(cdp, "wide");
    checks.push("wide shell, navigation, search, and rendered limitations");

    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await new Promise((resolve) => setTimeout(resolve, 150));
    await assertPage(cdp, "narrow menu button", "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Open menu')); return b && getComputedStyle(b).display !== 'none'; })()");
    await evaluate(cdp, "[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Open menu')).click(); true");
    await new Promise((resolve) => setTimeout(resolve, 250));
    await assertPage(cdp, "narrow navigation drawer", "Boolean(document.querySelector('[role=dialog] nav[aria-label=Sections]'))");
    await assertPage(cdp, "narrow API docs navigation", "[...document.querySelectorAll('[role=dialog] a')].some(a => a.textContent.includes('API docs'))");
    await screenshot(cdp, "narrow-menu");
    await evaluate(cdp, "[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Close menu')).click(); true");
    await assertPage(cdp, "closed narrow navigation drawer", "!document.querySelector('[role=dialog]')");
    await assertPage(cdp, "narrow primary content", "(() => { const h=document.querySelector('main h1'); return h && h.getBoundingClientRect().height > 0; })()");
    await assertPage(cdp, "narrow visible limitations", "(() => { const e=document.querySelector('[data-limitations]'); const r=e?.getBoundingClientRect(); return r && r.height > 0 && r.top < innerHeight; })()");
    await assertPage(cdp, "no narrow document overflow", "document.documentElement.scrollWidth <= innerWidth + 1");
    await screenshot(cdp, "narrow-product");
    checks.push("narrow menu, drawer, primary content, limitations, and document width");

    await cdp.send("Page.navigate", { url: `${appUrl}/api-docs` });
    await ready(cdp, `${appUrl}/api-docs`);
    await assertPage(cdp, "product-specific API docs title", `document.title === ${JSON.stringify(`${expectedProduct} API`)} && Boolean(document.querySelector('h1'))`);
    await assertPage(cdp, "entity-specific generated contract", `Boolean(document.querySelector('table') && document.querySelector('code')) && document.body.textContent.includes(${JSON.stringify(expectedEntity)})`);
    await screenshot(cdp, "api-docs");
    checks.push("product- and entity-specific rendered /api-docs contract");

    const browserVersion = await cdp.send("Browser.getVersion");
    const report = {
      status: "passed",
      run_at: new Date().toISOString(),
      app_directory: path.relative(ROOT, appDirectory),
      product: expectedProduct,
      browser_path: executable,
      browser_version: browserVersion.product,
      viewports: ["1440x900", "390x844"],
      checks,
    };
    await writeFile(path.join(ARTIFACTS, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Browser acceptance passed: ${checks.join("; ")}`);
    console.log(`Evidence written to ${path.relative(ROOT, ARTIFACTS)}`);
  } finally {
    cdp?.close();
    if (browser) await terminateProcessTree(browser);
    await terminateProcessTree(server);
    await rm(profile, { recursive: true, force: true });
  }
}

await run();
