import { useState } from 'react'
import { Alert, Button, Input } from 'antd'
import { SimpleEditor } from './tiptap-templates/simple/simple-editor'
import { needsSource } from '../lib/rich-text'
import { isRichHTML } from '../lib/rich-format'
import 'katex/dist/katex.min.css'

type Props = { value?: string; onChange?: (value: string) => void; onUploadingChange: (value: boolean) => void; id?: string }
export default function RichTextEditor({ value = '', onChange, onUploadingChange, id }: Props) {
  const [sourceMode, setSourceMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const protectedSource = !isRichHTML(value) && needsSource(value)
  const source = sourceMode || protectedSource
  return <div id={id} className="blog-simple-editor">
    <div className="editor-source-toggle"><Button size="small" htmlType="button" disabled={protectedSource || uploading} onClick={() => setSourceMode(!sourceMode)}>{source ? '可视化编辑' : '查看源码'}</Button></div>
    {protectedSource && <Alert type="info" showIcon message="此文含脚注或原始 HTML，源码模式会完整保留其内容。" />}
    {source ? <Input.TextArea aria-label="正文源码" rows={18} value={value} onChange={(event) => onChange?.(event.target.value)} /> :
      <SimpleEditor value={value} onChange={onChange} onUploadingChange={(active) => { setUploading(active); onUploadingChange(active) }} />}
    <div className="rich-editor-status">{uploading ? '图片上传中…' : 'Tiptap Simple Editor · 本地草稿自动备份'}</div>
  </div>
}
