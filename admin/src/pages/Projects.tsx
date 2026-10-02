import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'

import { deleteProject, listProjects, saveProject } from '../api/projects'
import type { Project, ProjectInput } from '../types/project'

export default function Projects() {
  const [items, setItems] = useState<Project[]>([])
  const [editing, setEditing] = useState<Project | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<ProjectInput>()

  const refresh = useCallback(async () => {
    try { setItems(await listProjects()) }
    catch (cause) { message.error(cause instanceof Error ? cause.message : '项目加载失败') }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  function edit(item?: Project) {
    setEditing(item ?? null)
    form.resetFields()
    form.setFieldsValue(item ?? { name: '', url: '', description: '', avatarUrl: '', sortOrder: 0, visible: true })
    setOpen(true)
  }

  async function save(input: ProjectInput) {
    setSaving(true)
    try {
      await saveProject(input, editing?.id)
      setOpen(false)
      message.success('项目已保存')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setSaving(false) }
  }

  async function remove(id: number) {
    try {
      await deleteProject(id)
      message.success('项目已删除')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '删除失败') }
  }

  const columns: ColumnsType<Project> = [
    { title: '名称', dataIndex: 'name' },
    { title: '项目地址', dataIndex: 'url', ellipsis: true, render: (url: string) => <a href={url} rel="noopener noreferrer" target="_blank">{url}</a> },
    { title: '排序', dataIndex: 'sortOrder', width: 76 },
    { title: '状态', dataIndex: 'visible', width: 88, render: (visible: boolean) => <Tag color={visible ? 'blue' : 'default'}>{visible ? '公开' : '隐藏'}</Tag> },
    { title: '操作', width: 150, render: (_, item) => <Space><Button onClick={() => edit(item)} size="small" type="link">编辑</Button><Popconfirm title={`删除 ${item.name}？`} onConfirm={() => void remove(item.id)}><Button danger size="small" type="link">删除</Button></Popconfirm></Space> },
  ]

  return <section className="admin-page">
    <div className="admin-page-heading"><div><Typography.Title level={2}>项目管理</Typography.Title><Typography.Text type="secondary">展示你做过和正在做的项目</Typography.Text></div><Button onClick={() => edit()} type="primary">新增项目</Button></div>
    <Table columns={columns} dataSource={items} rowKey="id" pagination={false} />
    <Modal destroyOnHidden footer={null} onCancel={() => setOpen(false)} open={open} title={editing ? '编辑项目' : '新增项目'}>
      <Form<ProjectInput> form={form} layout="vertical" onFinish={(input) => void save(input)}>
        <Form.Item label="名称" name="name" rules={[{ required: true, whitespace: true }, { max: 80 }]}><Input maxLength={80} /></Form.Item>
        <Form.Item label="项目地址" name="url" rules={[{ required: true }, { type: 'url', message: '请输入完整的 HTTPS 地址' }, { pattern: /^https:\/\//, message: '请使用 HTTPS' }]}><Input maxLength={1024} placeholder="https://example.com" /></Form.Item>
        <Form.Item label="简介" name="description" rules={[{ max: 240 }]}><Input.TextArea maxLength={240} rows={2} /></Form.Item>
        <Form.Item extra="可在媒体库上传图标后填写 /uploads/...；也可留空" label="图标地址" name="avatarUrl"><Input maxLength={1024} /></Form.Item>
        <Form.Item label="排序（小的在前）" name="sortOrder"><InputNumber min={-10000} max={10000} style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="公开显示" name="visible" valuePropName="checked"><Switch /></Form.Item>
        <Button htmlType="submit" loading={saving} type="primary">保存</Button>
      </Form>
    </Modal>
  </section>
}
