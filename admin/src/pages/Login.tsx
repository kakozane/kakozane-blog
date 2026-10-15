import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { LoginForm, ProFormText } from '@ant-design/pro-components'
import { Alert } from 'antd'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { login } from '../api/auth'
import { SSOPrompt } from '../components/SSOPrompt'
import type { LoginInput } from '../types/auth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
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
      <LoginForm<LoginInput> className="login-form" title="Kakozane" subTitle="博客内容管理平台" logo={<span className="admin-brand" aria-hidden="true">K</span>}
        contentStyle={{ width: '100%', minWidth: 0 }} onFinish={submit}
        submitter={{ searchConfig: { submitText: '登录' }, submitButtonProps: { loading: pending, size: 'large' } }}>
        <div className="login-method">账号密码登录</div>
        <SSOPrompt />
        {location.state?.sessionExpired && <Alert className="login-error" message="登录已失效，可能已在其他设备登录。请重新登录。" type="warning" showIcon />}
        {error && <Alert className="login-error" message={error} type="error" showIcon />}
        <ProFormText label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]} fieldProps={{ autoComplete: 'username', maxLength: 64, size: 'large', prefix: <UserOutlined /> }} placeholder="请输入管理员账号" />
        <ProFormText.Password label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]} fieldProps={{ autoComplete: 'current-password', size: 'large', prefix: <LockOutlined /> }} placeholder="请输入密码" />
      </LoginForm>
      <footer className="login-footer">© {new Date().getFullYear()} Kakozane · 管理后台</footer>
    </main>
  )
}
