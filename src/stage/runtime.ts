// Live renderer for the intro film. Loads three.js and the baked textures on
// demand, then draws the exact moment for any scroll position, so motion is
// as smooth as the display refresh rate however slowly the page scrolls.

import manifest from "../../public/stage/manifest.json";

export type Stage = {
  /** Draw timeline position t ∈ [0, 1]. `dt` is seconds since the previous draw while animating (0 if idle). */
  render(t: number, dt?: number): void;
  resize(): void;
  dispose(): void;
  /** True if even at the lowest resolution the device can't keep up. */
  readonly struggling: boolean;
};

const COLOR = ["desk", "padColor", "paper", "under", "clothColor", "pageEdge", "woodHandle", "lmDesk", "lmPad", "lmUnder", "lmTop"];
const DATA = ["brushed", "knurl", "clothRM", "sealInk"];

export async function createStage(container: HTMLElement): Promise<Stage> {
  const THREE = await import("three");
  const { buildStage, makeReflectionEnv, TONE_MAPPING_GLSL } = await import("./build.js");

  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
    "vec3 CustomToneMapping( vec3 color ) { return color; }",
    TONE_MAPPING_GLSL,
  );

  const small = Math.min(window.screen.width, window.screen.height) < 600;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.CustomToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.shadowMap.autoUpdate = true;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");

  const loader = new THREE.TextureLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const names = [...COLOR, ...DATA];
  const textures = await Promise.all(
    names.map((name) => {
      const file = name === "paper" && small ? "paperSmall" : name;
      return loader.loadAsync(`/stage/${file}.webp`);
    }),
  );
  const tex: Record<string, InstanceType<typeof THREE.Texture>> = {};
  names.forEach((name, i) => {
    const t = textures[i];
    t.colorSpace = COLOR.includes(name) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = name === "paper" ? aniso : Math.min(aniso, 8);
    tex[name] = t;
  });

  const stage = buildStage({ tex, mode: "live", lightmapScale: manifest.lightmapScale, segments: small ? 64 : 96 });
  const { scene } = stage;
  scene.environment = makeReflectionEnv(renderer);
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 600);

  // Resolution governor: start sharp, step down if frames run long.
  const maxRatio = Math.min(window.devicePixelRatio || 1, small ? 2 : 2);
  let ratio = maxRatio;
  let slow = 0, fast = 0, struggling = false, last = 0;
  let width = 1, height = 1;

  const resize = () => {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
  };

  const render = (t: number, dt = 0) => {
    stage.applyState(t);
    stage.frameCamera(camera, width, height, t);
    renderer.render(scene, camera);
    last = t;
    if (dt > 0) {
      if (dt > 1 / 40) { slow++; fast = 0; } else if (dt < 1 / 55) { fast++; slow = Math.max(0, slow - 1); }
      if (slow > 20) {
        slow = 0;
        if (ratio > 1) { ratio = Math.max(1, ratio - 0.25); resize(); }
        else struggling = true;
      } else if (fast > 240 && ratio < maxRatio) {
        fast = 0;
        ratio = Math.min(maxRatio, ratio + 0.25);
        resize();
      }
    }
  };

  container.appendChild(canvas);
  resize();
  stage.applyState(0);
  stage.frameCamera(camera, width, height, 0);
  // Compile every shader up front so the first scroll never hitches.
  await renderer.compileAsync(scene, camera);
  render(0);

  return {
    render,
    resize: () => { resize(); render(last); },
    dispose: () => {
      renderer.dispose();
      Object.values(tex).forEach((t) => t.dispose());
      canvas.remove();
    },
    get struggling() { return struggling; },
  };
}
