import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import * as T from "./textures.js";

// ?w=1920&h=1080&s=32&shot=wide|tall
const q = new URLSearchParams(location.search);
const W = +(q.get("w") || 1920);
const H = +(q.get("h") || 1080);
const SAMPLES = +(q.get("s") || 32);
const SHOT = q.get("shot") || "wide";

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.07;

function tex(canvas, { srgb = true, repeat = 1, wrap = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}

/* ---------- Set ---------- */
const desk = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 160),
  new THREE.MeshPhysicalMaterial({
    map: tex(T.walnut(2048, 1024)),
    roughness: 0.42,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
  }),
);
desk.rotation.x = -Math.PI / 2;
desk.receiveShadow = true;
scene.add(desk);

const PAD_Y = 0.32;
const PAD_TOP = PAD_Y + 0.06;
const pad = new THREE.Mesh(
  new RoundedPad(64, PAD_Y, 44, 0.9),
  new THREE.MeshStandardMaterial({
    map: tex(T.leatherColor(2048, 1408)),
    normalMap: tex(T.leatherNormal(512), { srgb: false, wrap: true, repeat: 7 }),
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.62,
  }),
);
pad.position.set(-2, 0, 1);
pad.rotation.y = 0.04;
pad.castShadow = true;
pad.receiveShadow = true;
scene.add(pad);

// A rounded-rectangle slab whose top face is UV-mapped 0..1.
function RoundedPad(w, h, d, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r); shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d); shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 });
  g.rotateX(Math.PI / 2);
  g.translate(0, h, 0);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - x) / w, 1 - (pos.getZ(i) - y) / d);
  }
  return g;
}

/* ---------- Documents ---------- */
const PPC = 150;
const doc = T.affidavit(PPC);
const [DW, DH] = doc.size;
const paperNormal = tex(T.paperNormal(512), { srgb: false, wrap: true, repeat: 5 });

const docGroup = new THREE.Group();
docGroup.position.set(0, PAD_TOP + 0.01, 0);
docGroup.rotation.y = -0.1;
scene.add(docGroup);

function sheet(canvas, y) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(DW, DH),
    new THREE.MeshPhysicalMaterial({
      map: tex(canvas),
      normalMap: paperNormal,
      normalScale: new THREE.Vector2(0.15, 0.15),
      roughness: 0.82,
      sheen: 0.4,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color(0xffffff),
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}
const under = sheet(T.underSheet(60), 0);
under.position.set(1.6, 0, -1.2);
under.rotation.z = 0.07;
docGroup.add(under);
const top = sheet(doc.canvas, 0.03);
docGroup.add(top);

// Seal position in doc space (cm from the top-left) → local coordinates.
const sealLocal = new THREE.Vector3(doc.seal[0] - DW / 2, 0.05, doc.seal[1] - DH / 2);
const ink = new THREE.Mesh(
  new THREE.PlaneGeometry(doc.sealRadius * 2, doc.sealRadius * 2),
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1f3aa8),
    alphaMap: tex(T.sealInk(1400), { srgb: false }),
    transparent: true,
    roughness: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  }),
);
ink.rotation.x = -Math.PI / 2;
ink.rotation.z = -0.06;
ink.position.copy(sealLocal);
ink.receiveShadow = true;
docGroup.add(ink);
docGroup.updateMatrixWorld();
const SEAL = sealLocal.clone().applyMatrix4(docGroup.matrixWorld);
SEAL.y = docGroup.position.y + 0.06;

// Doc-space (cm from the sheet's top-left) to world, on the paper surface.
const docPt = (u, w) => new THREE.Vector3(u - DW / 2, 0, w - DH / 2).applyMatrix4(docGroup.matrixWorld);

