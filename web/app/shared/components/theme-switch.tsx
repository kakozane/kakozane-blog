import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const themes: Theme[] = ["system", "light", "dark"];
const names: Record<Theme, string> = { system: "自动", light: "浅色", dark: "深色" };

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("blog-theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch { /* 存储被禁用时仍可切换当前页面主题。 */ }
  }, []);

  function cycleTheme() {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem("blog-theme", next); } catch { /* 存储被禁用时仍可切换当前页面主题。 */ }
  }

  return <button
    aria-label={`外观：${names[theme]}，点击切换`}
    className="theme-switch"
    onClick={cycleTheme}
    title={`外观：${names[theme]}`}
    type="button"
  ><span aria-hidden="true" className="theme-switch-icon">◐</span><span>{names[theme]}</span></button>;
}
