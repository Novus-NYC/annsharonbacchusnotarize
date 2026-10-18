// The notary desk scene, shared by the live site renderer (`mode: "live"`)
// and the offline lightmap baker in footage/ (`mode: "bake"`). Plain JS so
// the baker can load it straight into a browser without a build step.
//
// Units are centimetres. Static surfaces (desk, leather pad, paper) are lit by
// baked lightmaps in live mode; the stamp, pen and journal are lit in real
// time. Everything the scroll drives lives in `applyState(t)`.

import * as THREE from "three";

export const PAD_H = 0.42;
export const DW = 21.6; // US Letter, cm
export const DH = 27.9;
export const PAPER_T = 0.035;
export const SEAL_DOC = [14.7, 22.6];
export const SEAL_R = 2.2;

/* ---------- Geometry helpers ---------- */
function roundedSlab(w, h, d, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r); shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d); shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const bevel = Math.min(0.12, h * 0.4);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: h - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12,
  });
  g.rotateX(Math.PI / 2);
  g.translate(0, h - bevel, 0);
  // Planar UVs from above, so the top face maps 0..1 like a texture.
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, 1 - (pos.getZ(i) - y) / d);
  g.computeVertexNormals();
  return g;
}

// A sheet with real thickness: the far corner lifts, the rest undulates by a
// fraction of a millimetre, and the seal area stays flat for the stamp.
function sheetGeometry(curl) {
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

function lathe(points, segments) {
  const curve = new THREE.SplineCurve(points.map(([r, y]) => new THREE.Vector2(r, y)));
  return new THREE.LatheGeometry(curve.getPoints(points.length * 10), segments);
}
const latheSharp = (points, segments) =>
  new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);

const v = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- Timeline ---------- */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeIn = (x) => x * x * x;

/**
 * @param {{ tex: Record<string, THREE.Texture>, mode: "live" | "bake", lightmapScale?: Record<string, number>, segments?: number }} opts
 */
