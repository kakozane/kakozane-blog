import { Button, Card, Layout, Space, Tag, Typography, message } from 'antd'
import { useNavigate, useLoaderData } from 'react-router'

import { logout } from '../api/auth'
import type { AdminUser } from '../types/auth'

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useLoaderData() as AdminUser

  async function signOut() {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '退出失败')
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header className="admin-header">
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>Kakozane 博客管理</Typography.Title>
        <Button onClick={signOut}>退出</Button>
      </Layout.Header>
      <Layout.Content className="admin-content">
        <Card>
          <Typography.Title level={2}>管理后台</Typography.Title>
          <Typography.Paragraph>欢迎，{user.displayName}。文章管理功能将在这里接入。</Typography.Paragraph>
          <Space>
            <Tag color="blue">{user.role}</Tag>
            {user.permissions.map((permission) => <Tag key={permission}>{permission}</Tag>)}
          </Space>
        </Card>
      </Layout.Content>
    </Layout>
  )
}
