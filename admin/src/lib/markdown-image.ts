export function insertMarkdownImage(source: string, start: number, end: number, url: string, filename: string) {
  const from = Math.max(0, Math.min(start, source.length))
  const to = Math.max(from, Math.min(end, source.length))
  const left = source.slice(0, from)
  const right = source.slice(to)
  const alt = (source.slice(from, to).trim() || filename.replace(/\.[^.]+$/, '')).replace(/[\\\r\n]/g, ' ').replaceAll('[', ' ').replaceAll(']', ' ').trim() || '图片'
  const image = `![${alt}](${url})`
  const before = left ? left.endsWith('\n\n') ? '' : left.endsWith('\n') ? '\n' : '\n\n' : ''
  const after = right ? right.startsWith('\n\n') ? '' : right.startsWith('\n') ? '\n' : '\n\n' : ''
  return { value: left + before + image + after + right, cursor: left.length + before.length + image.length }
}
