import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Input, Modal, Select, Space, message } from 'antd'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { richTextExtensions, needsSource, restoreAlerts } from '../lib/rich-text'
import { uploadMedia } from '../api/media'
import 'katex/dist/katex.min.css'

type Props = { value?: string; onChange?: (value: string) => void; onUploadingChange: (value: boolean) => void; id?: string }
export default function RichTextEditor({ value = '', onChange, onUploadingChange, id }: Props) {
  const [sourceMode, setSourceMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [prompt, setPrompt] = useState<'link' | 'math' | null>(null)
  const [input, setInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const latest = useRef(value)
  const source = sourceMode || needsSource(value)
  const editor = useEditor({
    extensions: richTextExtensions,
    content: value, contentType: 'markdown',
    editorProps: { attributes: { class: 'rich-editor-content', role: 'textbox', 'aria-label': '正文富文本编辑器', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: current }) => { const next = restoreAlerts(current.getMarkdown()); latest.current = next; onChange?.(next) },
  })
  useEditorState({ editor, selector: ({ editor: current }) => current?.state })
  useEffect(() => {
    if (editor && value !== latest.current) {
      latest.current = value
      editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
    }
  }, [editor, value])
  if (!editor) return null
  const button = (label: string, run: () => void, active = false, disabled = false) => <Button key={label} size="small" htmlType="button" type={active ? 'primary' : 'default'} aria-pressed={active} disabled={disabled || source || uploading} onMouseDown={(e) => e.preventDefault()} onClick={run}>{label}</Button>
  async function upload(file: File) {
    if (!editor) return
    setUploading(true); onUploadingChange(true)
    try { const media = await uploadMedia(file); editor.chain().focus().setImage({ src: media.url, alt: file.name }).run() }
    catch (error) { message.error(error instanceof Error ? error.message : '图片上传失败') }
    finally { setUploading(false); onUploadingChange(false) }
  }
  function applyPrompt() {
    if (!editor) return
    if (prompt === 'link') {
      const url = input.trim()
      if (url && !/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(url)) { message.error('请输入 HTTP(S)、邮件或站内地址'); return }
      if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      else editor.chain().focus().unsetLink().run()
    } else if (input.trim()) {
      editor.chain().focus().insertBlockMath({ latex: input.trim() }).run()
    }
    setPrompt(null)
  }
  return <div className="rich-editor" id={id}>
    <div className="rich-editor-toolbar" role="group" aria-label="富文本格式工具栏">
      <Space size={4} wrap>
        <Select size="small" aria-label="段落样式" disabled={source || uploading} value={editor.isActive('heading', { level: 2 }) ? 2 : editor.isActive('heading', { level: 3 }) ? 3 : 0} options={[{ value: 0, label: '正文' }, { value: 2, label: '二级标题' }, { value: 3, label: '三级标题' }]} onChange={(level: number) => { if (level === 2 || level === 3) editor.chain().focus().toggleHeading({ level }).run(); else editor.chain().focus().setParagraph().run() }} />
        {button('加粗', () => { editor.chain().focus().toggleBold().run() }, editor.isActive('bold'))}
        {button('斜体', () => { editor.chain().focus().toggleItalic().run() }, editor.isActive('italic'))}
        {button('删除线', () => { editor.chain().focus().toggleStrike().run() }, editor.isActive('strike'))}
        {button('引用', () => { editor.chain().focus().toggleBlockquote().run() }, editor.isActive('blockquote'))}
        {button('无序列表', () => { editor.chain().focus().toggleBulletList().run() }, editor.isActive('bulletList'))}
        {button('有序列表', () => { editor.chain().focus().toggleOrderedList().run() }, editor.isActive('orderedList'))}
        {button('任务', () => { editor.chain().focus().toggleTaskList().run() }, editor.isActive('taskList'))}
        {button('链接', () => { setInput(String(editor.getAttributes('link').href ?? '')); setPrompt('link') }, editor.isActive('link'))}
        {button('行内代码', () => { editor.chain().focus().toggleCode().run() }, editor.isActive('code'))}
        {button('代码块', () => { editor.chain().focus().toggleCodeBlock().run() }, editor.isActive('codeBlock'))}
        {button('表格', () => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() })}
        {button('公式', () => { setInput('E = mc^2'); setPrompt('math') })}
        {button('流程图', () => { editor.chain().focus().insertContent({ type: 'codeBlock', attrs: { language: 'mermaid' }, content: [{ type: 'text', text: 'flowchart LR\n  A[开始] --> B[结束]' }] }).run() })}
        {button('分隔线', () => { editor.chain().focus().setHorizontalRule().run() })}
        {button('图片', () => fileRef.current?.click())}
        {button('撤销', () => { editor.chain().focus().undo().run() }, false, !editor.can().undo())}
        {button('重做', () => { editor.chain().focus().redo().run() }, false, !editor.can().redo())}
        <Button size="small" htmlType="button" disabled={needsSource(value) || uploading} onClick={() => setSourceMode(!sourceMode)}>{source ? '可视化编辑' : 'Markdown 源码'}</Button>
      </Space>
      {editor.isActive('codeBlock') && !source && <Input size="small" aria-label="代码语言" placeholder="语言，如 go / mermaid" value={String(editor.getAttributes('codeBlock').language ?? '')} onChange={(event) => editor.chain().updateAttributes('codeBlock', { language: event.target.value }).run()} />}
      {editor.isActive('table') && !source && <Space size={4} wrap>{button('新增行', () => { editor.chain().focus().addRowAfter().run() })}{button('新增列', () => { editor.chain().focus().addColumnAfter().run() })}{button('删除行', () => { editor.chain().focus().deleteRow().run() })}{button('删除列', () => { editor.chain().focus().deleteColumn().run() })}{button('删除表格', () => { editor.chain().focus().deleteTable().run() })}</Space>}
    </div>
    {needsSource(value) && <Alert type="info" showIcon message="此文含脚注或 HTML，使用源码编辑以完整保留这些格式；下方可查看实际预览。" />}
    {source ? <Input.TextArea aria-label="Markdown 源码" className="markdown-editor" rows={18} value={value} onChange={(event) => onChange?.(event.target.value)} /> : <EditorContent editor={editor} />}
    <input hidden style={{ display: 'none' }} type="file" ref={fileRef} accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file) }} />
    <div className="rich-editor-status">{uploading ? '图片上传中…' : 'Tiptap · 自动备份草稿 · Markdown 存储'}</div>
    <Modal title={prompt === 'link' ? '编辑链接（留空移除）' : '插入 LaTeX 公式'} open={prompt !== null} onCancel={() => setPrompt(null)} onOk={applyPrompt} destroyOnHidden>
      <Input aria-label={prompt === 'link' ? '链接地址' : 'LaTeX 公式'} value={input} onChange={(event) => setInput(event.target.value)} onPressEnter={applyPrompt} />
    </Modal>
  </div>
}
