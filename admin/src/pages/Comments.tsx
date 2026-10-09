import { Button, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { deleteComment, listComments, setCommentPinned, setCommentStatus } from '../api/comments'
import type { Comment } from '../types/comment'

const statusNames = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }

export default function Comments() {
  const [items, setItems] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listComments(page, status)
      setItems(data.items)
      setTotal(data.total)
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '评论加载失败') }
    finally { setLoading(false) }
  }, [page, status])
  useEffect(() => { void refresh() }, [refresh])

  async function moderate(id: number, next: Comment['status']) {
    try {
      await setCommentStatus(id, next)
      message.success('评论状态已更新')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '操作失败') }
  }

  async function remove(id: number) {
    try {
      await deleteComment(id)
      message.success('评论已删除')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '删除失败') }
  }

  async function togglePin(item: Comment) {
    try {
      await setCommentPinned(item.id, !item.pinned)
      message.success(item.pinned ? '已取消置顶' : '评论已置顶')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '操作失败') }
  }

  const columns: ColumnsType<Comment> = [
    { title: '评论内容', dataIndex: 'body', render: (value: string) => <Typography.Paragraph ellipsis={{ rows: 3 }} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{value}</Typography.Paragraph> },
    { title: '作者', dataIndex: 'authorName', width: 120 },
    { title: '内容', dataIndex: 'postTitle', width: 180, render: (value: string, item) => <Link to={`/posts/${item.postId}/edit`}>{value}</Link> },
    { title: '状态', dataIndex: 'status', width: 130, render: (value: Comment['status'], item) => <Space size={4}><Tag color={value === 'approved' ? 'green' : value === 'pending' ? 'orange' : 'default'}>{statusNames[value]}</Tag>{item.pinned && <Tag color="blue">置顶</Tag>}</Space> },
    { title: '时间', dataIndex: 'createdAt', width: 175, render: (value: string) => new Date(value).toLocaleString('zh-CN') },
    { title: '操作', width: 240, render: (_, item) => <Space wrap>{item.status !== 'approved' && <Button onClick={() => void moderate(item.id, 'approved')} size="small" type="link">通过</Button>}{item.status === 'approved' && (item.parentId === null || item.pinned) && <Button onClick={() => void togglePin(item)} size="small" type="link">{item.pinned ? '取消置顶' : '置顶'}</Button>}{item.status !== 'rejected' && <Button onClick={() => void moderate(item.id, 'rejected')} size="small" type="link">拒绝</Button>}<Popconfirm title="删除这条评论？" onConfirm={() => void remove(item.id)}><Button danger size="small" type="link">删除</Button></Popconfirm></Space> },
  ]

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><Typography.Title level={2}>评论审核</Typography.Title><Typography.Text type="secondary">待审核评论不会出现在博客前台</Typography.Text></div></div>
      <div className="admin-toolbar"><Select value={status} onChange={(value) => { setPage(1); setStatus(value) }} options={[{ value: 'pending', label: '待审核' }, { value: 'approved', label: '已通过' }, { value: 'rejected', label: '已拒绝' }, { value: '', label: '全部' }]} style={{ width: 150 }} /></div>
      <Table columns={columns} dataSource={items} loading={loading} rowKey="id" pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }} />
    </section>
  )
}
