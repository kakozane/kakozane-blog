import { Button, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'

import { deleteSay, listSays, saveSay } from '../api/says'
import type { Say, SayInput, SayList } from '../types/say'

export default function Says() {
  const [list, setList] = useState<SayList>({ items: [], total: 0, page: 1, pageSize: 20 })
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Say | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<SayInput>()

  const refresh = useCallback(async () => {
    try { setList(await listSays(page)) }
    catch (cause) { message.error(cause instanceof Error ? cause.message : '一言加载失败') }
  }, [page])
  useEffect(() => { void refresh() }, [refresh])

  function edit(item?: Say) {
    setEditing(item ?? null)
    form.resetFields()
    form.setFieldsValue(item ?? { text: '', source: '', author: '', visible: true })
    setOpen(true)
  }

  async function save(input: SayInput) {
    setSaving(true)
    try {
      await saveSay(input, editing?.id)
      setOpen(false)
      message.success('一言已保存')
      if (editing || page === 1) await refresh()
      else setPage(1)
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setSaving(false) }
  }

  async function remove(id: number) {
    try {
      await deleteSay(id)
      message.success('一言已删除')
      if (list.items.length === 1 && page > 1) setPage(page - 1)
      else await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '删除失败') }
  }

  const columns: ColumnsType<Say> = [
    { title: '内容', dataIndex: 'text', ellipsis: true },
    { title: '出处', dataIndex: 'source', width: 150, ellipsis: true },
    { title: '作者', dataIndex: 'author', width: 120, ellipsis: true },
    { title: '状态', dataIndex: 'visible', width: 86, render: (visible: boolean) => <Tag color={visible ? 'blue' : 'default'}>{visible ? '公开' : '隐藏'}</Tag> },
    { title: '操作', width: 145, render: (_, item) => <Space><Button onClick={() => edit(item)} size="small" type="link">编辑</Button><Popconfirm title="删除这条一言？" onConfirm={() => void remove(item.id)}><Button danger size="small" type="link">删除</Button></Popconfirm></Space> },
  ]

  return <section className="admin-page">
    <div className="admin-page-heading"><div><Typography.Title level={2}>一言管理</Typography.Title><Typography.Text type="secondary">保存摘录、作者与出处</Typography.Text></div><Button onClick={() => edit()} type="primary">新增一言</Button></div>
    <Table columns={columns} dataSource={list.items} rowKey="id" pagination={{ current: page, pageSize: list.pageSize, total: list.total, showSizeChanger: false, onChange: setPage }} />
    <Modal destroyOnHidden footer={null} onCancel={() => setOpen(false)} open={open} title={editing ? '编辑一言' : '新增一言'}>
      <Form<SayInput> form={form} layout="vertical" onFinish={(input) => void save(input)}>
        <Form.Item label="内容" name="text" rules={[{ required: true, whitespace: true }, { max: 1000 }]}><Input.TextArea maxLength={1000} rows={5} showCount /></Form.Item>
        <Form.Item label="出处" name="source" rules={[{ max: 120 }]}><Input maxLength={120} placeholder="例如：某本书或文章" /></Form.Item>
        <Form.Item label="作者" name="author" rules={[{ max: 80 }]}><Input maxLength={80} /></Form.Item>
        <Form.Item label="公开显示" name="visible" valuePropName="checked"><Switch /></Form.Item>
        <Button htmlType="submit" loading={saving} type="primary">保存</Button>
      </Form>
    </Modal>
  </section>
}
