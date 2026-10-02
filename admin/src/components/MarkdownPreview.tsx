import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { remarkAlert } from 'remark-github-blockquote-alert'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

import { markdownOptions } from '../lib/markdown-options'
import { mermaidSVGWidth } from '../lib/mermaid-svg'

function PreviewCodeBlock({ children }: { children: ReactNode }) {
  const code = Children.toArray(children)[0]
  const isMermaid = isValidElement<{ className?: string }>(code) && /\blanguage-mermaid\b/i.test(code.props.className ?? '')
  const preRef = useRef<HTMLPreElement>(null)
  const id = `admin-mermaid-${useId().replace(/:/g, '')}`
  const [svg, setSVG] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isMermaid) return
    const source = preRef.current?.textContent?.trim()
    if (!source) return
    let cancelled = false
    setSVG('')
    setError(false)
    void import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true,
        theme: 'base', look: 'classic',
        themeVariables: {
          background: '#ffffff', primaryColor: '#f5f5f7', primaryTextColor: '#1d1d1f',
          primaryBorderColor: '#0066cc', secondaryColor: '#e8e8ed', tertiaryColor: '#ffffff',
          lineColor: '#6e6e73', fontFamily: '-apple-system, BlinkMacSystemFont, PingFang SC, system-ui',
        },
      })
      return mermaid.render(id, source)
    }).then(({ svg: result }) => { if (!cancelled) setSVG(result) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [children, id, isMermaid])

  if (!isMermaid) return <pre>{children}</pre>
  const width = mermaidSVGWidth(svg)
  return <div className="preview-mermaid">
    <span className="preview-mermaid-label">MERMAID</span>
    {svg && <img alt="Mermaid 图表，源码可在下方展开" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} style={width ? { width } : undefined} />}
    <pre hidden={Boolean(svg)} ref={preRef}>{children}</pre>
    {svg && <details><summary>查看源码</summary><pre>{children}</pre></details>}
    {error && <p role="status">图表语法有误，已显示源码。</p>}
  </div>
}

export default function MarkdownPreview({ value }: { value: string }) {
  return <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
    remarkRehypeOptions={markdownOptions}
    rehypePlugins={[rehypeKatex, rehypeHighlight]}
    components={{ pre: ({ children }) => <PreviewCodeBlock>{children}</PreviewCodeBlock> }}
  >{value || '暂无内容'}</ReactMarkdown>
}
