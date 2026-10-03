import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from "react";

import { mermaidSVGWidth } from "../lib/mermaid-svg";

function prefersDark() {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function CodeBlock({ children }: { children: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copyStatus, setCopyStatus] = useState("复制代码");
  const code = Children.toArray(children)[0];
  const className = isValidElement<{ className?: string }>(code) ? code.props.className : "";
  const language = className?.match(/\blanguage-([\w#+-]+)/)?.[1];
  const isMermaid = language?.toLowerCase() === "mermaid";
  const id = `blog-mermaid-${useId().replace(/:/g, "")}`;
  const [dark, setDark] = useState(() => typeof window !== "undefined" && prefersDark());
  const [diagram, setDiagram] = useState("");
  const [diagramError, setDiagramError] = useState(false);
  const diagramWidth = mermaidSVGWidth(diagram);

  useEffect(() => {
    if (!isMermaid) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(prefersDark());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    media.addEventListener("change", update);
    return () => { observer.disconnect(); media.removeEventListener("change", update); };
  }, [isMermaid]);

  useEffect(() => {
    if (!isMermaid) return;
    const source = preRef.current?.textContent?.trim();
    if (!source) return;
    let cancelled = false;
    setDiagram("");
    setDiagramError(false);
    void import("mermaid").then(async ({ default: mermaid }) => {
      const style = getComputedStyle(document.documentElement);
      const token = (name: string) => style.getPropertyValue(name).trim();
      mermaid.initialize({
        startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true,
        theme: "base", look: "classic",
        themeVariables: {
          darkMode: dark,
          background: token("--color-paper"),
          primaryColor: token("--color-neutral-2"),
          primaryTextColor: token("--color-neutral-9"),
          primaryBorderColor: token("--color-accent"),
          secondaryColor: token("--color-neutral-3"),
          tertiaryColor: token("--color-paper"),
          lineColor: token("--color-neutral-7"),
          fontFamily: token("--font-sans"),
        },
      });
      return mermaid.render(id, source);
    }).then(({ svg }) => { if (!cancelled) setDiagram(svg); })
      .catch(() => { if (!cancelled) setDiagramError(true); });
    return () => { cancelled = true; };
  }, [children, dark, id, isMermaid]);

  async function copy() {
    const code = preRef.current?.querySelector("code")?.textContent;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("已复制");
    } catch {
      setCopyStatus("复制失败");
    }
  }

  return <div className={`code-block${isMermaid ? " mermaid-block" : ""}`}>
    {language && <span className="code-language">{language.toUpperCase()}</span>}
    <button aria-live="polite" className="code-copy" onClick={() => void copy()} type="button">{isMermaid && copyStatus === "复制代码" ? "复制源码" : copyStatus}</button>
    {isMermaid && diagram && <img alt="Mermaid 图表，源码可在下方展开" className="mermaid-image" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(diagram)}`} style={diagramWidth ? { width: diagramWidth } : undefined} />}
    <pre hidden={Boolean(isMermaid && diagram)} ref={preRef}>{children}</pre>
    {isMermaid && diagram && <details className="mermaid-source"><summary>查看源码</summary><pre>{children}</pre></details>}
    {isMermaid && diagramError && <p className="mermaid-error" role="status">图表无法渲染，已显示源码，请检查 Mermaid 语法。</p>}
  </div>;
}
