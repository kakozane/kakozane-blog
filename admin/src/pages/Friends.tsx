import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'

import { deleteFriend, listFriends, saveFriend } from '../api/friends'
import type { FriendInput, FriendLink } from '../types/friend'

export default function Friends() {
  const [items, setItems] = useState<FriendLink[]>([])
  const [editing, setEditing] = useState<FriendLink | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<FriendInput>()

  const refresh = useCallback(async () => {
    try { setItems(await listFriends()) }
    catch (cause) { message.error(cause instanceof Error ? cause.message : '链接加载失败') }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  function edit(item?: FriendLink) {
    setEditing(item ?? null)
    form.resetFields()
    form.setFieldsValue(item ?? { kind: 'friend', name: '', url: '', description: '', avatarUrl: '', sortOrder: 0, visible: true })
    setOpen(true)
  }

  async function save(input: FriendInput) {
    setSaving(true)
    try {
      await saveFriend(input, editing?.id)
      setOpen(false)
      message.success('链接已保存')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setSaving(false) }
  }

  async function remove(id: number) {
    try {
      await deleteFriend(id)
      message.success('链接已删除')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '删除失败') }
  }

  const columns: ColumnsType<FriendLink> = [
    { title: '名称', dataIndex: 'name' },
    { title: '网址', dataIndex: 'url', ellipsis: true, render: (url: string) => <a href={url} rel="noopener noreferrer" target="_blank">{url}</a> },
    { title: '类型', dataIndex: 'kind', width: 96, render: (kind: FriendLink['kind']) => kind === 'friend' ? '友站' : '收藏' },
    { title: '排序', dataIndex: 'sortOrder', width: 76 },
    { title: '状态', dataIndex: 'visible', width: 88, render: (visible: boolean) => <Tag color={visible ? 'blue' : 'default'}>{visible ? '公开' : '隐藏'}</Tag> },
    { title: '操作', width: 150, render: (_, item) => <Space><Button onClick={() => edit(item)} size="small" type="link">编辑</Button><Popconfirm title={`删除 ${item.name}？`} onConfirm={() => void remove(item.id)}><Button danger size="small" type="link">删除</Button></Popconfirm></Space> },
  ]

  return <section className="admin-page">
    <div className="admin-page-heading"><div><Typography.Title level={2}>友情链接</Typography.Title><Typography.Text type="secondary">管理友站和值得收藏的网站</Typography.Text></div><Button onClick={() => edit()} type="primary">新增链接</Button></div>
    <Table columns={columns} dataSource={items} rowKey="id" pagination={false} />
    <Modal destroyOnHidden footer={null} onCancel={() => setOpen(false)} open={open} title={editing ? '编辑链接' : '新增链接'}>
      <Form<FriendInput> form={form} layout="vertical" onFinish={(input) => void save(input)}>
        <Form.Item label="类型" name="kind" rules={[{ required: true }]}><Select options={[{ value: 'friend', label: '友站' }, { value: 'collection', label: '收藏' }]} /></Form.Item>
        <Form.Item label="名称" name="name" rules={[{ required: true, whitespace: true }, { max: 80 }]}><Input maxLength={80} /></Form.Item>
        <Form.Item label="网站地址" name="url" rules={[{ required: true }, { type: 'url', message: '请输入完整的 HTTPS 地址' }, { pattern: /^https:\/\//, message: '请使用 HTTPS' }]}><Input maxLength={1024} placeholder="https://example.com" /></Form.Item>
        <Form.Item label="简介" name="description" rules={[{ max: 240 }]}><Input.TextArea maxLength={240} rows={2} /></Form.Item>
        <Form.Item extra="可在媒体库上传头像后填写 /uploads/...；也可留空" label="头像地址" name="avatarUrl"><Input maxLength={1024} /></Form.Item>
        <Form.Item label="排序（小的在前）" name="sortOrder"><InputNumber min={-10000} max={10000} style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="公开显示" name="visible" valuePropName="checked"><Switch /></Form.Item>
        <Button htmlType="submit" loading={saving} type="primary">保存</Button>
      </Form>
    </Modal>
  </section>
}
