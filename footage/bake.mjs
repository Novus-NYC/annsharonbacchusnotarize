// Bakes lightmaps and exports textures for the live stage into public/stage/.
// node footage/bake.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = path.join(root, "public/stage");
fs.mkdirSync(out, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript" };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));

const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
page.setDefaultTimeout(0);
page.on("console", (m) => { if (!/deprecat|PCFSoft/.test(m.text())) console.log("[page]", m.text()); });
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
await page.goto(`http://localhost:${server.address().port}/footage/bake.html`);
await page.waitForFunction(() => window.sceneReady === true);
const t0 = Date.now();
const { files, lightmapScale } = await page.evaluate(() => window.runBake());
console.log(`baked in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await browser.close();
server.close();

// Encode: normal/roughness data near-lossless, colour lossy.
const quality = { knurl: "lossless", clothRM: 92, brushed: 90, sealInk: 95, paper: 92, paperSmall: 92 };
const tmp = fs.mkdtempSync(path.join(root, "footage/.bake-"));
for (const [name, url] of Object.entries(files)) {
  const png = path.join(tmp, `${name}.png`);
  fs.writeFileSync(png, Buffer.from(url.split(",")[1], "base64"));
  const q = quality[name] ?? (name.startsWith("lm") ? 90 : 84);
  const args = q === "lossless" ? ["-quiet", "-lossless", png, "-o", path.join(out, `${name}.webp`)] : ["-quiet", "-q", String(q), png, "-o", path.join(out, `${name}.webp`)];
  execFileSync("cwebp", args);
}
fs.rmSync(tmp, { recursive: true });
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ lightmapScale }, null, 2) + "\n");
console.log("wrote", Object.keys(files).length, "textures to public/stage/");
