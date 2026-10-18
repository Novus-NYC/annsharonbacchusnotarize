// Renders the footage frames with headless Chromium.
// node footage/render.mjs --shot wide --w 1920 --h 1080 --frames 240 --samples 32 --out <dir> [--only 0,120,239]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const shot = args.shot || "wide";
const w = +(args.w || 1920), h = +(args.h || 1080);
const frames = +(args.frames || 240), samples = +(args.samples || 32);
const out = path.resolve(args.out || `footage/frames-${shot}`);
const exposure = args.exposure || 1;
const only = args.only ? args.only.split(",").map(Number) : null;
fs.mkdirSync(out, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on("console", (m) => console.log("[page]", m.text()));
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
await page.goto(`http://localhost:${port}/footage/scene.html?w=${w}&h=${h}&s=${samples}&shot=${shot}&exposure=${exposure}`);
await page.waitForFunction(() => window.sceneReady === true, null, { timeout: 300000 });
page.setDefaultTimeout(0);
console.log("renderer:", await page.evaluate(() => {
  const gl = document.querySelector("canvas").getContext("webgl2");
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
}));

const list = only || [...Array(frames).keys()];
const t0 = Date.now();
for (const i of list) {
  const url = await page.evaluate(([i, n]) => window.renderFrame(i, n), [i, frames]);
  fs.writeFileSync(path.join(out, `f${String(i).padStart(4, "0")}.png`), Buffer.from(url.split(",")[1], "base64"));
  if (i % 20 === 0 || only) console.log(`frame ${i}/${frames} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await browser.close();
server.close();
