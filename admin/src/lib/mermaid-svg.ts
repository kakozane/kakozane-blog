export function mermaidSVGWidth(svg: string) {
  const width = Number(svg.match(/\bviewBox="([^"]+)"/)?.[1].trim().split(/\s+/)[2])
  return Number.isFinite(width) && width > 0 ? width : undefined
}
