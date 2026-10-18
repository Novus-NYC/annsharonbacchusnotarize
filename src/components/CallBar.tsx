"use client";

import { useEffect, useState } from "react";
import { notary } from "@/lib/site";

// Small-screen shortcut to call or text, shown once the intro has scrolled
// away and hidden again when the contact section is on screen.
export default function CallBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const film = document.querySelector(".film");
    const contact = document.querySelector("#contact");
    let pastFilm = false, atContact = false;
    const update = () => setShow(pastFilm && !atContact);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === film) pastFilm = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === contact) atContact = e.isIntersecting;
      }
      update();
    });
    if (film) io.observe(film);
    if (contact) io.observe(contact);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`callbar ${show ? "callbar--show" : ""}`} aria-hidden={!show}>
      <a href={notary.phoneHref} tabIndex={show ? 0 : -1}>Call</a>
      <a href={notary.smsHref} tabIndex={show ? 0 : -1}>Text</a>
    </div>
  );
}
