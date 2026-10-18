import * as THREE from "three";
import * as T from "./textures.js";

// Offline accumulation renderer. Each frame averages many rasterized samples,
// each with a jittered lens position (thin-lens depth of field), lamp position
// (soft shadows) and sky direction (ambient occlusion and contact shadows).
// ?w=2560&h=1440&s=160&shot=wide|tall
const q = new URLSearchParams(location.search);
const W = +(q.get("w") || 1920);
const H = +(q.get("h") || 1080);
const SAMPLES = +(q.get("s") || 128);
const SHOT = q.get("shot") || "wide";

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020306);

// Reflection environment: a dim navy room with a warm lamp disc and a cool
// window strip, so brass and lacquer reflect believable light sources.
function reflectionEnv() {
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0b1020, side: THREE.BackSide })));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(100, 32), new THREE.MeshBasicMaterial({ color: 0x1a120c }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2; room.add(floor);
  const lampDisc = new THREE.Mesh(new THREE.CircleGeometry(20, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.55).multiplyScalar(5) }));
  lampDisc.position.set(-38, 80, -20); lampDisc.lookAt(0, 0, 0); room.add(lampDisc);
  const windowStrip = new THREE.Mesh(new THREE.PlaneGeometry(70, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.65, 0.9).multiplyScalar(0.9) }));
  windowStrip.position.set(60, 35, -70); windowStrip.lookAt(0, 0, 0); room.add(windowStrip);
  const pmrem = new THREE.PMREMGenerator(renderer);
  return pmrem.fromScene(room, 0.02).texture;
}
scene.environment = reflectionEnv();
scene.environmentIntensity = 0.55;

function tex(canvas, { srgb = true, repeat = 1 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  if (repeat !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
const v = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- Desk and leather pad ---------- */
const desk = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 160),
  new THREE.MeshPhysicalMaterial({ map: tex(T.walnut(2048, 1024)), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
);
desk.rotation.x = -Math.PI / 2;
scene.add(desk);

function roundedSlab(w, h, d, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r); shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d); shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const bevel = Math.min(0.12, h * 0.4);
  const g = new THREE.ExtrudeGeometry(shape, { depth: h - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12 });
  g.rotateX(Math.PI / 2);
  g.translate(0, h - bevel, 0);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, 1 - (pos.getZ(i) - y) / d);
  g.computeVertexNormals();
  return g;
}

const PAD_H = 0.42;
const pad = new THREE.Mesh(
  roundedSlab(64, PAD_H, 44, 1.2),
  new THREE.MeshPhysicalMaterial({
    map: tex(T.leatherColor(2048, 1408)),
    normalMap: tex(T.leatherNormal(1024), { srgb: false, repeat: 10 }),
    normalScale: new THREE.Vector2(0.22, 0.22),
    roughness: 0.58,
    sheen: 0.3,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0x5a6a90),
  }),
);
pad.position.set(-2, 0, 1);
pad.rotation.y = 0.04;
scene.add(pad);

/* ---------- Paper ---------- */
const PPC = 260;
const docPlain = T.affidavit(PPC);
const docSealed = T.affidavit(PPC, { sealed: true });
const [DW, DH] = docPlain.size;
const PAPER_T = 0.035;
const paperNormal = tex(T.paperNormal(1024), { srgb: false, repeat: 4 });

// A sheet with real thickness and a little life in it: the far corner lifts,
// the rest undulates by a fraction of a millimetre. The seal area stays flat.
function sheetGeometry(curl = 1) {
  const g = new THREE.BoxGeometry(DW, PAPER_T, DH, 90, 1, 116);
  const p = g.attributes.position;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / DW + 0.5, w = p.getZ(i) / DH + 0.5;
    const corner = 0.75 * ss(0.62, 1, u) ** 2 * ss(0.65, 1, 1 - w) ** 2;
    const edge = 0.12 * ss(0.85, 1, 1 - u) * Math.sin(w * Math.PI);
    const ripple = 0.03 * Math.sin(u * 5.1 + w * 3.3) * Math.sin(w * 4.2);
    p.setY(i, p.getY(i) + curl * (corner + edge + ripple));
  }
  g.computeVertexNormals();
  return g;
}
const paperEdge = new THREE.MeshPhysicalMaterial({ color: 0xe9e6dd, roughness: 0.9 });
const paperMat = (canvas) => [
  paperEdge, paperEdge,
  new THREE.MeshPhysicalMaterial({
    map: tex(canvas),
    normalMap: paperNormal,
    normalScale: new THREE.Vector2(0.12, 0.12),
    roughness: 0.86,
    sheen: 0.35,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0xffffff),
  }),
  paperEdge, paperEdge, paperEdge,
];