export function buildStage({ tex, mode, lightmapScale = {}, segments = 96 }) {
  const live = mode === "live";
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020306);

  // Baked surfaces: albedo × lightmap, no runtime lighting. The lightmap is
  // stored normalised and sRGB-encoded; intensity restores the true range
  // (and undoes three's 1/π for lightmaps on basic materials).
  const baked = (map, key, extra = {}) =>
    live
      ? new THREE.MeshBasicMaterial({ map, lightMap: tex[key], lightMapIntensity: (lightmapScale[key] || 1) * Math.PI, ...extra })
      : new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const hidden = new THREE.MeshBasicMaterial({ visible: false });

  /** Surfaces the baker renders lightmaps for: [key, mesh, width, height, material group]. */
  const bakeTargets = [];

  /* Desk */
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(260, 160), baked(tex.desk, "lmDesk"));
  desk.rotation.x = -Math.PI / 2;
  scene.add(desk);
  bakeTargets.push(["lmDesk", desk, 1024, 640]);

  /* Leather pad */
  const pad = new THREE.Mesh(roundedSlab(64, PAD_H, 44, 1.2), baked(tex.padColor, "lmPad"));
  pad.position.set(-2, 0, 1);
  pad.rotation.y = 0.04;
  scene.add(pad);
  bakeTargets.push(["lmPad", pad, 2048, 1408]);

  /* Paper */
  const paperEdge = live ? new THREE.MeshLambertMaterial({ color: 0xe9e6dd }) : new THREE.MeshStandardMaterial({ color: 0xe9e6dd, roughness: 0.9 });
  const sheetMats = (top) => [paperEdge, paperEdge, top, paperEdge, paperEdge, paperEdge];

  const docGroup = new THREE.Group();
  docGroup.position.set(0, PAD_H, 0);
  docGroup.rotation.y = -0.1;
  scene.add(docGroup);

  const under = new THREE.Mesh(sheetGeometry(0.4), sheetMats(baked(tex.under, "lmUnder")));
  under.position.set(1.6, PAPER_T / 2 + 0.002, -1.2);
  under.rotation.y = -0.07;
  docGroup.add(under);
  bakeTargets.push(["lmUnder", under, 512, 662, 2]);

  const topSheet = new THREE.Mesh(sheetGeometry(1), sheetMats(baked(tex.paper, "lmTop")));
  topSheet.position.y = PAPER_T * 1.5 + 0.006;
  docGroup.add(topSheet);
  bakeTargets.push(["lmTop", topSheet, 1024, 1323, 2]);

  docGroup.updateMatrixWorld(true);
  const docPt = (u, w) => new THREE.Vector3(u - DW / 2, 0, w - DH / 2).applyMatrix4(docGroup.matrixWorld);
  const SEAL = docPt(SEAL_DOC[0], SEAL_DOC[1]);
  SEAL.y = docGroup.position.y + topSheet.position.y + PAPER_T / 2;

  /* Journal */
  const journal = new THREE.Group();
  const coverMat = new THREE.MeshPhysicalMaterial({
    map: tex.clothColor, roughnessMap: tex.clothRM, metalnessMap: tex.clothRM,
    roughness: 1, metalness: 1, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x3b4a78),
  });
  const boardMat = new THREE.MeshPhysicalMaterial({ color: 0x141c34, roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color(0x3b4a78) });
  const cover = new THREE.Mesh(roundedSlab(17, 0.32, 23, 0.35), [coverMat, boardMat]);
  cover.position.y = 2.18;
  const back = new THREE.Mesh(roundedSlab(17, 0.32, 23, 0.35), boardMat);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 23, 32, 1, false, Math.PI, Math.PI), boardMat);
  spine.rotation.x = Math.PI / 2;
  spine.position.set(-8.5, 1.25, 0);
  const edgeMat = new THREE.MeshStandardMaterial({ map: tex.pageEdge, roughness: 0.95 });
  const pagesMat = new THREE.MeshStandardMaterial({ color: 0xe2ddd0, roughness: 0.95 });
  const pages = new THREE.Mesh(new THREE.BoxGeometry(16.2, 1.86, 22.2), [edgeMat, pagesMat, pagesMat, pagesMat, edgeMat, edgeMat]);
  pages.position.set(0.15, 1.25, 0);
  journal.add(back, cover, spine, pages);
  journal.position.set(-25, PAD_H, -12);
  journal.rotation.y = 0.22;
  scene.add(journal);

  /* Stamp */
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xd2a25a, metalness: 1, roughness: 0.42, roughnessMap: tex.brushed });
  const knurled = new THREE.MeshPhysicalMaterial({
    color: 0xc99a52, metalness: 1, roughness: 0.38, normalMap: tex.knurl, normalScale: new THREE.Vector2(0.8, 0.8),
  });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0b468, metalness: 1, roughness: 0.22 });
  const wood = new THREE.MeshPhysicalMaterial({
    map: tex.woodHandle, color: new THREE.Color(2.4, 1.9, 1.6), roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.32,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1a2350, roughness: 0.8 });

  const stamp = new THREE.Group();
  const S = segments;
  [
    [latheSharp([[0, 0], [2.18, 0], [2.24, 0.05], [2.24, 0.38], [0, 0.38]], S), rubber],
    [latheSharp([[0, 0.38], [2.42, 0.38], [2.48, 0.46], [2.48, 0.6], [0, 0.6]], S), brass],
    [latheSharp([[2.48, 0.6], [2.48, 0.98], [0, 0.98]], S), knurled],
    [latheSharp([[0, 0.98], [2.48, 0.98], [2.36, 1.12], [1.6, 1.32], [1.12, 1.62], [1.02, 1.86], [0, 1.86]], S), brass],
    [lathe([[0, 1.86], [0.98, 1.86], [0.86, 2.6], [0.8, 3.5], [0.96, 4.4], [1.45, 5.4], [1.86, 6.4], [1.92, 7.1], [1.72, 7.8], [1.2, 8.35], [0.5, 8.62], [0, 8.66]], S), wood],
    [latheSharp([[0.99, 4.12], [1.06, 4.16], [1.08, 4.24], [1.08, 4.42], [1.06, 4.5], [0.99, 4.54]], S), gold],
  ].forEach(([g, m]) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = true;
    stamp.add(mesh);
  });
  scene.add(stamp);

  /* Fountain pen */
  const resin = new THREE.MeshPhysicalMaterial({ color: 0x0a0d16, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.18 });
  const pen = new THREE.Group();
  [
    [lathe([[0, 0], [0.12, 0.05], [0.34, 0.9], [0.48, 2.0]], 48), gold],
    [lathe([[0.42, 1.9], [0.5, 2.6], [0.55, 4.0], [0.56, 7.4], [0.5, 8.0]], 48), resin],
    [latheSharp([[0.6, 7.4], [0.62, 7.45], [0.62, 7.75], [0.6, 7.8]], 48), gold],
    [lathe([[0.6, 7.8], [0.64, 9.0], [0.62, 12.6], [0.5, 13.4], [0.2, 13.7], [0, 13.72]], 48), resin],
    [latheSharp([[0.6, 8.0], [0.66, 8.05], [0.66, 8.5], [0.6, 8.55]], 48), gold],
  ].forEach(([g, m]) => pen.add(new THREE.Mesh(g, m)));
  const clipCurve = new THREE.CatmullRomCurve3([v(0, 8.6, 0.6), v(0, 9.4, 0.78), v(0, 12.2, 0.74), v(0, 12.9, 0.66)]);
  pen.add(new THREE.Mesh(new THREE.TubeGeometry(clipCurve, 40, 0.11, 10), gold));
  pen.rotation.z = -Math.PI / 2;
  const penHolder = new THREE.Group();
  penHolder.add(pen);
  penHolder.rotation.y = 0.75;
  penHolder.position.set(-27, PAD_H + 0.62, 13);
  scene.add(penHolder);

  /* Live-only extras: the seal impression, contact shadow, stamp shadow. */
  let ink = null, blob = null;
  const shadowCatchers = [];
  if (live) {
    // Ink multiplies onto the lit paper, like real ink.
    ink = new THREE.Mesh(
      new THREE.PlaneGeometry(SEAL_R * 2, SEAL_R * 2),
      new THREE.ShaderMaterial({
        uniforms: { map: { value: tex.sealInk }, opacity: { value: 0 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
        fragmentShader: "uniform sampler2D map; uniform float opacity; varying vec2 vUv; void main(){ float a = texture2D(map, vUv).r * opacity; gl_FragColor = vec4(mix(vec3(1.), vec3(0.2, 0.27, 0.66), a), 1.); }",
        blending: THREE.MultiplyBlending, premultipliedAlpha: true, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      }),
    );
    ink.rotation.x = -Math.PI / 2;
    ink.rotation.z = -0.06 - 0.1;
    ink.position.copy(SEAL).add(v(0, 0.004, 0));
    scene.add(ink);

    // Soft contact darkening right under the stamp as it nears the paper.
    blob = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.ShaderMaterial({
        uniforms: { strength: { value: 0 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
        fragmentShader: "uniform float strength; varying vec2 vUv; void main(){ float d = length(vUv - .5) * 2.; float s = (1. - smoothstep(.42, 1., d)) * strength; gl_FragColor = vec4(vec3(1. - s), 1.); }",
        blending: THREE.MultiplyBlending, premultipliedAlpha: true, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
      }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.copy(SEAL).add(v(0, 0.006, 0));
    scene.add(blob);

    // Only the stamp casts a real-time shadow; these catch it.
    const catcher = (geo, opacity) => {
      const m = new THREE.ShadowMaterial({ opacity, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const mesh = new THREE.Mesh(geo, m);
      mesh.receiveShadow = true;
      shadowCatchers.push(mesh);
      return mesh;
    };
    const topCatch = catcher(topSheet.geometry, 0.52);
    topCatch.material = [hidden, hidden, topCatch.material, hidden, hidden, hidden];
    topCatch.position.copy(topSheet.position);
    docGroup.add(topCatch);
    const padCatch = catcher(pad.geometry, 0.48);
    padCatch.position.copy(pad.position);
    padCatch.rotation.copy(pad.rotation);
    scene.add(padCatch);
  }

  /* Lights */
  const LAMP = new THREE.Vector3(-34, 78, -18);
  const lamp = new THREE.SpotLight(0xffcf98, 15000, 0, 0.42, 0.8, 2);
  lamp.position.copy(LAMP);
  lamp.target.position.set(3, 0, 4);
  scene.add(lamp, lamp.target);
  const bounce = new THREE.HemisphereLight(0x0a0c14, 0x3a2614, 0.5);
  scene.add(bounce);
  const rim = new THREE.DirectionalLight(0x9fb4e6, 0.35);
  rim.position.set(40, 30, -60);
  scene.add(rim);

  // Bake: a shadow-casting sky light re-aimed every sample converges to
  // ambient occlusion. Live: its average, as a hemisphere light.
  let sky = null;
  if (live) {
    scene.add(new THREE.HemisphereLight(0x6d7fae, 0x000000, 0.72));
  } else {
    sky = new THREE.DirectionalLight(0x6d7fae, 1.1);
    sky.castShadow = true;
    sky.shadow.mapSize.set(4096, 4096);
    Object.assign(sky.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 220 });
    sky.shadow.bias = -0.0006;
    sky.shadow.normalBias = 0.06;
    sky.target.position.set(-6, 0, 2);
    scene.add(sky, sky.target);
  }

  lamp.castShadow = true;
  lamp.shadow.camera.near = 40;
  lamp.shadow.camera.far = 160;
  if (live) {
    lamp.shadow.mapSize.set(2048, 2048);
    lamp.shadow.bias = -0.0005;
    lamp.shadow.blurSamples = 16;
  } else {
    lamp.shadow.mapSize.set(4096, 4096);
    lamp.shadow.bias = -0.00015;
    lamp.shadow.normalBias = 0.015;
    scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    desk.castShadow = false;
  }

  /* Camera paths */
  const FOCUS = docPt(11.6, 22.3);
  const SHOTS = {
    wide: {
      pos: new THREE.CatmullRomCurve3([v(-14, 34, 44), v(-6, 30, 36), v(4, 24, 28), FOCUS.clone().add(v(1.6, 17.5, 11.5))]),
      look: new THREE.CatmullRomCurve3([v(-2, 0, 1), v(1, 0, 4), SEAL.clone().add(v(-1.5, 0, -0.8)), FOCUS.clone()]),
      shift: [-0.2, 0], fov: 32, aspect: 16 / 9,
    },
    tall: {
      pos: new THREE.CatmullRomCurve3([v(-4, 66, 34), v(-1, 50, 30), v(3, 36, 24), FOCUS.clone().add(v(0.8, 27, 13))]),
      look: new THREE.CatmullRomCurve3([v(-2, 0, 1), v(1, 0, 4), SEAL.clone().add(v(-1, 0, -1.2)), FOCUS.clone().add(v(1.4, 0, 0))]),
      shift: [0, -0.16], fov: 40, aspect: 9 / 16,
    },
  };

  const _look = new THREE.Vector3();
  /** Frame the camera for any viewport: keep the art-directed framing's width when narrower, its height when wider. */
  function frameCamera(camera, width, height, t) {
    t = clamp01(t || 0);
    const aspect = width / height;
    const shot = aspect < 0.9 ? SHOTS.tall : SHOTS.wide;
    const c = easeInOut(t);
    shot.pos.getPoint(c, camera.position);
    shot.look.getPoint(c, _look);
    camera.up.set(0, 1, 0);
    camera.lookAt(_look);
    let fov = shot.fov;
    if (aspect < shot.aspect) {
      const halfH = Math.tan(THREE.MathUtils.degToRad(shot.fov) / 2) * (shot.aspect / aspect);
      fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfH));
    }
    camera.fov = fov;
    camera.aspect = aspect;
    camera.setViewOffset(width, height, shot.shift[0] * width, shot.shift[1] * height, width, height);
    camera.updateProjectionMatrix();
  }

  /** Pose the stamp and its traces for timeline position t ∈ [0, 1]. */
  function applyState(t) {
    t = clamp01(t || 0);
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
    stamp.position.copy(pos);
    stamp.rotation.set(tilt, spin, tilt * 0.4);
    stamp.scale.set(1, squash, 1);

    if (live) {
      const height = Math.max(0, pos.y - SEAL.y);
      ink.material.uniforms.opacity.value = t >= 0.66 ? 0.94 : 0;
      blob.material.uniforms.strength.value = 0.5 * Math.exp(-height / 1.6);
      blob.position.x = pos.x; blob.position.z = pos.z;
      // Penumbra widens as the stamp rises, like a real area light.
      lamp.shadow.radius = 4 + height * 1.1;
    }
  }

  return { scene, lamp, LAMP, sky, desk, pad, topSheet, under, stamp, docGroup, SEAL, bakeTargets, frameCamera, applyState };
}

/** A dim navy room with a warm lamp disc and a cool window strip, prefiltered for reflections. */
export function makeReflectionEnv(renderer) {
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0b1020, side: THREE.BackSide })));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(100, 32), new THREE.MeshBasicMaterial({ color: 0x1a120c }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2; room.add(floor);
  const lampDisc = new THREE.Mesh(new THREE.CircleGeometry(20, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.55).multiplyScalar(5) }));
  lampDisc.position.set(-38, 80, -20); lampDisc.lookAt(0, 0, 0); room.add(lampDisc);
  const windowStrip = new THREE.Mesh(new THREE.PlaneGeometry(70, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.65, 0.9).multiplyScalar(0.9) }));
  windowStrip.position.set(60, 35, -70); windowStrip.lookAt(0, 0, 0); room.add(windowStrip);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, 0.02).texture;
  pmrem.dispose();
  return env;
}

// Matches the offline grade: Narkowicz ACES plus a navy/warm split tone.
export const TONE_MAPPING_GLSL = /* glsl */ `vec3 CustomToneMapping( vec3 color ) {
  color *= toneMappingExposure;
  vec3 c = clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(c * vec3(0.92, 0.98, 1.1), c * vec3(1.03, 1.0, 0.95), smoothstep(0.05, 0.6, l));
}`;