/* ---------- Notary journal ---------- */
const journal = new THREE.Group();
const coverMat = new THREE.MeshStandardMaterial({ map: tex(T.cloth(1024, 1400)), roughness: 0.9 });
const sideMat = new THREE.MeshStandardMaterial({ color: 0x141d36, roughness: 0.9 });
const pagesMat = new THREE.MeshStandardMaterial({ color: 0xd9d4c6, roughness: 0.95 });
const cover = new THREE.Mesh(new THREE.BoxGeometry(17, 2.4, 23), [sideMat, sideMat, coverMat, sideMat, sideMat, sideMat]);
cover.position.y = 1.2;
const block = new THREE.Mesh(new THREE.BoxGeometry(16.2, 1.9, 22.2), pagesMat);
block.position.set(0.5, 1.2, 0);
journal.add(block, cover);
cover.scale.set(1, 1, 1);
// Hollow out the fore-edge so the pages read as pages.
cover.geometry = new THREE.BoxGeometry(17, 2.4, 23);
journal.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
journal.position.set(-25, PAD_TOP, -12);
journal.rotation.y = 0.22;
scene.add(journal);

/* ---------- Lathe helpers ---------- */
function lathe(points, segments = 96) {
  const curve = new THREE.SplineCurve(points.map(([r, y]) => new THREE.Vector2(r, y)));
  const pts = curve.getPoints(points.length * 10);
  return new THREE.LatheGeometry(pts, segments);
}
function latheSharp(points, segments = 96) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

const brass = new THREE.MeshPhysicalMaterial({ color: 0xc89a4a, metalness: 1, roughness: 0.28, clearcoat: 0.3 });
const gold = new THREE.MeshPhysicalMaterial({ color: 0xd8ae5a, metalness: 1, roughness: 0.2 });
const walnutTex = tex(T.walnut(512, 1024, true));
const wood = new THREE.MeshPhysicalMaterial({ map: walnutTex, color: new THREE.Color(2.6, 2.2, 1.9), roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.18 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x151a33, roughness: 0.75 });

/* ---------- The stamp ---------- */
const stamp = new THREE.Group();
const parts = [
  [latheSharp([[0, 0], [2.18, 0], [2.24, 0.05], [2.24, 0.38], [0, 0.38]]), rubber],
  [latheSharp([[0, 0.38], [2.42, 0.38], [2.48, 0.46], [2.48, 1.02], [2.36, 1.12], [1.6, 1.32], [1.12, 1.62], [1.02, 1.86], [0, 1.86]]), brass],
  [lathe([[0, 1.86], [0.98, 1.86], [0.86, 2.6], [0.8, 3.5], [0.96, 4.4], [1.45, 5.4], [1.86, 6.4], [1.92, 7.1], [1.72, 7.8], [1.2, 8.35], [0.5, 8.62], [0, 8.66]]), wood],
  [latheSharp([[0.99, 4.12], [1.06, 4.16], [1.08, 4.24], [1.08, 4.42], [1.06, 4.5], [0.99, 4.54]]), brass],
];
for (const [g, m] of parts) {
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  stamp.add(mesh);
}
scene.add(stamp);

/* ---------- Fountain pen ---------- */
const resin = new THREE.MeshPhysicalMaterial({ color: 0x0b0e18, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
const pen = new THREE.Group();
const penParts = [
  [lathe([[0, 0], [0.12, 0.05], [0.34, 0.9], [0.48, 2.0]]), gold], // nib section
  [lathe([[0.42, 1.9], [0.5, 2.6], [0.55, 4.0], [0.56, 7.4], [0.5, 8.0]]), resin],
  [latheSharp([[0.6, 7.4], [0.62, 7.45], [0.62, 7.75], [0.6, 7.8]]), gold],
  [lathe([[0.6, 7.8], [0.64, 9.0], [0.62, 12.6], [0.5, 13.4], [0.2, 13.7], [0, 13.72]]), resin],
  [latheSharp([[0.6, 8.0], [0.66, 8.05], [0.66, 8.5], [0.6, 8.55]]), gold],
];
for (const [g, m] of penParts) {
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  pen.add(mesh);
}
const clip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 4.2), gold);
clip.position.set(0, 0.7, 0);
clip.rotation.x = 0;
const clipPivot = new THREE.Group();
clipPivot.add(clip);
clipPivot.rotation.x = -Math.PI / 2;
clipPivot.position.y = 11;
clip.castShadow = true;
pen.add(clipPivot);
pen.rotation.z = -Math.PI / 2; // lie flat along +x
const penHolder = new THREE.Group();
penHolder.add(pen);
penHolder.rotation.y = 0.75;
penHolder.position.set(-27, PAD_TOP + 0.64, 13);
scene.add(penHolder);

