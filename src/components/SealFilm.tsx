"use client";

import { useEffect, useRef, useState } from "react";
import { notary } from "@/lib/site";

// Scroll-scrubbed film: the stamp comes down, presses, and lifts off the seal.
// The page scrolls natively; scroll position is eased toward and mapped onto
// the clip's timeline. Every frame of the clip is a keyframe, so seeks are
// frame-accurate and cheap.

const FRAMES = 240;
const FPS = 30;

type Beat = { el: HTMLElement; start: number; end: number; lines: HTMLElement[] };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function SealFilm() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [date, setDate] = useState<{ day: string; month: string; year: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    setDate({
      day: ordinal(now.getDate()),
      month: now.toLocaleString("en-US", { month: "long" }),
      year: String(now.getFullYear()),
    });
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;
    const root = document.documentElement;
    if (!root.classList.contains("motion")) return;

    const beats: Beat[] = [...section.querySelectorAll<HTMLElement>("[data-beat]")].map((el) => {
      const [start, end] = el.dataset.beat!.split(",").map(Number);
      return { el, start, end, lines: [...el.querySelectorAll<HTMLElement>(".line > span")] };
    });
    const signature = section.querySelector<HTMLElement>(".cert__signature");
    const cue = section.querySelector<HTMLElement>(".film__cue");
    const endPoster = section.querySelector<HTMLElement>(".film__poster--end");

    let top = 0, span = 1, target = 0, current = 0, last = performance.now();
    let raf = 0, visible = true, videoReady = false, duration = FRAMES / FPS;
    let pendingSeek: number | null = null;
    let variant = "";
    let objectUrl = "";
    let abort: AbortController | null = null;

    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

    const measure = () => {
      const r = section.getBoundingClientRect();
      top = r.top + window.scrollY;
      span = Math.max(1, section.offsetHeight - window.innerHeight);
      target = clamp01((window.scrollY - top) / span);
    };

    const seek = (t: number) => {
      if (!videoReady) return;
      if (video.seeking) { pendingSeek = t; return; }
      if (Math.abs(video.currentTime - t) > 0.5 / FPS) video.currentTime = t;
    };
    video.addEventListener("seeked", () => {
      if (pendingSeek !== null) { const t = pendingSeek; pendingSeek = null; seek(t); }
    });

    const paint = (p: number) => {
      for (const b of beats) {
        const fade = 0.05;
        const enter = b.start <= 0 ? 1 : smooth(b.start, b.start + fade, p);
        const exit = b.end >= 1 ? 0 : smooth(b.end - fade, b.end, p);
        b.el.style.opacity = String(Math.min(enter, 1 - exit));
        b.el.style.visibility = enter > 0 && exit < 1 ? "visible" : "hidden";
        b.lines.forEach((line, i) => {
          const e = b.start <= 0 ? 1 : smooth(b.start + i * 0.012, b.start + i * 0.012 + fade * 1.2, p);
          line.style.transform = `translate3d(0, ${((1 - e) * 105 - exit * 22).toFixed(2)}%, 0)`;
        });
      }
      if (signature) {
        const k = smooth(0.84, 0.96, p);
        signature.style.clipPath = `inset(-20% ${((1 - k) * 100).toFixed(2)}% -20% 0)`;
      }
      if (cue) cue.style.opacity = String(1 - smooth(0.0, 0.04, p));
      if (!videoReady && endPoster) endPoster.style.opacity = String(smooth(0.55, 0.75, p));
      seek(p * (duration - 1 / FPS));
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      current += (target - current) * (1 - Math.exp(-dt / 0.085));
      if (Math.abs(target - current) < 0.0004) current = target;
      paint(current);
      raf = current !== target && visible ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };

    const onScroll = () => {
      target = clamp01((window.scrollY - top) / span);
      wake();
    };

    const load = () => {
      const want = window.innerWidth / window.innerHeight < 0.9 ? "tall" : "wide";
      if (want === variant || saveData) return;
      variant = want;
      section.dataset.variant = want;
      abort?.abort();
      abort = new AbortController();
      videoReady = false;
      section.classList.remove("film--ready");
      // Fetch the whole clip first so seeks never wait on range requests.
      fetch(`/media/seal-${want}.mp4`, { signal: abort.signal })
        .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
        .then((blob) => {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(blob);
          video.src = objectUrl;
          video.load();
        })
        .catch(() => {});
    };

    video.addEventListener("loadeddata", () => {
      duration = video.duration || duration;
      videoReady = true;
      // iOS only paints seeks after the element has played once.
      video.play().then(() => video.pause()).catch(() => {}).finally(() => {
        video.currentTime = current * (duration - 1 / FPS);
        section.classList.add("film--ready");
      });
    });

    let resizeTimer = 0;
    const onResize = () => {
      measure();
      paint(current);
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(load, 250);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });
    io.observe(section);

    measure();
    current = target;
    paint(current);
    load();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => { measure(); wake(); });
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      abort?.abort();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <section ref={sectionRef} className="film" aria-label="Introduction" data-theme="film">
      <div className="film__stage">
        <picture className="film__poster film__poster--start">
          <source media="(max-aspect-ratio: 9/10)" srcSet="/media/seal-tall-0000.webp" />
          <img src="/media/seal-wide-0000.webp" alt="" fetchPriority="high" />
        </picture>
        <picture className="film__poster film__poster--end">
          <source media="(max-aspect-ratio: 9/10)" srcSet="/media/seal-tall-0239.webp" />
          <img src="/media/seal-wide-0239.webp" alt="" />
        </picture>
        <video ref={videoRef} className="film__video" muted playsInline preload="none" aria-hidden="true" tabIndex={-1} />
        <div className="film__scrim" />

        <div className="film__copy">
          <div className="beat beat--intro" data-beat="0,0.17">
            <p className="beat__kicker line"><span>Notary public in Brooklyn</span></p>
            <h1 className="beat__name">
              <span className="line"><span>Ann Sharon</span></span>
              <span className="line"><span>Bacchus</span></span>
            </h1>
            <p className="beat__lede line">
              <span>Professional notary services you can trust. Convenient, reliable, professional.</span>
            </p>
            <div className="beat__actions">
              <a className="button button--light" href={notary.phoneHref}>Call {notary.phone}</a>
              <a className="button button--ghost" href={notary.smsHref}>Send a text</a>
            </div>
          </div>

          <div className="beat beat--list film-only" data-beat="0.21,0.43">
            <p className="beat__big">
              <span className="line"><span>Important documents</span></span>
              <span className="line"><span>often come with important</span></span>
              <span className="line"><span>moments in life.</span></span>
            </p>
          </div>

          <div className="beat beat--witness film-only" data-beat="0.47,0.68">
            <p className="beat__big">
              <span className="line"><span>Simple, professional</span></span>
              <span className="line"><span>and stress-free.</span></span>
            </p>
            <p className="beat__small line"><span>Every client treated with respect, confidentiality and attention to detail.</span></p>
          </div>

          <div className="beat beat--cert" data-beat="0.74,1">
            <p className="cert__line">
              <span className="line"><span>Sworn to before me this</span></span>
              <span className="line">
                <span>
                  {date ? (
                    <>
                      <em>{date.day}</em> day of <em>{date.month}</em>, <em>{date.year}</em>.
                    </>
                  ) : (
                    <>______ day of ____________, 20____.</>
                  )}
                </span>
              </span>
            </p>
            <div className="cert__sign">
              <span className="cert__signature" aria-hidden="true">Ann Sharon Bacchus</span>
              <span className="cert__rule" />
              <span className="cert__office">Ann Sharon Bacchus, Notary Public</span>
            </div>
          </div>
        </div>

        <div className="film__cue" aria-hidden="true">
          <span>Scroll</span>
          <i />
        </div>
      </div>
    </section>
  );
}
