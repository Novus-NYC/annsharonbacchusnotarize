"use client";

import { useEffect, useRef } from "react";

// A guilloché rosette, the engraved line-work printed on certificates and
// banknotes, drawn as hundreds of WebGL line strips. Each band is a family of
// phase-shifted sine rings; nudging the phase with time and scroll makes the
// moiré between them shimmer like foil. Every vertex is computed on the GPU.

const VERT = `
attribute vec3 a; // theta, curve fraction, band
uniform float uTime;
uniform float uScroll;
uniform vec2 uScale;
varying float vFade;
const float TAU = 6.2831853;
void main() {
  float th = a.x, k = a.y, band = a.z;
  float r;
  if (band < 0.5) {
    r = 0.80 + 0.075 * sin(24.0 * th + k * TAU * 0.5 + uScroll * 1.4) + 0.012 * sin(96.0 * th - uTime * 0.05);
  } else if (band < 1.5) {
    r = 0.52 + 0.11 * sin(12.0 * th + k * TAU * 0.5 - uScroll * 1.1 + uTime * 0.04) * (0.8 + 0.2 * sin(3.0 * th + uTime * 0.03));
  } else {
    float m = 0.5 + 0.5 * sin(5.0 * th + k * TAU + uScroll * 0.8);
    r = 0.16 + 0.13 * m * m + 0.02 * sin(30.0 * th + uTime * 0.06);
  }
  vFade = band < 0.5 ? 0.9 : (band < 1.5 ? 1.0 : 0.75);
  gl_Position = vec4(r * vec2(cos(th), sin(th)) * uScale, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;
varying float vFade;
void main() { gl_FragColor = vec4(uColor, uAlpha * vFade); }`;

const BANDS = [
  { curves: 36, steps: 1400 },
  { curves: 30, steps: 900 },
  { curves: 24, steps: 600 },
];

export default function Guilloche({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, premultipliedAlpha: true, alpha: true });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const ranges: [number, number][] = [];
    const data: number[] = [];
    BANDS.forEach((b, band) => {
      for (let c = 0; c < b.curves; c++) {
        const start = data.length / 3;
        for (let i = 0; i <= b.steps; i++) data.push((i / b.steps) * Math.PI * 2, c / b.curves, band);
        ranges.push([start, b.steps + 1]);
      }
    });
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uTime = u("uTime"), uScroll = u("uScroll"), uScale = u("uScale");
    gl.uniform3f(u("uColor"), 0.79, 0.64, 0.35);
    gl.uniform1f(u("uAlpha"), 0.22);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);

    const still = !document.documentElement.classList.contains("motion");
    let raf = 0, visible = false, scroll = 0, eased = 0, t0 = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const s = 0.98;
      gl.uniform2f(uScale, w > h ? (s * h) / w : s, w > h ? s : (s * w) / h);
    };

    const draw = (time: number) => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uScroll, eased);
      for (const [start, count] of ranges) gl.drawArrays(gl.LINE_STRIP, start, count);
    };

    const readScroll = () => {
      const r = canvas.getBoundingClientRect();
      scroll = (window.innerHeight - r.top) / (window.innerHeight + r.height);
    };

    const frame = (now: number) => {
      readScroll();
      eased += (scroll - eased) * 0.08;
      draw((now - t0) / 1000);
      raf = visible ? requestAnimationFrame(frame) : 0;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (still) return;
      if (visible && !raf) { t0 = performance.now() - 1000 * 40; raf = requestAnimationFrame(frame); }
    });

    const ro = new ResizeObserver(() => { resize(); if (still || !raf) { readScroll(); eased = scroll; draw(40); } });
    ro.observe(canvas);
    io.observe(canvas);
    resize();
    readScroll();
    eased = scroll;
    draw(40);
    canvas.classList.add("is-drawn");

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      // Don't lose the context here: a remount (e.g. Strict Mode) gets the
      // same canvas back and would inherit a dead context.
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
