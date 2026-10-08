// Standard Markdown accepts embedded HTML, preserving formats without a lossy conversion.
export function exportMarkdown(content: string): string { return content }
export function importMarkdown(content: string): string {
  const text = content.replace(/^\uFEFF/, '')
  if (new TextEncoder().encode(text).length > 1024 * 1024) throw new Error('正文不能超过 1 MB')
  return text
}
export function downloadMarkdown(title: string, content: string) {
  const url = URL.createObjectURL(new Blob([exportMarkdown(content)], { type: 'text/markdown;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = (title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100) || 'article') + '.md'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