/* ---------- Light ---------- */
const lamp = new THREE.SpotLight(0xffd3a0, 15000, 0, 0.36, 0.75, 2);
const LAMP = new THREE.Vector3(-34, 78, -18);
lamp.position.copy(LAMP);
lamp.target.position.set(3, 0, 4);
lamp.castShadow = true;
lamp.shadow.mapSize.set(2048, 2048);
lamp.shadow.bias = -0.0004;
lamp.shadow.normalBias = 0.02;
lamp.shadow.camera.near = 40;
lamp.shadow.camera.far = 160;
scene.add(lamp, lamp.target);

const rim = new THREE.DirectionalLight(0x8aa2d8, 0.35);
rim.position.set(40, 30, -60);
scene.add(rim);

/* ---------- Timeline ---------- */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeIn = (x) => x * x * x;
const v = (x, y, z) => new THREE.Vector3(x, y, z);

const FOCUS = docPt(11.6, 22.3); // jurat, signature line and seal together
const SHOTS = {
  // Desktop: subject held right of centre, copy lives on the left.
  wide: {
    pos: new THREE.CatmullRomCurve3([v(-14, 34, 44), v(-6, 30, 36), v(4, 24, 28), FOCUS.clone().add(v(1.6, 17.5, 11.5))]),
    look: new THREE.CatmullRomCurve3([v(-2, 0, 1), v(1, 0, 4), SEAL.clone().add(v(-1.5, 0, -0.8)), FOCUS.clone()]),
    shift: [-0.2, 0],
  },
  // Mobile: a steeper, taller frame; subject sits low, copy above.
  tall: {
    pos: new THREE.CatmullRomCurve3([v(-4, 66, 34), v(-1, 50, 30), v(3, 36, 24), FOCUS.clone().add(v(0.8, 27, 13))]),
    look: new THREE.CatmullRomCurve3([v(-2, 0, 1), v(1, 0, 4), SEAL.clone().add(v(-1, 0, -1.2)), FOCUS.clone().add(v(1.4, 0, 0))]),
    shift: [0, -0.16],
  },
};
const shot = SHOTS[SHOT];

function stateAt(t) {
  const c = easeInOut(t);
  const s = {};
  s.camPos = shot.pos.getPoint(c);
  s.camLook = shot.look.getPoint(c);
  s.aperture = 0.1 + 0.32 * Math.sin(Math.PI * Math.min(1, seg(t, 0.3, 1) * 0.75 + 0.25));

  // Stamp: lowered in from above, pressed, lifted away.
  const above = SEAL.clone().add(v(5, 44, -12));
  const hover = SEAL.clone().add(v(0, 1.6, 0));
  const away = SEAL.clone().add(v(3, 46, -16));
  let pos, tilt, spin, squash = 1;
  if (t < 0.6) {
    const k = easeOut(seg(t, 0.16, 0.6));
    pos = above.clone().lerp(hover, k);
    pos.y = above.y + (hover.y - above.y) * easeOut(seg(t, 0.16, 0.6));
    tilt = 0.32 * (1 - k);
    spin = 0.5 * (1 - k);
  } else if (t < 0.7) {
    const k = easeIn(seg(t, 0.6, 0.66));
    pos = hover.clone().lerp(SEAL, k);
    tilt = 0; spin = 0;
    squash = 1 - 0.02 * Math.sin(Math.PI * seg(t, 0.64, 0.72));
  } else {
    const k = seg(t, 0.72, 0.95);
    pos = SEAL.clone().lerp(away, easeIn(k));
    pos.y = SEAL.y + (away.y - SEAL.y) * (1 - Math.pow(1 - k, 1.6)) * easeIn(Math.min(1, k * 1.6));
    tilt = -0.18 * easeIn(k);
    spin = -0.3 * easeIn(k);
  }
  s.stampPos = pos;
  s.stampTilt = tilt;
  s.stampSpin = spin;
  s.squash = squash;
  s.ink = t >= 0.66 ? 1 : 0;
  return s;
}

