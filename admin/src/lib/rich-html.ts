import type { Root, Element } from 'hast'
import { defaultSchema } from 'rehype-sanitize'

export const RICH_HTML_PREFIX = '<!-- tiptap-rich-html -->\n'
export const isRichHTML = (source: string) => source.startsWith(RICH_HTML_PREFIX)
const colors = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red']
// Convert only known formatting into classes before the sanitizer strips all styles.
export function richHTMLFormatting() {
  return (tree: Root) => {
    function visit(node: Root | Element) {
      if (node.type === 'element') {
        const props = node.properties
        const classes: string[] = []
        const align = String(props.style ?? '').match(/(?:^|;)\s*text-align:\s*(left|center|right|justify)\s*(?:;|$)/)?.[1]
        if (align) classes.push(`rich-align-${align}`)
        if (node.tagName === 'mark') {
          const color = String(props.dataColor ?? '').match(/^var\(--tt-color-highlight-([a-z]+)\)$/)?.[1]
          if (color && colors.includes(color)) classes.push(`rich-highlight-${color}`)
        }
        if (classes.length) props.className = [...(Array.isArray(props.className) ? props.className : []), ...classes]
        if (['block-math', 'inline-math'].includes(String(props.dataType)) && typeof props.dataLatex === 'string') {
          node.tagName = props.dataType === 'block-math' ? 'div' : 'span'
          node.properties = { className: [props.dataType === 'block-math' ? 'math-display' : 'math-inline'] }
          node.children = [{ type: 'text', value: props.dataLatex }]
        }
      }
      for (const child of node.children) if (child.type === 'element') visit(child)
    }
    visit(tree)
    // Tiptap outputs block images directly; keep the existing paragraph image/lightbox renderer.
    tree.children = tree.children.map((node) => node.type === 'element' && node.tagName === 'img'
      ? { type: 'element', tagName: 'p', properties: {}, children: [node] } : node)
  }
}
export const richHTMLSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u', 'mark', 'sub', 'sup'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), ['className', /^rich-align-(left|center|right|justify)$/, /^rich-highlight-(gray|brown|orange|yellow|green|blue|purple|pink|red)$/, 'math-inline', 'math-display']],
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-[\w-]+$/]],
    li: [...(defaultSchema.attributes?.li ?? []), ['dataType', 'taskItem'], 'dataChecked'],
    ul: [...(defaultSchema.attributes?.ul ?? []), ['dataType', 'taskList']],
    input: [['type', 'checkbox'], 'checked', 'disabled'],
  },
}
