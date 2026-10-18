"use client";

import { useEffect, useRef } from "react";

// Adds `is-inview` once the element is well onto the screen. Styles keyed on
// it only apply under `.motion`, so without JS the end state is what shows.
export default function InView({
  as: Tag = "div",
  className,
  children,
}: {
  as?: "div" | "ul" | "ol";
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("is-inview");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -25% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as React.Ref<never>} className={className}>
      {children}
    </Tag>
  );
}
