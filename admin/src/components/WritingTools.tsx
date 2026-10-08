import { useRef, useState } from 'react'
import { Button, Drawer, List, Popconfirm, Space, Typography, message } from 'antd'
import { revisions, type Revision } from '../api/writing'
import type { PostInput } from '../types/content'
import MarkdownPreview from './MarkdownPreview'
import { downloadMarkdown, importMarkdown } from '../lib/markdown-file'

export default function WritingTools({ id, value, apply, disabled }: { disabled?: boolean; id?: number; value: () => PostInput; apply: (input: Partial<PostInput>) => void }) {
 const file = useRef<HTMLInputElement>(null)
 const [items, setItems] = useState<Revision[]>([])
 const [open, setOpen] = useState(false)
 const [selected, setSelected] = useState<Revision | null>(null)
 return <>
  <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0 }}><Space wrap>
   <Popconfirm title="导入 Markdown 将替换编辑框正文，是否继续？" onConfirm={() => file.current?.click()}><Button>导入 Markdown</Button></Popconfirm>
   <Button onClick={() => downloadMarkdown(value().title, value().contentMd)}>导出 Markdown</Button>
   {id && <Button onClick={() => { void revisions(id).then(data => { setItems(data); setOpen(true) }).catch(error => message.error(error.message)) }}>版本历史</Button>}
  </Space></fieldset>
  <input ref={file} hidden type="file" accept=".md,.markdown,text/markdown,text/plain" onChange={event => {
   const input = event.currentTarget; const selected = input.files?.[0]; input.value = ''
   if (!selected) return
   if (selected.size > 1024 * 1024) { void message.error('文件不能超过 1 MB'); return }
   void selected.text().then(text => { apply({ contentMd: importMarkdown(text) }); void message.success('已导入编辑框，尚未发布') }).catch(error => message.error(error.message))
  }} />
  <Drawer open={open} onClose={() => setOpen(false)} title="版本历史（最近 100 次）" size="large">
   <Typography.Paragraph type="secondary">选择版本预览，恢复只替换编辑框；手动保存后才生效。</Typography.Paragraph>
   <List dataSource={items} renderItem={item => <List.Item actions={[<Button key="preview" onClick={() => setSelected(item)}>预览</Button>, <Popconfirm key="restore" title="替换当前编辑内容？" onConfirm={() => { const { version: _version, ...snapshot } = item.snapshot; apply({ ...snapshot, status: 'draft' }); setOpen(false) }}><Button>恢复到编辑框</Button></Popconfirm>]}><List.Item.Meta title={item.snapshot.title} description={new Date(item.createdAt).toLocaleString('zh-CN')} /></List.Item>} />
   {selected && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
    <div className="markdown-preview"><h3>当前编辑内容</h3><MarkdownPreview value={value().contentMd} /></div>
    <div className="markdown-preview"><h3>历史版本：{selected.snapshot.title}</h3><MarkdownPreview value={selected.snapshot.contentMd} /></div>
   </div>}
  </Drawer>
 </>
}
