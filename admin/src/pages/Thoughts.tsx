import { Button, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'

import { deletePost, listPosts, savePost } from '../api/content'
import type { Post, PostInput } from '../types/content'

export default function Thoughts() {
  const [items, setItems] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Post | null>(null)
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<Post['status']>('draft')
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await listPosts(page, 10, '', '', 'thought')
      setItems(data.items)
      setTotal(data.total)
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '思考加载失败') }
  }, [page])
  useEffect(() => { void refresh() }, [refresh])

  function edit(item?: Post) {
    setEditing(item ?? null)
    setBody(item?.contentMd ?? '')
    setStatus(item?.status ?? 'draft')
    setOpen(true)
  }

  async function save() {
    const text = body.trim()
    if (!text) { message.error('请先写下内容'); return }
    const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? text
    const title = Array.from(firstLine.trim().replace(/^[#*>\s-]+/, '')).slice(0, 80).join('') || '一则思考'
    const input: PostInput = {
      kind: 'thought', title, slug: editing?.slug ?? crypto.randomUUID(), excerpt: Array.from(text).slice(0, 500).join(''),
      contentMd: text, coverUrl: '', status, pinned: false, categoryId: null, tagIds: [],
    }
    setSaving(true)
    try {
      await savePost(input, editing?.id)
      setOpen(false)
      message.success(status === 'published' ? '思考已发布' : '草稿已保存')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setSaving(false) }
  }

  async function remove(id: number) {
    try {
      await deletePost(id)
      message.success('思考已删除')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '删除失败') }
  }

  const columns: ColumnsType<Post> = [
    { title: '内容', render: (_, item) => <span>{item.excerpt || item.title}</span> },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: Post['status']) => <Tag color={value === 'published' ? 'green' : 'default'}>{value === 'published' ? '已发布' : '草稿'}</Tag> },
    { title: '更新于', dataIndex: 'updatedAt', width: 180, render: (value: string) => new Date(value).toLocaleString('zh-CN') },
    { title: '操作', width: 150, render: (_, item) => <Space><Button onClick={() => edit(item)} size="small" type="link">编辑</Button><Popconfirm title="删除这则思考？" description="删除后无法恢复" onConfirm={() => void remove(item.id)}><Button danger size="small" type="link">删除</Button></Popconfirm></Space> },
  ]

  return <section className="admin-page">
    <div className="admin-page-heading"><div><Typography.Title level={2}>思考管理</Typography.Title><Typography.Text type="secondary">短想法不需要标题，直接写正文即可</Typography.Text></div><Button onClick={() => edit()} type="primary">写一则思考</Button></div>
    <Table columns={columns} dataSource={items} rowKey="id" pagination={{ current: page, pageSize: 10, total, onChange: setPage, showSizeChanger: false }} />
    <Modal destroyOnHidden footer={null} onCancel={() => setOpen(false)} open={open} title={editing ? '编辑思考' : '写一则思考'}>
      <label htmlFor="thought-body">正文（支持 Markdown，最多 2000 字）</label>
      <Input.TextArea id="thought-body" maxLength={2000} onChange={(event) => setBody(event.target.value)} rows={8} showCount style={{ margin: '12px 0 24px' }} value={body} />
      <Space><Select aria-label="发布状态" onChange={setStatus} options={[{ value: 'draft', label: '存为草稿' }, { value: 'published', label: '公开发布' }]} style={{ width: 140 }} value={status} /><Button loading={saving} onClick={() => void save()} type="primary">保存</Button></Space>
    </Modal>
  </section>
}
