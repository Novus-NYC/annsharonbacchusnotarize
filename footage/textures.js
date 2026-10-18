// Procedural textures for the footage scene. Everything is drawn on canvas so
// the render is reproducible without any downloaded imagery.

function hash(i, j) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const mod = (a, n) => ((a % n) + n) % n;

// Value noise that tiles every `p` lattice cells (p = 0 disables tiling).
export function noise(x, y, p = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = (i) => (p ? mod(i, p) : i);
  const a = hash(w(xi), w(yi)), b = hash(w(xi + 1), w(yi));
  const c = hash(w(xi), w(yi + 1)), d = hash(w(xi + 1), w(yi + 1));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, octaves = 4, p = 0) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * noise(x * f, y * f, p ? p * f : 0);
    n += a; f *= 2; a *= 0.5;
  }
  return s / n;
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

function heightToNormal(height, w, h, strength) {
  const [c, ctx] = canvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const dx = height[y * w + ((x + 1) % w)] - height[y * w + ((x - 1 + w) % w)];
      const dy = height[((y + 1) % h) * w + x] - height[((y - 1 + h) % h) * w + x];
      let nx = -dx * strength, ny = dy * strength, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      img.data[i * 4] = (nx / l * 0.5 + 0.5) * 255;
      img.data[i * 4 + 1] = (ny / l * 0.5 + 0.5) * 255;
      img.data[i * 4 + 2] = (nz / l * 0.5 + 0.5) * 255;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* ---------- Walnut ---------- */
export function walnut(w, h, vertical = false) {
  const [c, ctx] = canvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = vertical ? y : x, b = vertical ? x : y;
      const warp = fbm(a * 0.004, b * 0.01, 3) * 18;
      const g = fbm(a * 0.0025, (b + warp) * 0.06, 4);
      const ring = 0.5 + 0.5 * Math.sin((b + warp * 3) * 0.09 + g * 9);
      const pore = noise(a * 0.9, b * 0.08) > 0.82 ? 0.82 : 1;
      const t = (0.55 * g + 0.45 * ring) * pore;
      const i = (y * w + x) * 4;
      img.data[i] = 30 + t * 34;
      img.data[i + 1] = 17 + t * 20;
      img.data[i + 2] = 11 + t * 12;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* ---------- Navy leather desk pad ---------- */
export function leatherColor(w, h) {
  const [c, ctx] = canvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(x * 0.004, y * 0.004, 5);
      const i = (y * w + x) * 4;
      img.data[i] = 18 + n * 14;
      img.data[i + 1] = 25 + n * 16;
      img.data[i + 2] = 44 + n * 24;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // Saddle stitching just inside the edge.
  const inset = w * 0.022;
  ctx.strokeStyle = "rgba(196,170,120,0.55)";
  ctx.lineWidth = w * 0.0016;
  ctx.setLineDash([w * 0.006, w * 0.004]);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.setLineDash([]);
  // Embossed border groove.
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = w * 0.002;
  ctx.strokeRect(inset * 1.6, inset * 1.6, w - inset * 3.2, h - inset * 3.2);
  return c;
}

export function leatherNormal(size) {
  const P = 64;
  const hgt = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * P, v = (y / size) * P;
      // Pebbled grain: sharpened noise plus a fine layer.
      const a = noise(u, v, P);
      const b = noise(u * 2.3, v * 2.3, Math.round(P * 2.3));
      hgt[y * size + x] = Math.pow(a, 0.7) * 0.7 + b * 0.3;
    }
  }
  return heightToNormal(hgt, size, size, 2.4);
}

/* ---------- Paper ---------- */
export function paperNormal(size) {
  const P = 48;
  const hgt = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * P, v = (y / size) * P;
      hgt[y * size + x] = fbm(u, v, 4, P);
    }
  }
  return heightToNormal(hgt, size, size, 0.9);
}