const docGroup = new THREE.Group();
docGroup.position.set(0, PAD_H, 0);
docGroup.rotation.y = -0.1;
scene.add(docGroup);

const under = new THREE.Mesh(sheetGeometry(0.4), paperMat(T.underSheet(70)));
under.position.set(1.6, PAPER_T / 2 + 0.002, -1.2);
under.rotation.y = -0.07;
docGroup.add(under);

const topMats = paperMat(docPlain.canvas);
const sealedMap = tex(docSealed.canvas);
const plainMap = topMats[2].map;
const topSheet = new THREE.Mesh(sheetGeometry(1), topMats);
topSheet.position.y = PAPER_T * 1.5 + 0.006;
docGroup.add(topSheet);

docGroup.updateMatrixWorld();
const docPt = (u, w) => new THREE.Vector3(u - DW / 2, 0, w - DH / 2).applyMatrix4(docGroup.matrixWorld);
const SEAL = docPt(docPlain.seal[0], docPlain.seal[1]);
SEAL.y = docGroup.position.y + topSheet.position.y + PAPER_T / 2;

/* ---------- Notary journal ---------- */
const journal = new THREE.Group();
const cm = T.clothMaps(1024, 1400);
const coverMat = new THREE.MeshPhysicalMaterial({
  map: tex(cm.color),
  roughnessMap: tex(cm.rough, { srgb: false }),
  metalnessMap: tex(cm.metal, { srgb: false }),
  roughness: 1,
  metalness: 1,
  sheen: 0.6,
  sheenRoughness: 0.6,
  sheenColor: new THREE.Color(0x3b4a78),
});
const boardMat = new THREE.MeshPhysicalMaterial({ color: 0x141c34, roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color(0x3b4a78) });
const cover = new THREE.Mesh(roundedSlab(17, 0.32, 23, 0.35), [coverMat, boardMat]);
cover.position.y = 2.18;
const back = new THREE.Mesh(roundedSlab(17, 0.32, 23, 0.35), boardMat);
const spine = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 23, 32, 1, false, Math.PI, Math.PI), boardMat);
spine.rotation.x = Math.PI / 2;
spine.position.set(-8.5, 1.25, 0);
const edgeMat = new THREE.MeshPhysicalMaterial({ map: tex(T.pageEdge(512, 256)), roughness: 0.95 });
const pagesMat = new THREE.MeshPhysicalMaterial({ color: 0xe2ddd0, roughness: 0.95 });
const pages = new THREE.Mesh(new THREE.BoxGeometry(16.2, 1.86, 22.2), [edgeMat, pagesMat, pagesMat, pagesMat, edgeMat, edgeMat]);
pages.position.set(0.15, 1.25, 0);
journal.add(back, cover, spine, pages);
journal.position.set(-25, PAD_H, -12);
journal.rotation.y = 0.22;
scene.add(journal);

/* ---------- Lathe helpers ---------- */
function lathe(points, segments = 128) {
  const curve = new THREE.SplineCurve(points.map(([r, y]) => new THREE.Vector2(r, y)));
  return new THREE.LatheGeometry(curve.getPoints(points.length * 12), segments);
}
const latheSharp = (points, segments = 128) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);

const brushedTex = tex(T.brushed(1024, 256), { srgb: false });
const brass = new THREE.MeshPhysicalMaterial({ color: 0xd2a25a, metalness: 1, roughness: 0.42, roughnessMap: brushedTex });
const knurled = new THREE.MeshPhysicalMaterial({
  color: 0xc99a52, metalness: 1, roughness: 0.38,
  normalMap: tex(T.knurl(1024, 64), { srgb: false }), normalScale: new THREE.Vector2(0.8, 0.8),
});
const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0b468, metalness: 1, roughness: 0.22 });
const wood = new THREE.MeshPhysicalMaterial({
  map: tex(T.walnut(512, 1024, true)), color: new THREE.Color(2.4, 1.9, 1.6),
  roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.32,
});
const rubber = new THREE.MeshPhysicalMaterial({ color: 0x1a2350, roughness: 0.8 });

