import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { login } from '../api/auth'
import type { LoginInput } from '../types/auth'

export default function Login() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(input: LoginInput) {
    setPending(true)
    setError('')
    try {
      await login(input)
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '登录失败，请稍后重试')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login-page">
      <Card className="login-card">
        <Typography.Title level={3}>管理后台登录</Typography.Title>
        <Typography.Paragraph type="secondary">使用具有管理员身份的博客账号。</Typography.Paragraph>
        {error && <Alert className="login-error" message={error} type="error" showIcon />}
        <Form<LoginInput> layout="vertical" onFinish={submit}>
          <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input autoComplete="username" maxLength={64} size="large" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>
          <Button block htmlType="submit" loading={pending} size="large" type="primary">登录</Button>
        </Form>
      </Card>
    </main>
  )
}
