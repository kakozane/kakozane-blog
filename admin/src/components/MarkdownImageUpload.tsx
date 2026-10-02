import { Button, message } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { useRef, type ChangeEvent, type RefObject } from 'react'

import { uploadMedia } from '../api/media'
import { insertMarkdownImage } from '../lib/markdown-image'

type MarkdownForm = { getFieldValue: (name: 'contentMd') => unknown; setFieldValue: (name: 'contentMd', value: string) => void }

export default function MarkdownImageUpload({ form, editorRef, onDirty, uploading, onUploadingChange }: { form: MarkdownForm; editorRef: RefObject<TextAreaRef | null>; onDirty: () => void; uploading: boolean; onUploadingChange: (value: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const selection = useRef({ source: '', start: 0, end: 0 })

  function pickImage() {
    const source = String(form.getFieldValue('contentMd') ?? '')
    const textarea = editorRef.current?.resizableTextArea?.textArea
    selection.current = { source, start: textarea?.selectionStart ?? source.length, end: textarea?.selectionEnd ?? source.length }
    inputRef.current?.click()
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    onUploadingChange(true)
    try {
      const media = await uploadMedia(file)
      const current = String(form.getFieldValue('contentMd') ?? '')
      const position = current === selection.current.source ? selection.current : { start: current.length, end: current.length }
      const result = insertMarkdownImage(current, position.start, position.end, media.url, file.name)
      form.setFieldValue('contentMd', result.value)
      onDirty()
      requestAnimationFrame(() => {
        editorRef.current?.focus()
        editorRef.current?.resizableTextArea?.textArea?.setSelectionRange(result.cursor, result.cursor)
      })
      message.success('图片已插入正文')
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '图片上传失败')
    } finally { onUploadingChange(false) }
  }

  return <div className="markdown-image-upload">
    <input accept="image/jpeg,image/png,image/gif,image/webp" aria-label="选择正文图片" hidden onChange={(event) => void upload(event)} ref={inputRef} type="file" />
    <Button htmlType="button" loading={uploading} onClick={pickImage}>上传并插入图片</Button>
    <span>支持 JPEG、PNG、GIF、WebP，最大 5 MB。</span>
  </div>
}