/* ---------- The stamp ---------- */
const stamp = new THREE.Group();
[
  [latheSharp([[0, 0], [2.18, 0], [2.24, 0.05], [2.24, 0.38], [0, 0.38]]), rubber],
  [latheSharp([[0, 0.38], [2.42, 0.38], [2.48, 0.46], [2.48, 0.6], [0, 0.6]]), brass],
  [latheSharp([[2.48, 0.6], [2.48, 0.98], [0, 0.98]]), knurled],
  [latheSharp([[0, 0.98], [2.48, 0.98], [2.36, 1.12], [1.6, 1.32], [1.12, 1.62], [1.02, 1.86], [0, 1.86]]), brass],
  [lathe([[0, 1.86], [0.98, 1.86], [0.86, 2.6], [0.8, 3.5], [0.96, 4.4], [1.45, 5.4], [1.86, 6.4], [1.92, 7.1], [1.72, 7.8], [1.2, 8.35], [0.5, 8.62], [0, 8.66]]), wood],
  [latheSharp([[0.99, 4.12], [1.06, 4.16], [1.08, 4.24], [1.08, 4.42], [1.06, 4.5], [0.99, 4.54]]), gold],
].forEach(([g, m]) => stamp.add(new THREE.Mesh(g, m)));
scene.add(stamp);

/* ---------- Fountain pen ---------- */
const resin = new THREE.MeshPhysicalMaterial({ color: 0x0a0d16, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.18 });
const pen = new THREE.Group();
[
  [lathe([[0, 0], [0.12, 0.05], [0.34, 0.9], [0.48, 2.0]]), gold],
  [lathe([[0.42, 1.9], [0.5, 2.6], [0.55, 4.0], [0.56, 7.4], [0.5, 8.0]]), resin],
  [latheSharp([[0.6, 7.4], [0.62, 7.45], [0.62, 7.75], [0.6, 7.8]]), gold],
  [lathe([[0.6, 7.8], [0.64, 9.0], [0.62, 12.6], [0.5, 13.4], [0.2, 13.7], [0, 13.72]]), resin],
  [latheSharp([[0.6, 8.0], [0.66, 8.05], [0.66, 8.5], [0.6, 8.55]]), gold],
].forEach(([g, m]) => pen.add(new THREE.Mesh(g, m)));
const clipCurve = new THREE.CatmullRomCurve3([v(0, 8.6, 0.6), v(0, 9.4, 0.78), v(0, 12.2, 0.74), v(0, 12.9, 0.66)]);
pen.add(new THREE.Mesh(new THREE.TubeGeometry(clipCurve, 40, 0.11, 10), gold));
pen.rotation.z = -Math.PI / 2;
const penHolder = new THREE.Group();
penHolder.add(pen);
penHolder.rotation.y = 0.75;
penHolder.position.set(-27, PAD_H + 0.62, 13);
scene.add(penHolder);

scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
desk.castShadow = false;

/* ---------- Light ---------- */
// A warm desk lamp out of frame: a soft-edged physical spot with a real
// emitter radius, so shadows soften with distance as they do in life.
const LAMP = new THREE.Vector3(-34, 78, -18);
const lamp = new THREE.SpotLight(0xffcf98, 15000, 0, 0.42, 0.8, 2);
lamp.position.copy(LAMP);
lamp.target.position.set(3, 0, 4);
lamp.castShadow = true;
lamp.shadow.mapSize.set(4096, 4096);
lamp.shadow.camera.near = 40;
lamp.shadow.camera.far = 160;
lamp.shadow.bias = -0.00015;
lamp.shadow.normalBias = 0.015;
scene.add(lamp, lamp.target);

