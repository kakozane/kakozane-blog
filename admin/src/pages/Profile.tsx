import { Button, Card, Form, Input, Typography, message } from 'antd'
import { useState } from 'react'
import { useNavigate, useRevalidator, useRouteLoaderData } from 'react-router'

import { changePassword, updateProfile } from '../api/users'
import type { AdminUser } from '../types/auth'

export default function Profile() {
  const user = useRouteLoaderData('admin') as AdminUser
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const [saving, setSaving] = useState(false)

  async function saveName(input: { displayName: string }) {
    setSaving(true)
    try {
      await updateProfile(input.displayName)
      message.success('昵称已更新')
      revalidator.revalidate()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setSaving(false) }
  }

  async function savePassword(input: { oldPassword: string; newPassword: string; confirmPassword: string }) {
    if (input.newPassword !== input.confirmPassword) { message.error('两次输入的新密码不一致'); return }
    setSaving(true)
    try {
      await changePassword(input.oldPassword, input.newPassword)
      message.success('密码已修改，请重新登录')
      navigate('/login', { replace: true })
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '修改失败') }
    finally { setSaving(false) }
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><Typography.Title level={2}>个人设置</Typography.Title><Typography.Text type="secondary">账号：{user.username}</Typography.Text></div></div>
      <div className="profile-grid">
        <Card title="个人资料"><Form initialValues={{ displayName: user.displayName }} layout="vertical" onFinish={(input: { displayName: string }) => void saveName(input)}><Form.Item label="昵称" name="displayName" rules={[{ required: true }, { max: 100 }]}><Input maxLength={100} /></Form.Item><Button htmlType="submit" loading={saving} type="primary">保存</Button></Form></Card>
        <Card title="修改密码"><Form layout="vertical" onFinish={(input: { oldPassword: string; newPassword: string; confirmPassword: string }) => void savePassword(input)}><Form.Item label="当前密码" name="oldPassword" rules={[{ required: true }]}><Input.Password autoComplete="current-password" /></Form.Item><Form.Item label="新密码" name="newPassword" rules={[{ required: true }, { min: 8 }, { max: 128 }]}><Input.Password autoComplete="new-password" /></Form.Item><Form.Item label="确认新密码" name="confirmPassword" rules={[{ required: true }]}><Input.Password autoComplete="new-password" /></Form.Item><Button htmlType="submit" loading={saving} type="primary">修改密码</Button></Form></Card>
      </div>
    </section>
  )
}
