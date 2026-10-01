import { Card, Statistic, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useRouteLoaderData } from 'react-router'

import { listComments } from '../api/comments'
import { listPosts } from '../api/content'
import { listUsers } from '../api/users'
import type { AdminUser } from '../types/auth'

type Counts = { posts: number; drafts: number; users: number; pending: number }

export default function Dashboard() {
  const user = useRouteLoaderData('admin') as AdminUser
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([listPosts(1, 1), listPosts(1, 1, 'draft'), listUsers(), listComments(1, 'pending')])
      .then(([posts, drafts, users, pending]) => {
        if (active) setCounts({ posts: posts.total, drafts: drafts.total, users: users.total, pending: pending.total })
      })
      .catch((cause) => { if (active) message.error(cause instanceof Error ? cause.message : '概览加载失败') })
    return () => { active = false }
  }, [])

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><Typography.Title level={2}>管理概览</Typography.Title><Typography.Text type="secondary">欢迎回来，{user.displayName}</Typography.Text></div></div>
      <div className="dashboard-grid">
        <Card><Statistic title="全部文章" value={counts?.posts ?? '—'} /><Link to="/posts">管理文章 →</Link></Card>
        <Card><Statistic title="草稿" value={counts?.drafts ?? '—'} /><Link to="/posts">继续写作 →</Link></Card>
        <Card><Statistic title="用户" value={counts?.users ?? '—'} /><Link to="/users">管理用户 →</Link></Card>
        <Card><Statistic title="待审核评论" value={counts?.pending ?? '—'} /><Link to="/comments">处理评论 →</Link></Card>
      </div>
    </section>
  )
}
