import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Post } from "../types/article";
import type { ArticleHeading } from "../../../shared/markdown/article-headings";
import { progressThroughArticle, savedReadingProgress, savedReadingSize, scrollYForProgress } from "../lib/reading";

export function useArticleReading(post: Post, headings: ArticleHeading[], bodyRef: RefObject<HTMLDivElement | null>) {
  const [activeHeading, setActiveHeading] = useState("");
  const [readingProgress, setReadingProgress] = useState(0);
  const [resumeProgress, setResumeProgress] = useState<number | null>(null);
  const savedBucket = useRef<number | null>(null);
  const completedReading = useRef(false);
  const readingKey = `blog-reading:${post.kind}:${post.id}`;
  const [readingFont, setReadingFont] = useState<"sans" | "serif">(post.kind === "note" ? "serif" : "sans");
  const [readingSize, setReadingSize] = useState<0 | 1 | 2>(0);
  const [focusPostID, setFocusPostID] = useState<number | null>(null);
  const focusReading = focusPostID === post.id;
  useEffect(() => {
    try {
      const savedFont = window.localStorage.getItem("blog-reading-font");
      setReadingFont(savedFont === "sans" || savedFont === "serif" ? savedFont : post.kind === "note" ? "serif" : "sans");
      setReadingSize(savedReadingSize(window.localStorage.getItem("blog-reading-size")));
    } catch { /* 无法使用本地存储时仍可在当前页面切换。 */ }
  }, [post.kind]);

  useEffect(() => {
    savedBucket.current = null;
    completedReading.current = false;
    if (post.kind === "thought") { setResumeProgress(null); return; }
    try { setResumeProgress(savedReadingProgress(window.localStorage.getItem(readingKey), post.updatedAt)); }
    catch { setResumeProgress(null); }
  }, [post.kind, post.updatedAt, readingKey]);

  function resumeReading() {
    const article = bodyRef.current;
    if (!article || resumeProgress === null) return;
    const top = article.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: scrollYForProgress(resumeProgress, top, article.offsetHeight, window.innerHeight), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setResumeProgress(null);
  }

  function chooseReadingFont(font: "sans" | "serif") {
    setReadingFont(font);
    try { window.localStorage.setItem("blog-reading-font", font); } catch { /* 无法使用本地存储时仍可在当前页面切换。 */ }
  }

  function changeReadingSize(next: 0 | 1 | 2) {
    setReadingSize(next);
    try { window.localStorage.setItem("blog-reading-size", String(next)); } catch { /* 无法使用本地存储时仍可在当前页面切换。 */ }
  }

  const toggleFocusReading = useCallback(() => {
    const before = bodyRef.current?.getBoundingClientRect().top;
    setFocusPostID((current) => current === post.id ? null : post.id);
    if (before !== undefined) requestAnimationFrame(() => {
      const after = bodyRef.current?.getBoundingClientRect().top;
      if (after !== undefined) window.scrollBy(0, after - before);
    });
  }, [post.id]);

  useEffect(() => {
    if (!focusReading) return;
    function exitOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector(".image-lightbox[open]")) toggleFocusReading();
    }
    window.addEventListener("keydown", exitOnEscape);
    return () => window.removeEventListener("keydown", exitOnEscape);
  }, [focusReading, toggleFocusReading]);

  useEffect(() => {
    const article = bodyRef.current;
    if (!article) return;
    const elements = headings.map(({ id }) => document.getElementById(id)).filter((heading): heading is HTMLHeadingElement => heading instanceof HTMLHeadingElement);

    function updateReadingState() {
      if (!article) return;
      const start = article.getBoundingClientRect().top + window.scrollY;
      const progress = progressThroughArticle(window.scrollY, start, article.offsetHeight, window.innerHeight);
      setReadingProgress(progress);
      if (post.kind !== "thought" && article.offsetHeight > window.innerHeight && progress >= 5) {
        setResumeProgress(null);
        if (progress >= 95) completedReading.current = true;
        const bucket = completedReading.current ? 100 : Math.floor(progress / 5) * 5;
        if (savedBucket.current !== bucket) {
          try {
            if (completedReading.current) window.localStorage.removeItem(readingKey);
            else window.localStorage.setItem(readingKey, JSON.stringify({ updatedAt: post.updatedAt, progress }));
            savedBucket.current = bucket;
          } catch { /* 浏览器禁用本地存储时仅显示当前进度。 */ }
        }
      }
      // ponytail: scan headings on scroll; use IntersectionObserver if very long articles make this slow.
      const current = elements.filter((heading) => heading.getBoundingClientRect().top <= 120).at(-1);
      setActiveHeading(current?.id ?? "");
    }
    updateReadingState();
    window.addEventListener("scroll", updateReadingState, { passive: true });
    window.addEventListener("resize", updateReadingState);
    return () => {
      window.removeEventListener("scroll", updateReadingState);
      window.removeEventListener("resize", updateReadingState);
    };
  }, [headings, readingFont, readingSize, focusReading, post.kind, post.updatedAt, readingKey]);

  return { activeHeading, readingProgress, resumeProgress, readingFont, readingSize, focusReading, resumeReading, chooseReadingFont, changeReadingSize, toggleFocusReading };
}
