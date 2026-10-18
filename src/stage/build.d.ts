import type * as THREE from "three";

export function buildStage(opts: {
  tex: Record<string, THREE.Texture>;
  mode: "live" | "bake";
  lightmapScale?: Record<string, number>;
  segments?: number;
}): {
  scene: THREE.Scene;
  stamp: THREE.Group;
  applyState(t: number): void;
  frameCamera(camera: THREE.PerspectiveCamera, width: number, height: number, t: number): void;
};
export function makeReflectionEnv(renderer: THREE.WebGLRenderer): THREE.Texture;
export const TONE_MAPPING_GLSL: string;
