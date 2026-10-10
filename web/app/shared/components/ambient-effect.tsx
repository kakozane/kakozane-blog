import { useEffect, useState, type CSSProperties } from "react";

export function AmbientEffect() {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    try { setEnabled(localStorage.getItem("blog-ambient") !== "off"); } catch { /* 使用默认开启状态。 */ }
  }, []);
  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem("blog-ambient", next ? "on" : "off"); } catch { /* 当前页面仍可切换。 */ }
  }
  return <>
    <button aria-pressed={enabled} className="ambient-toggle" onClick={toggle} type="button">背景动效 · {enabled ? "开" : "关"}</button>
    {enabled && <span aria-hidden="true" className="ambient-field">{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ left: `${(i * 31 + 7) % 100}%`, top: `${(i * 47 + 3) % 100}%`, "--delay": `${-i * 2}s` } as CSSProperties}>✦</span>)}</span>}
  </>;
}