function wrap(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const t = line ? line + " " + word : word;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = word; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// A plausible New York affidavit with a jurat block. Units are centimetres on
// a US Letter sheet; returns the canvas plus layout points the scene needs.
export function affidavit(ppc) {
  const W = 21.6, H = 27.9;
  const [c, ctx] = canvas(Math.round(W * ppc), Math.round(H * ppc));
  const px = (cm) => cm * ppc;

  ctx.fillStyle = "#efede6";
  ctx.fillRect(0, 0, c.width, c.height);
  // Paper fibres.
  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * c.width, y = Math.random() * c.height;
    const a = Math.random() * Math.PI;
    const l = px(0.05 + Math.random() * 0.25);
    ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? "120,110,95" : "255,255,255"},${0.03 + Math.random() * 0.05})`;
    ctx.lineWidth = px(0.004 + Math.random() * 0.006);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }

  const ink = "#1f2127";
  const serif = '"Baskerville", "Times New Roman", serif';
  ctx.fillStyle = ink;
  ctx.textBaseline = "alphabetic";

  ctx.font = `600 ${px(0.56)}px ${serif}`;
  ctx.textAlign = "center";
  ctx.letterSpacing = `${px(0.12)}px`;
  ctx.fillText("AFFIDAVIT", px(W / 2), px(3.4));
  ctx.letterSpacing = "0px";

  ctx.textAlign = "left";
  ctx.font = `${px(0.36)}px ${serif}`;
  ctx.fillText("STATE OF NEW YORK", px(2.5), px(5.0));
  ctx.fillText(")", px(8.6), px(5.0));
  ctx.fillText(")  ss.:", px(8.6), px(5.55));
  ctx.fillText("COUNTY OF KINGS", px(2.5), px(6.1));
  ctx.fillText(")", px(8.6), px(6.1));

  ctx.font = `${px(0.35)}px ${serif}`;
  const paras = [
    "The undersigned, being duly sworn, deposes and says:",
    "1.  I am over the age of eighteen years and am competent to make this affidavit. The statements below are made on my own personal knowledge.",
    "2.  I have read the foregoing document in full, I understand its contents, and I sign it freely and voluntarily, without duress.",
    "3.  The facts stated in this affidavit are true to the best of my knowledge, information and belief.",
    "4.  I make this affidavit knowing that it may be relied upon by any person or agency to whom it is presented.",
  ];
  let y = 7.4;
  for (const p of paras) {
    for (const line of wrap(ctx, p, px(16.6))) {
      ctx.fillText(line, px(2.5), px(y));
      y += 0.6;
    }
    y += 0.42;
  }

  // Affiant signature.
  ctx.strokeStyle = ink;
  ctx.lineWidth = px(0.02);
  ctx.beginPath(); ctx.moveTo(px(11.4), px(17.6)); ctx.lineTo(px(19.1), px(17.6)); ctx.stroke();
  ctx.font = `${px(0.28)}px ${serif}`;
  ctx.fillText("Affiant", px(11.4), px(18.1));
  ctx.save();
  ctx.translate(px(11.9), px(17.35));
  ctx.rotate(-0.05);
  ctx.fillStyle = "#1c2a6a";
  ctx.font = `${px(1.05)}px "Snell Roundhand", "Apple Chancery", cursive`;
  ctx.fillText("Maria Delgado", 0, 0);
  ctx.restore();

  // Jurat.
  ctx.fillStyle = ink;
  ctx.font = `${px(0.36)}px ${serif}`;
  ctx.fillText("Sworn to before me this ______ day of", px(2.5), px(20.2));
  ctx.fillText("_______________________, 20_____", px(2.5), px(20.85));
  ctx.beginPath(); ctx.moveTo(px(2.5), px(23.6)); ctx.lineTo(px(10.2), px(23.6)); ctx.stroke();
  ctx.font = `${px(0.28)}px ${serif}`;
  ctx.fillText("Notary Public", px(2.5), px(24.1));

  ctx.fillStyle = "rgba(31,33,39,0.55)";
  ctx.font = `${px(0.24)}px ${serif}`;
  ctx.textAlign = "center";
  ctx.fillText("Page 1 of 1", px(W / 2), px(26.7));

  return { canvas: c, size: [W, H], seal: [14.7, 22.6], sealRadius: 2.2 };
}

// A plain sheet that sits underneath, mostly out of focus.
export function underSheet(ppc) {
  const W = 21.6, H = 27.9;
  const [c, ctx] = canvas(Math.round(W * ppc), Math.round(H * ppc));
  ctx.fillStyle = "#e9e7df";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "rgba(31,33,39,0.5)";
  for (let y = 4; y < 25; y += 0.6) {
    const w = y % 5 < 0.6 ? 9 : 15 + Math.random() * 1.5;
    ctx.fillRect(2.5 * ppc, y * ppc, w * ppc, 0.11 * ppc);
  }
  return c;
}

/* ---------- The seal impression ---------- */
function arcText(ctx, text, r, centerAngle, inward) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let angle = centerAngle - (inward ? 1 : -1) * (total / r) / 2;
  [...text].forEach((ch, i) => {
    const half = widths[i] / 2 / r;
    angle += (inward ? 1 : -1) * half;
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(0, inward ? -r : r);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += (inward ? 1 : -1) * half;
  });
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

export function sealDesign(size) {
  const [c, ctx] = canvas(size, size);
  const R = size / 2;
  ctx.translate(R, R);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  const serif = '"Baskerville", "Times New Roman", serif';

  ctx.lineWidth = R * 0.035;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = R * 0.012;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.885, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, R * 0.6, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = R * 0.02;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.565, 0, Math.PI * 2); ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${R * 0.15}px ${serif}`;
  ctx.letterSpacing = `${R * 0.012}px`;
  arcText(ctx, "ANN SHARON BACCHUS", R * 0.745, 0, true);
  arcText(ctx, "NOTARY PUBLIC", R * 0.745, 0, false);
  star(ctx, -R * 0.745, 0, R * 0.055);
  star(ctx, R * 0.745, 0, R * 0.055);

  ctx.letterSpacing = `${R * 0.02}px`;
  ctx.font = `600 ${R * 0.13}px ${serif}`;
  ctx.fillText("BROOKLYN", 0, -R * 0.12);
  ctx.font = `${R * 0.085}px ${serif}`;
  ctx.fillText("NEW YORK", 0, R * 0.1);
  ctx.lineWidth = R * 0.01;
  ctx.beginPath(); ctx.moveTo(-R * 0.36, R * 0.0); ctx.lineTo(R * 0.36, R * 0.0); ctx.stroke();
  star(ctx, 0, R * 0.3, R * 0.04);
  star(ctx, -R * 0.12, R * 0.3, R * 0.028);
  star(ctx, R * 0.12, R * 0.3, R * 0.028);
  return c;
}