// Sky light: its direction is re-drawn every sample from a cosine-weighted
// hemisphere. Averaged, the shadows converge to ambient occlusion: objects
// sit on the desk instead of floating over it.
const sky = new THREE.DirectionalLight(0x6d7fae, 1.1);
sky.castShadow = true;
sky.shadow.mapSize.set(4096, 4096);
Object.assign(sky.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 220 });
sky.shadow.bias = -0.0006;
sky.shadow.normalBias = 0.06;
sky.target.position.set(-6, 0, 2);
scene.add(sky, sky.target);

// Warm bounce from the lit paper and leather, without shadows.
const bounce = new THREE.HemisphereLight(0x0a0c14, 0x3a2614, 0.5);
scene.add(bounce);

const rim = new THREE.DirectionalLight(0x9fb4e6, 0.35);
rim.position.set(40, 30, -60);
scene.add(rim);

/* ---------- Timeline ---------- */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeIn = (x) => x * x * x;

const FOCUS = docPt(11.6, 22.3);
const SHOTS = {
  wide: {
    pos: new THREE.CatmullRomCurve3([v(-14, 34, 44), v(-6, 30, 36), v(4, 24, 28), FOCUS.clone().add(v(1.6, 17.5, 11.5))]),
    look: new THREE.CatmullRomCurve3([v(-2, 0, 1), v(1, 0, 4), SEAL.clone().add(v(-1.5, 0, -0.8)), FOCUS.clone()]),
    shift: [-0.2, 0],
    fov: 32,
  },
  tall: {
    pos: new THREE.CatmullRomCurve3([v(-4, 66, 34), v(-1, 50, 30), v(3, 36, 24), FOCUS.clone().add(v(0.8, 27, 13))]),
    look: new THREE.CatmullRomCurve3([v(-2, 0, 1), v(1, 0, 4), SEAL.clone().add(v(-1, 0, -1.2)), FOCUS.clone().add(v(1.4, 0, 0))]),
    shift: [0, -0.16],
    fov: 40,
  },
};
const shot = SHOTS[SHOT];

function stateAt(t) {
  const c = easeInOut(t);
  const s = {};
  s.camPos = shot.pos.getPoint(c);
  s.camLook = shot.look.getPoint(c);
  // Aperture radius in scene units (cm): deep focus early, shallow on the seal.
  s.aperture = 0.04 + 0.1 * Math.sin(Math.PI * Math.min(1, seg(t, 0.3, 1) * 0.75 + 0.25));

  const above = SEAL.clone().add(v(5, 44, -12));
  const hover = SEAL.clone().add(v(0, 1.6, 0));
  const away = SEAL.clone().add(v(3, 46, -16));
  let pos, tilt, spin, squash = 1;
  if (t < 0.6) {
    const k = easeOut(seg(t, 0.16, 0.6));
    pos = above.clone().lerp(hover, k);
    tilt = 0.32 * (1 - k);
    spin = 0.5 * (1 - k);
  } else if (t < 0.7) {
    pos = hover.clone().lerp(SEAL, easeIn(seg(t, 0.6, 0.66)));
    tilt = 0; spin = 0;
    squash = 1 - 0.02 * Math.sin(Math.PI * seg(t, 0.64, 0.72));
  } else {
    const k = seg(t, 0.72, 0.95);
    pos = SEAL.clone().lerp(away, easeIn(k));
    pos.y = SEAL.y + (away.y - SEAL.y) * (1 - Math.pow(1 - k, 1.6)) * easeIn(Math.min(1, k * 1.6));
    tilt = -0.18 * easeIn(k);
    spin = -0.3 * easeIn(k);
  }
  s.stampPos = pos; s.stampTilt = tilt; s.stampSpin = spin; s.squash = squash;
  s.sealed = t >= 0.66;
  return s;
}

/* ---------- Renderer ---------- */
const camera = new THREE.PerspectiveCamera(shot.fov, W / H, 1, 600);
const rtOpts = { type: THREE.HalfFloatType, colorSpace: THREE.NoColorSpace };
const sampleRT = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, depthBuffer: true, samples: 4 });
const accumRT = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, depthBuffer: false });

