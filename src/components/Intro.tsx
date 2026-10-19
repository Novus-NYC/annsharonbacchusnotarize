"use client";

import { useEffect, useRef, useState } from "react";
import { createTimeline, stagger, svg, utils } from "animejs";

// Page-load intro. A CSS preloader spins from first paint while the page
// hydrates, fonts load and the film's renderer warms up; once the main thread
// is free, anime.js engraves a notary seal, presses it, and opens it like an
// iris onto the film. The head script opts in with `html.intro-on` (motion
// allowed, a fresh navigation, no deep link); any input skips to the end.
// If this script never runs, a CSS failsafe clears the overlay on its own.

const C = 200;
const TAU = Math.PI * 2;

// The same guilloché bands as the contact section, as SVG paths.
function band(curves: number, steps: number, radius: (th: number, k: number) => number) {
  return Array.from({ length: curves }, (_, i) => {
    const k = i / curves;
    let d = "";
    for (let s = 0; s <= steps; s++) {
      const th = (s / steps) * TAU;
      const r = radius(th, k);
      d += `${s ? "L" : "M"}${(C + r * Math.cos(th)).toFixed(1)} ${(C + r * Math.sin(th)).toFixed(1)}`;
    }
    return d + "Z";
  });
}
const ROSETTE = [
  ...band(7, 480, (th, k) => 112 + 9 * Math.sin(24 * th + k * Math.PI)),
  ...band(6, 360, (th, k) => 78 + 15 * Math.sin(12 * th + k * Math.PI)),
];

// Matches the failsafe delay in globals.css.
const FAILSAFE_MS = 8000;
// The preloader waits at most this long for the film before the intro plays.
const MAX_WAIT_MS = 5000;

const LEGEND = "ANN SHARON BACCHUS • NOTARY PUBLIC • BROOKLYN, NEW YORK • ";

