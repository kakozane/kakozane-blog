import { Button, Space } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import type { RefObject } from 'react'
import { formats, formatMarkdown, type MarkdownFormat } from '../lib/markdown-format'

type Props = {
  editorRef: RefObject<TextAreaRef | null>
  form: { getFieldValue: (name: 'contentMd') => unknown; setFieldValue: (name: 'contentMd', value: string) => void }
  onDirty: () => void
}

export default function MarkdownToolbar({ editorRef, form, onDirty }: Props) {
  function apply(action: MarkdownFormat) {
    const source = String(form.getFieldValue('contentMd') ?? '')
    const textarea = editorRef.current?.resizableTextArea?.textArea
    const result = formatMarkdown(source, textarea?.selectionStart ?? source.length, textarea?.selectionEnd ?? source.length, action)
    form.setFieldValue('contentMd', result.value)
    onDirty()
    requestAnimationFrame(() => {
      editorRef.current?.focus()
      editorRef.current?.resizableTextArea?.textArea?.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }
  return <div className="markdown-toolbar" role="group" aria-label="Markdown 格式工具栏">
    <Space size={4} wrap>{(Object.keys(formats) as MarkdownFormat[]).map((action) =>
      <Button key={action} size="small" htmlType="button" onMouseDown={(event) => event.preventDefault()} onClick={() => apply(action)}>{formats[action][0]}</Button>,
    )}</Space>
  </div>
}
