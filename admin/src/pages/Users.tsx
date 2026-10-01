import { Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'

import { createUser, deleteUser, listUsers, resetPassword, updateUser } from '../api/users'
import type { User, UserInput, UserUpdate } from '../types/user'

type UserForm = UserInput & { status: User['status'] }

export default function Users() {
  const [items, setItems] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [form] = Form.useForm<UserForm>()

  const refresh = useCallback(async () => {
    try {
      const data = await listUsers(page, query)
      setItems(data.items)
      setTotal(data.total)
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '用户加载失败') }
  }, [page, query])
  useEffect(() => { void refresh() }, [refresh])

  function edit(user?: User) {
    setEditing(user ?? null)
    form.resetFields()
    form.setFieldsValue(user ? { displayName: user.displayName, role: user.role, status: user.status } : { role: 'reader', status: 'active' })
    setOpen(true)
  }

  async function save(input: UserForm) {
    setSaving(true)
    try {
      if (editing) {
        const update: UserUpdate = { displayName: input.displayName, role: input.role, status: input.status }
        await updateUser(editing.id, update)
      } else {
        await createUser({ username: input.username, displayName: input.displayName, password: input.password, role: input.role })
      }
      setOpen(false)
      message.success('用户已保存')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setSaving(false) }
  }

  async function reset(user: User) {
    try {
      const result = await resetPassword(user.id)
      setGeneratedPassword(result.password)
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '重置失败') }
  }

  async function remove(user: User) {
    try {
      await deleteUser(user.id)
      message.success('用户已删除')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '删除失败') }
  }

  const columns: ColumnsType<User> = [
    { title: '账号', dataIndex: 'username' },
    { title: '昵称', dataIndex: 'displayName' },
    { title: '身份', dataIndex: 'role', width: 100, render: (value: User['role']) => value === 'admin' ? '管理员' : '读者' },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: User['status']) => <Tag color={value === 'active' ? 'green' : 'default'}>{value === 'active' ? '正常' : '已停用'}</Tag> },
    { title: '操作', width: 260, render: (_, user) => <Space><Button onClick={() => edit(user)} size="small" type="link">编辑</Button><Popconfirm title={`重置 ${user.username} 的密码？`} description="旧会话会失效，新密码只显示一次" onConfirm={() => void reset(user)}><Button size="small" type="link">重置密码</Button></Popconfirm><Popconfirm title={`永久删除 ${user.username}？`} description="有文章的作者不能删除，建议先停用" onConfirm={() => void remove(user)}><Button danger size="small" type="link">删除</Button></Popconfirm></Space> },
  ]

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><Typography.Title level={2}>用户管理</Typography.Title><Typography.Text type="secondary">管理读者账号与管理员权限</Typography.Text></div><Button onClick={() => edit()} type="primary">新增用户</Button></div>
      <div className="admin-toolbar"><Input.Search allowClear onSearch={(value) => { setPage(1); setQuery(value.trim()) }} placeholder="搜索账号或昵称" style={{ maxWidth: 300 }} /></div>
      <Table columns={columns} dataSource={items} rowKey="id" pagination={{ current: page, pageSize: 10, total, onChange: setPage, showSizeChanger: false }} />
      <Modal destroyOnHidden footer={null} onCancel={() => setOpen(false)} open={open} title={editing ? '编辑用户' : '新增用户'}>
        <Form<UserForm> form={form} layout="vertical" onFinish={(input) => void save(input)}>
          {!editing && <Form.Item label="账号" name="username" rules={[{ required: true }, { pattern: /^[a-z0-9_]{3,64}$/, message: '3–64 位小写字母、数字或下划线' }]}><Input autoComplete="off" /></Form.Item>}
          <Form.Item label="昵称" name="displayName" rules={[{ required: true }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
          {!editing && <Form.Item label="初始密码" name="password" rules={[{ required: true }, { min: 8 }, { max: 128 }]}><Input.Password autoComplete="new-password" /></Form.Item>}
          <Form.Item label="身份" name="role" rules={[{ required: true }]}><Select options={[{ value: 'reader', label: '读者' }, { value: 'admin', label: '管理员' }]} /></Form.Item>
          {editing && <Form.Item label="状态" name="status" rules={[{ required: true }]}><Select options={[{ value: 'active', label: '正常' }, { value: 'disabled', label: '停用' }]} /></Form.Item>}
          <Button htmlType="submit" loading={saving} type="primary">保存</Button>
        </Form>
      </Modal>
      <Modal footer={<Button onClick={() => setGeneratedPassword('')} type="primary">我已保存</Button>} onCancel={() => setGeneratedPassword('')} open={Boolean(generatedPassword)} title="新密码（仅显示一次）">
        <Typography.Paragraph>请通过安全渠道交给用户。旧登录会话已失效。</Typography.Paragraph>
        <Typography.Text code copyable>{generatedPassword}</Typography.Text>
      </Modal>
    </section>
  )
}