export default function Intro() {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el || !root.classList.contains("intro-on") || location.hash || window.scrollY > 40) {
      root.classList.remove("intro-on");
      setDone(true);
      return;
    }
    // The CSS failsafe already cleared the overlay; don't bring it back.
    if (performance.now() > FAILSAFE_MS - 100) {
      root.classList.remove("intro-on");
      setDone(true);
      return;
    }
    el.classList.add("intro--js");

    const q = <T extends Element>(s: string, scope: ParentNode = el) => [...scope.querySelectorAll<T>(s)];
    const seal = el.querySelector<HTMLElement>(".intro__emblem")!;
    const wave = el.querySelector(".intro__wave")!;
    const film = document.querySelector(".beat--intro");
    const rise = film ? q<HTMLElement>(".rise", film) : [];
    const after = [...q<HTMLElement>(".beat__actions, .film__cue", document), ...q<HTMLElement>(".header", document)];
    const iris = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 40;

    const loader = el.querySelector<HTMLElement>(".loader")!;
    const rings = svg.createDrawable(q(".intro__ring"));
    const rosette = svg.createDrawable(q(".intro__rosette path"));
    const chars = q(".intro__legend tspan");
    const mono = q(".intro__mono span");

    utils.set(rise, { translateY: "110%" });
    utils.set(after, { opacity: 0 });
    utils.set([...rings, ...rosette], { draw: "0 0" });

    const tl = createTimeline({
      autoplay: false,
      defaults: { ease: "outExpo" },
      onComplete: () => finish(),
    })
      .add(loader, { opacity: 0, scale: 0.8, duration: 450, ease: "inQuad" }, 0)
      .set(seal, { opacity: 1 }, 300)
      .add(rings, { draw: ["0 0", "0 1"], duration: 1000, ease: "inOutQuad", delay: stagger(90) }, 300)
      .add(rosette, { draw: ["0 0", "0 1"], duration: 1100, ease: "inOutSine", delay: stagger(30) }, 450)
      .add(chars, { opacity: [0, 1], duration: 300, ease: "linear", delay: stagger(14) }, 600)
      .add(mono, { translateY: ["100%", "0%"], opacity: [0, 1], duration: 800, delay: stagger(70) }, 1150)
      .label("press", 1950)
      .add(seal, { scale: [1, 0.93], duration: 130, ease: "inQuad" }, "press")
      .add(seal, { scale: [0.93, 1], duration: 520, ease: "outBack(3)" }, "press+=130")
      .add(wave, { r: [168, 260], opacity: [0.7, 0], strokeWidth: [3, 0.5], duration: 900, ease: "outCubic" }, "press+=130")
      .label("open", "press+=520")
      .add(seal, { scale: 1.9, opacity: 0, duration: 800, ease: "inCubic" }, "open")
      .add(el, { "--iris": ["-2px", `${iris}px`], duration: 1000, ease: "inOutQuart" }, "open+=150")
      .add(rise, { translateY: "0%", duration: 1100, delay: stagger(90) }, "open+=450")
      .add(after, { opacity: 1, duration: 700, ease: "outQuad" }, "open+=900");

    // Ready = fonts in, film rendering (or given up on), then two quiet frames.
    const section = document.querySelector(".film");
    const filmReady = new Promise<void>((resolve) => {
      if (!section || section.classList.contains("film--ready")) return resolve();
      const mo = new MutationObserver(() => {
        if (section.classList.contains("film--ready")) { mo.disconnect(); resolve(); }
      });
      mo.observe(section, { attributes: true, attributeFilter: ["class"] });
    });
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    Promise.race([Promise.all([document.fonts.ready, filmReady]), wait(MAX_WAIT_MS - performance.now())])
      // Don't flash the loader for a split second on a fast load.
      .then(() => wait(600 - performance.now()))
      .then(frame)
      .then(frame)
      .then(() => {
        if (!finished) tl.play();
      });

    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      tl.pause();
      utils.remove([...rise, ...after]);
      for (const n of [...rise, ...after]) {
        n.style.removeProperty("transform");
        n.style.removeProperty("opacity");
      }
      root.classList.remove("intro-on");
      setDone(true);
      off();
    }
    // Any intent to use the page jumps straight to it.
    const skip = () => finish();
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    events.forEach((e) => window.addEventListener(e, skip, { passive: true }));
    const off = () => events.forEach((e) => window.removeEventListener(e, skip));

    return () => {
      off();
      tl.revert();
    };
  }, []);

  if (done) return null;

  return (
    <div ref={ref} className="intro" aria-hidden="true">
      <div className="loader">
        <div className="loader__inner" />
        <div className="loader__orbit">
          <div className="loader__dot" />
          <div className="loader__dot" />
          <div className="loader__dot" />
          <div className="loader__dot" />
        </div>
      </div>
      <div className="intro__emblem">
      <svg className="intro__svg" viewBox="0 0 400 400">
        <defs>
          <path id="intro-legend" d={`M${C} ${C}m-146 0a146 146 0 1 1 292 0a146 146 0 1 1 -292 0`} />
        </defs>
        <circle className="intro__wave" cx={C} cy={C} r={168} />
        <g>
          <circle className="intro__ring" cx={C} cy={C} r={186} />
          <circle className="intro__ring intro__ring--fine" cx={C} cy={C} r={176} />
          <circle className="intro__ring intro__ring--fine" cx={C} cy={C} r={131} />
          <g className="intro__rosette">
            {ROSETTE.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          <text className="intro__legend">
            <textPath href="#intro-legend" textLength={TAU * 146 - 4} lengthAdjust="spacing">
              {[...LEGEND].map((ch, i) => (
                <tspan key={i}>{ch}</tspan>
              ))}
            </textPath>
          </text>
        </g>
      </svg>
      <p className="intro__mono">
        {["A", "S", "B"].map((ch) => (
          <span key={ch}>{ch}</span>
        ))}
      </p>
      </div>
    </div>
  );
}
