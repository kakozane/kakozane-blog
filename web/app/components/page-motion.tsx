import { useEffect } from "react";
import { useLocation } from "react-router";

// Content stays visible without JS or IntersectionObserver; animate only on entry.
export function PageMotion() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !window.IntersectionObserver) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        animations.push(entry.target.animate([{ opacity: .45, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" }));
      }
    }, { threshold: .08 });
    document.querySelectorAll(".home-content > *, .home-yearline, .note-paper, .thinking-entry, .friends-list > a, .projects-list > a, .say-card").forEach((element) => observer.observe(element));
    return () => { observer.disconnect(); animations.forEach((animation) => animation.cancel()); };
  }, [pathname]);
  return null;
}
