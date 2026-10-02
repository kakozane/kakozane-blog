import { CommentOutlined, EditOutlined, FileTextOutlined, PictureOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Card, Statistic, Table, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useRouteLoaderData } from 'react-router'

import { listComments } from '../api/comments'
import { listPosts } from '../api/content'
import { listUsers } from '../api/users'
import type { AdminUser } from '../types/auth'
import type { Post } from '../types/content'

type Counts = { posts: number; drafts: number; users: number; pending: number }

export default function Dashboard() {
  const user = useRouteLoaderData('admin') as AdminUser
  const [counts, setCounts] = useState<Counts | null>(null)
  const [latest, setLatest] = useState<Post[]>([])

  useEffect(() => {
    let active = true
    Promise.all([listPosts(1, 5, '', '', 'post'), listPosts(1, 1, 'draft', '', 'post'), listUsers(), listComments(1, 'pending')])
      .then(([posts, drafts, users, pending]) => {
        if (active) {
          setCounts({ posts: posts.total, drafts: drafts.total, users: users.total, pending: pending.total })
          setLatest(posts.items)
        }
      })
      .catch((cause) => { if (active) message.error(cause instanceof Error ? cause.message : '概览加载失败') })
    return () => { active = false }
  }, [])

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><Typography.Title level={2}>工作台</Typography.Title><Typography.Text type="secondary">欢迎回来，{user.displayName}。从这里开始管理你的博客。</Typography.Text></div><Link to="/posts/new"><Button type="primary" icon={<EditOutlined />}>写文章</Button></Link></div>
      <div className="dashboard-grid">
        <Card><Statistic title="全部文章" value={counts?.posts ?? '—'} /><Link to="/posts">管理文章 →</Link></Card>
        <Card><Statistic title="草稿" value={counts?.drafts ?? '—'} /><Link to="/posts">继续写作 →</Link></Card>
        <Card><Statistic title="用户" value={counts?.users ?? '—'} /><Link to="/users">管理用户 →</Link></Card>
        <Card><Statistic title="待审核评论" value={counts?.pending ?? '—'} /><Link to="/comments">处理评论 →</Link></Card>
      </div>
      <div className="dashboard-sections">
        <Card className="dashboard-latest" title="近期文章" extra={<Link to="/posts">全部文章</Link>}>
          <Table<Post> size="small" rowKey="id" loading={!counts} dataSource={latest} pagination={false} columns={[
            { title: '标题', dataIndex: 'title', render: (_, post) => <Link to={`/posts/${post.id}/edit`}>{post.title}</Link> },
            { title: '状态', dataIndex: 'status', width: 90, render: (value: string) => <Tag color={value === 'published' ? 'green' : 'default'}>{value === 'published' ? '已发布' : '草稿'}</Tag> },
            { title: '更新日期', dataIndex: 'updatedAt', width: 110, render: (value: string) => new Date(value).toLocaleDateString('zh-CN') },
          ]} />
        </Card>
        <Card title="快捷入口">
          <div className="dashboard-quick-links">
            <Link to="/posts/new"><EditOutlined />写文章</Link>
            <Link to="/notes/new"><FileTextOutlined />写手记</Link>
            <Link to="/comments"><CommentOutlined />审核评论</Link>
            <Link to="/media"><PictureOutlined />媒体库</Link>
            <Link to="/settings"><SettingOutlined />站点设置</Link>
          </div>
        </Card>
      </div>
    </section>
  )
}
