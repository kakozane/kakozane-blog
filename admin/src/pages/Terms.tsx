import { Button, Form, Input, Modal, Popconfirm, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'

import { deleteTerm, listTerms, saveTerm } from '../api/content'
import type { Term } from '../types/content'

type Kind = 'categories' | 'tags'
type TermInput = Pick<Term, 'name' | 'slug'>

export default function Terms({ kind }: { kind: Kind }) {
  const label = kind === 'categories' ? '分类' : '标签'
  const [items, setItems] = useState<Term[]>([])
  const [editing, setEditing] = useState<Term | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<TermInput>()

  const refresh = useCallback(async () => {
    try { setItems(await listTerms(kind)) }
    catch (cause) { message.error(cause instanceof Error ? cause.message : '加载失败') }
  }, [kind])
  useEffect(() => { void refresh() }, [refresh])

  function edit(item?: Term) {
    setEditing(item ?? null)
    form.setFieldsValue(item ? { name: item.name, slug: item.slug } : { name: '', slug: '' })
    setOpen(true)
  }

  async function save(input: TermInput) {
    setSaving(true)
    try {
      await saveTerm(kind, input, editing?.id)
      setOpen(false)
      message.success(`${label}已保存`)
      await refresh()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    try {
      await deleteTerm(kind, id)
      message.success(`${label}已删除`)
      await refresh()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '删除失败')
    }
  }

  const columns: ColumnsType<Term> = [
    { title: '名称', dataIndex: 'name' },
    { title: '链接', dataIndex: 'slug' },
    { title: '操作', width: 150, render: (_, item) => <Space><Button onClick={() => edit(item)} size="small" type="link">编辑</Button><Popconfirm title={`删除${label}？`} onConfirm={() => void remove(item.id)}><Button danger size="small" type="link">删除</Button></Popconfirm></Space> },
  ]

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><Typography.Title level={2}>{label}管理</Typography.Title><Typography.Text type="secondary">整理文章主题，方便读者查找</Typography.Text></div><Button onClick={() => edit()} type="primary">新增{label}</Button></div>
      <Table columns={columns} dataSource={items} rowKey="id" pagination={false} />
      <Modal destroyOnHidden footer={null} onCancel={() => setOpen(false)} open={open} title={`${editing ? '编辑' : '新增'}${label}`}>
        <Form<TermInput> form={form} layout="vertical" onFinish={(input) => void save(input)}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
          <Form.Item label="链接" name="slug" rules={[{ required: true, message: '请输入链接' }, { pattern: /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, message: '只能使用文字、数字和连字符' }]}><Input maxLength={160} placeholder="例如 frontend" /></Form.Item>
          <Button htmlType="submit" loading={saving} type="primary">保存</Button>
        </Form>
      </Modal>
    </section>
  )
}