/* ---------- Accumulation renderer ---------- */
const camera = new THREE.PerspectiveCamera(SHOT === "wide" ? 32 : 40, W / H, 1, 600);
const rtOpts = { type: THREE.HalfFloatType, colorSpace: THREE.NoColorSpace };
const sampleRT = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, depthBuffer: true });
const accumRT = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, depthBuffer: false });

const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quadGeo = new THREE.PlaneGeometry(2, 2);
const accumMat = new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: sampleRT.texture }, weight: { value: 1 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
  fragmentShader: "uniform sampler2D tSrc; uniform float weight; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * weight, 1.); }",
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  depthTest: false,
  depthWrite: false,
});
const finalMat = new THREE.ShaderMaterial({
  uniforms: { tAcc: { value: accumRT.texture }, exposure: { value: 1.0 }, res: { value: new THREE.Vector2(W, H) }, seed: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
  fragmentShader: /* glsl */ `
    uniform sampler2D tAcc; uniform float exposure; uniform vec2 res; uniform float seed;
    varying vec2 vUv;
    vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.); }
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + seed) * 43758.5453); }
    vec3 srgb(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec3 c = texture2D(tAcc, vUv).rgb * exposure;
      // Gentle halation around bright brass and paper highlights.
      vec3 glow = vec3(0.);
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.785398;
        glow += max(texture2D(tAcc, vUv + vec2(cos(a), sin(a)) * 6. / res).rgb * exposure - 0.9, 0.);
      }
      c += glow * vec3(0.06, 0.045, 0.03);
      c = aces(c);
      // Split tone: cool navy shadows, warm highlights.
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(c * vec3(0.9, 0.97, 1.12), c * vec3(1.03, 1.0, 0.95), smoothstep(0.05, 0.6, l));
      vec2 q = vUv - 0.5; q.x *= res.x / res.y;
      c *= mix(1., smoothstep(1.15, 0.25, length(q)), 0.75);
      c = srgb(c);
      c += (h(gl_FragCoord.xy) - 0.5) / 255.;
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest: false,
  depthWrite: false,
});
const quad = new THREE.Mesh(quadGeo, accumMat);
const quadScene = new THREE.Scene();
quadScene.add(quad);

function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }

function renderAt(t) {
  const s = stateAt(t);
  stamp.position.copy(s.stampPos);
  stamp.rotation.set(s.stampTilt, s.stampSpin, s.stampTilt * 0.4);
  stamp.scale.set(1, s.squash, 1);
  ink.visible = s.ink > 0;

  const fwd = s.camLook.clone().sub(s.camPos).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();

  renderer.setRenderTarget(accumRT);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  for (let i = 0; i < SAMPLES; i++) {
    const jx = halton(i + 1, 2) - 0.5, jy = halton(i + 1, 3) - 0.5;
    const r = Math.sqrt(halton(i + 1, 5)) * s.aperture, a = halton(i + 1, 7) * Math.PI * 2;
    camera.position.copy(s.camPos).addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r);
    camera.up.set(0, 1, 0);
    camera.lookAt(s.camLook);
    camera.setViewOffset(W, H, shot.shift[0] * W + jx, shot.shift[1] * H + jy, W, H);

    const la = halton(i + 1, 11) * Math.PI * 2, lr = Math.sqrt(halton(i + 1, 13)) * 7;
    lamp.position.set(LAMP.x + Math.cos(la) * lr, LAMP.y, LAMP.z + Math.sin(la) * lr);

    renderer.setRenderTarget(sampleRT);
    renderer.render(scene, camera);

    quad.material = accumMat;
    accumMat.uniforms.weight.value = 1 / SAMPLES;
    renderer.autoClear = false;
    renderer.setRenderTarget(accumRT);
    renderer.render(quadScene, quadCam);
    renderer.autoClear = true;
  }
  quad.material = finalMat;
  finalMat.uniforms.seed.value = t * 91.7;
  renderer.setRenderTarget(null);
  renderer.render(quadScene, quadCam);
}

window.renderFrame = (i, total) => {
  renderAt(total > 1 ? i / (total - 1) : 0);
  return renderer.domElement.toDataURL("image/png");
};
window.sceneReady = true;
