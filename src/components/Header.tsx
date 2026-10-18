"use client";

import { useEffect, useState } from "react";
import { notary } from "@/lib/site";

// The header sits over both dark and paper sections; it reads the theme of
// whatever section is passing beneath it.
export default function Header() {
  const [theme, setTheme] = useState("film");

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("[data-theme]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setTheme((e.target as HTMLElement).dataset.theme || "light");
        }
      },
      { rootMargin: "-28px 0px -96% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <header className={`header header--${theme}`}>
      <a className="header__mark" href="#top">
        <span className="header__name">{notary.name}</span>{" "}
        <span className="header__role">{notary.title}</span>
      </a>
      <nav className="header__nav" aria-label="Sections">
        <a href="#services">Services</a>
        <a href="#mobile">I come to you</a>
        <a href="#about">About</a>
        <a href="#real-estate">Real estate</a>
      </nav>
      <a className="header__call" href={notary.phoneHref}>
        <span className="header__call-label">Call or text</span> {notary.phone}
      </a>
    </header>
  );
}
