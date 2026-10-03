import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import Mathematics from '@tiptap/extension-mathematics'

// Footnotes and raw HTML are not supported by Tiptap's Markdown schema.
// Preserve them verbatim in source mode rather than dropping content on save.
export const needsSource = (text: string) => /\[\^[^\]]+\]|^\s*<\/?[a-z][^>]*>/im.test(text)
export const restoreAlerts = (text: string) => text.replace(/^(>\s*)\\\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\\?\]/gm, '$1[!$2]')

export const richTextExtensions = [StarterKit.configure({ underline: false, link: { openOnClick: false } }), Markdown, Image, TableKit, TaskList, TaskItem.configure({ nested: true }), Mathematics]