const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const finalMat = new THREE.ShaderMaterial({
  uniforms: { tAcc: { value: null }, exposure: { value: +(q.get("exposure") || 1.0) }, res: { value: new THREE.Vector2(W, H) } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
  fragmentShader: /* glsl */ `
    uniform sampler2D tAcc; uniform float exposure; uniform vec2 res;
    varying vec2 vUv;
    vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.); }
    vec3 srgb(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4)) - 0.055, step(0.0031308, c)); }
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tAcc, vUv).rgb * exposure;
      vec3 glow = vec3(0.);
      for (int i = 0; i < 12; i++) {
        float a = float(i) * 0.5236;
        vec2 o = vec2(cos(a), sin(a));
        glow += max(texture2D(tAcc, vUv + o * 5. / res).rgb * exposure - 1.0, 0.);
        glow += max(texture2D(tAcc, vUv + o * 14. / res).rgb * exposure - 1.0, 0.) * 0.5;
      }
      c += glow * vec3(0.02, 0.015, 0.01);
      c = aces(c);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(c * vec3(0.92, 0.98, 1.1), c * vec3(1.03, 1.0, 0.95), smoothstep(0.05, 0.6, l));
      vec2 q = vUv - 0.5; q.x *= res.x / res.y;
      c *= mix(1., smoothstep(1.2, 0.3, length(q)), 0.6);
      c = srgb(c);
      c += (h(gl_FragCoord.xy) - 0.5) / 255.;
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest: false,
  depthWrite: false,
});
const accumMat = new THREE.ShaderMaterial({
  uniforms: { tSrc: { value: sampleRT.texture }, weight: { value: 1 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
  fragmentShader: "uniform sampler2D tSrc; uniform float weight; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * weight, 1.); }",
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  depthTest: false, depthWrite: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), finalMat);
const quadScene = new THREE.Scene();
quadScene.add(quad);

function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }

function renderAt(t) {
  const s = stateAt(t);
  stamp.position.copy(s.stampPos);
  stamp.rotation.set(s.stampTilt, s.stampSpin, s.stampTilt * 0.4);
  stamp.scale.set(1, s.squash, 1);
  topMats[2].map = s.sealed ? sealedMap : plainMap;

  // Orientation is fixed per frame; the lens offset is compensated in the
  // projection so the focal plane stays put (true thin-lens blur, no ghosting).
  camera.position.copy(s.camPos);
  camera.up.set(0, 1, 0);
  camera.lookAt(s.camLook);
  camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const focus = s.camPos.distanceTo(s.camLook);
  const ppu = H / (2 * focus * Math.tan(THREE.MathUtils.degToRad(shot.fov) / 2));

  renderer.setRenderTarget(accumRT);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  for (let i = 0; i < SAMPLES; i++) {
    const n = i + 1;
    const jx = halton(n, 2) - 0.5, jy = halton(n, 3) - 0.5;
    const r = Math.sqrt(halton(n, 5)) * s.aperture, a = halton(n, 7) * Math.PI * 2;
    const dx = Math.cos(a) * r, dy = Math.sin(a) * r;
    camera.position.copy(s.camPos).addScaledVector(right, dx).addScaledVector(up, dy);
    camera.setViewOffset(W, H, shot.shift[0] * W + jx - dx * ppu, shot.shift[1] * H + jy + dy * ppu, W, H);

    const la = halton(n, 11) * Math.PI * 2, lr = Math.sqrt(halton(n, 13)) * 6;
    lamp.position.set(LAMP.x + Math.cos(la) * lr, LAMP.y, LAMP.z + Math.sin(la) * lr);

    // Cosine-weighted hemisphere direction for the sky light.
    const u1 = halton(n, 17), u2 = halton(n, 19);
    const sr = Math.sqrt(u1), sp = u2 * Math.PI * 2;
    const dir = new THREE.Vector3(sr * Math.cos(sp), Math.sqrt(1 - u1), sr * Math.sin(sp));
    sky.position.copy(sky.target.position).addScaledVector(dir, 120);

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
  finalMat.uniforms.tAcc.value = accumRT.texture;
  renderer.setRenderTarget(null);
  renderer.render(quadScene, quadCam);
}

window.renderFrame = (i, total) => {
  renderAt(total > 1 ? i / (total - 1) : 0);
  return renderer.domElement.toDataURL("image/png");
};
window.sceneReady = true;
