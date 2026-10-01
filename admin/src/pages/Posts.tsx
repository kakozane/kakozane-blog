import { Button, Input, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { deletePost, listPosts } from '../api/content'
import type { Post } from '../types/content'

export default function Posts() {
  const [items, setItems] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listPosts(page, 10, status, query)
      setItems(data.items)
      setTotal(data.total)
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '文章加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, status, query])

  useEffect(() => { void refresh() }, [refresh])

  async function remove(id: number) {
    try {
      await deletePost(id)
      message.success('文章已删除')
      await refresh()
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '删除失败')
    }
  }

  const columns: ColumnsType<Post> = [
    { title: '标题', dataIndex: 'title', render: (_, item) => <Link to={`/posts/${item.id}/edit`}>{item.title}</Link> },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: Post['status']) => <Tag color={value === 'published' ? 'green' : 'default'}>{value === 'published' ? '已发布' : '草稿'}</Tag> },
    { title: '分类', dataIndex: 'categoryName', width: 130, render: (value: string) => value || '—' },
    { title: '更新于', dataIndex: 'updatedAt', width: 180, render: (value: string) => new Date(value).toLocaleString('zh-CN') },
    { title: '操作', width: 150, render: (_, item) => <Space><Link to={`/posts/${item.id}/edit`}>编辑</Link><Popconfirm title="删除这篇文章？" description="删除后无法恢复" onConfirm={() => void remove(item.id)}><Button danger size="small" type="link">删除</Button></Popconfirm></Space> },
  ]

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><Typography.Title level={2}>文章管理</Typography.Title><Typography.Text type="secondary">撰写、编辑和发布博客文章</Typography.Text></div><Link to="/posts/new"><Button type="primary">写文章</Button></Link></div>
      <div className="admin-toolbar">
        <Input.Search allowClear onSearch={(value) => { setPage(1); setQuery(value.trim()) }} placeholder="搜索标题或摘要" style={{ maxWidth: 300 }} />
        <Select value={status} onChange={(value) => { setPage(1); setStatus(value) }} options={[{ value: '', label: '全部状态' }, { value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }]} style={{ width: 150 }} />
      </div>
      <Table columns={columns} dataSource={items} loading={loading} rowKey="id" pagination={{ current: page, pageSize: 10, total, onChange: setPage, showSizeChanger: false }} />
    </section>
  )
}
