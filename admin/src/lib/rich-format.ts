import type { JSONContent } from '@tiptap/core'
export { RICH_HTML_PREFIX, isRichHTML } from './rich-html.ts'
// Markdown has no lossless representation for these official template controls.
export function hasRichFormatting(node: JSONContent): boolean {
  return Boolean((node.attrs?.textAlign && node.attrs.textAlign !== 'left') ||
    node.marks?.some((mark) => ['underline', 'highlight', 'subscript', 'superscript'].includes(mark.type)) ||
    node.content?.some(hasRichFormatting))
}