// The ink impression: the seal artwork with uneven coverage, pooling at the
// edges of strokes and the odd dropout, as a real rubber stamp leaves it.
export function sealInk(size) {
  const design = sealDesign(size);
  const [blur, bctx] = canvas(size, size);
  bctx.filter = `blur(${size * 0.0022}px)`;
  bctx.drawImage(design, 0, 0);
  const d = bctx.getImageData(0, 0, size, size).data;

  const [c, ctx] = canvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const m = d[i] / 255;
      if (m <= 0.01) continue;
      const cover = fbm(x * 0.012, y * 0.012, 4);
      const pressure = 0.62 + 0.38 * (1 - Math.hypot(x / size - 0.42, y / size - 0.4));
      const grain = noise(x * 0.6, y * 0.6);
      let a = m * Math.min(1, 0.45 + cover * 0.9) * pressure;
      if (grain > 0.9) a *= 0.35;
      a = Math.min(1, a * 1.15);
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* ---------- Journal cover ---------- */
export function cloth(w, h) {
  const [c, ctx] = canvas(w, h);
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const weave = (Math.sin(x * 1.3) * Math.sin(y * 1.3)) * 0.5 + 0.5;
      const n = fbm(x * 0.01, y * 0.01, 3);
      const t = 0.7 + weave * 0.15 + n * 0.25;
      const i = (y * w + x) * 4;
      img.data[i] = 20 * t; img.data[i + 1] = 30 * t; img.data[i + 2] = 58 * t;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = "rgba(190,150,70,0.85)";
  ctx.lineWidth = w * 0.006;
  ctx.strokeRect(w * 0.08, h * 0.06, w * 0.84, h * 0.88);
  ctx.fillStyle = "rgba(200,160,80,0.9)";
  ctx.textAlign = "center";
  ctx.font = `600 ${w * 0.07}px "Baskerville", serif`;
  ctx.letterSpacing = `${w * 0.012}px`;
  ctx.fillText("NOTARY JOURNAL", w / 2, h * 0.3);
  return c;
}
