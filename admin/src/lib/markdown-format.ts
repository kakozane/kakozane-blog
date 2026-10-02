export const formats = {
  heading: ['标题', '## ', '', '标题'],
  bold: ['加粗', '**', '**', '粗体文字'],
  italic: ['斜体', '*', '*', '斜体文字'],
  strike: ['删除线', '~~', '~~', '删除文字'],
  quote: ['引用', '> ', '', '引用内容'],
  bullet: ['无序列表', '- ', '', '列表项'],
  ordered: ['有序列表', '1. ', '', '列表项'],
  task: ['任务列表', '- [ ] ', '', '待办事项'],
  link: ['链接', '[', '](https://example.com)', '链接文字'],
  inline: ['行内代码', '`', '`', 'code'],
  code: ['代码块', '```text\n', '\n```', '代码'],
  table: ['表格', '', '', '| 标题 | 标题 |\n| --- | --- |\n| 内容 | 内容 |'],
  formula: ['公式', '$$\n', '\n$$', 'E = mc^2'],
  mermaid: ['流程图', '```mermaid\n', '\n```', 'flowchart LR\n  A[开始] --> B[结束]'],
  divider: ['分隔线', '', '', '---'],
} as const
export type MarkdownFormat = keyof typeof formats

export function formatMarkdown(source: string, start: number, end: number, action: MarkdownFormat) {
  start = Math.max(0, Math.min(start, source.length))
  end = Math.max(start, Math.min(end, source.length))
  const [, prefix, suffix, placeholder] = formats[action]
  const lines = ['heading', 'quote', 'bullet', 'ordered', 'task'].includes(action)
  if (lines) {
    start = start === 0 ? 0 : source.lastIndexOf('\n', start - 1) + 1
    const lineEnd = source.indexOf('\n', end > start && source[end - 1] === '\n' ? end - 1 : end)
    end = lineEnd === -1 ? source.length : lineEnd
  }
  const selected = source.slice(start, end) || placeholder
  const body = lines ? selected.split('\n').map((line) => prefix + line).join('\n') : prefix + selected + suffix
  const block = lines || ['code', 'table', 'formula', 'mermaid', 'divider'].includes(action)
  const before = block && start > 0 && !source.slice(0, start).endsWith('\n\n') ? (source[start - 1] === '\n' ? '\n' : '\n\n') : ''
  const after = block && end < source.length && !source.slice(end).startsWith('\n\n') ? (source[end] === '\n' ? '\n' : '\n\n') : ''
  const selectionStart = start + before.length + (lines ? 0 : prefix.length)
  return { value: source.slice(0, start) + before + body + after + source.slice(end), selectionStart, selectionEnd: selectionStart + (lines ? body.length : selected.length) }
}
