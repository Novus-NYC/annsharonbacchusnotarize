"use client";

import { useEffect, useRef } from "react";
import { places, notary } from "@/lib/site";

// The places Ann travels to, joined by a route that draws itself as the list
// passes the middle of the screen.
export default function Route() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list || !document.documentElement.classList.contains("motion")) return;
    const fill = list.querySelector<HTMLElement>(".route__fill")!;
    const dot = list.querySelector<HTMLElement>(".route__dot")!;
    const rail = list.querySelector<HTMLElement>(".route__rail")!;
    const stops = [...list.querySelectorAll<HTMLElement>(".route__stop")];
    list.classList.add("route--live");

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = list.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.62 - r.top) / r.height));
      const along = p * rail.offsetHeight;
      fill.style.transform = `scaleY(${p})`;
      dot.style.transform = `translate3d(-50%, ${along.toFixed(1)}px, 0)`;
      stops.forEach((s) => s.classList.toggle("is-reached", s.offsetTop <= rail.offsetTop + along + 8));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="route" ref={ref}>
      <div className="route__rail" aria-hidden="true">
        <span className="route__fill" />
        <span className="route__dot" />
      </div>
      <ol className="route__stops">
      {places.map((p) => (
        <li className="route__stop" key={p}>
          <span className="route__name">{p}</span>
        </li>
      ))}
      <li className="route__stop route__stop--office">
        <span className="route__note">Or visit my office</span>
        <span className="route__name">
          {notary.street}, {notary.locality}
        </span>
        <a className="route__link" href={notary.mapsHref} target="_blank" rel="noreferrer">
          Get directions
        </a>
      </li>
      </ol>
    </div>
  );
}
