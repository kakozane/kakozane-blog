import { Button, Popconfirm, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { deletePage, listPages } from '../api/pages'
import type { Page } from '../types/page'

export default function Pages() {
  const [items, setItems] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try { setItems(await listPages()) }
    catch (cause) { message.error(cause instanceof Error ? cause.message : '页面加载失败') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  async function remove(id: number) {
    try { await deletePage(id); message.success('页面已删除'); await refresh() }
    catch (cause) { message.error(cause instanceof Error ? cause.message : '删除失败') }
  }

  const columns: ColumnsType<Page> = [
    { title: '标题', dataIndex: 'title', render: (_, item) => <Link to={`/pages/${item.id}/edit`}>{item.title}</Link> },
    { title: '链接', dataIndex: 'slug', ellipsis: true, render: (slug: string) => `/pages/${slug}` },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: Page['status']) => <Tag color={value === 'published' ? 'green' : 'default'}>{value === 'published' ? '已发布' : '草稿'}</Tag> },
    { title: '更新于', dataIndex: 'updatedAt', width: 180, render: (value: string) => new Date(value).toLocaleString('zh-CN') },
    { title: '操作', width: 150, render: (_, item) => <Space><Link to={`/pages/${item.id}/edit`}>编辑</Link><Popconfirm title={`删除页面「${item.title}」？`} description="删除后无法恢复" onConfirm={() => void remove(item.id)}><Button danger size="small" type="link">删除</Button></Popconfirm></Space> },
  ]

  return <section className="admin-page">
    <div className="admin-page-heading"><div><Typography.Title level={2}>自定义页面</Typography.Title><Typography.Text type="secondary">发布不属于文章或手记的固定内容</Typography.Text></div><Link to="/pages/new"><Button type="primary">新建页面</Button></Link></div>
    <Table columns={columns} dataSource={items} loading={loading} rowKey="id" pagination={false} />
  </section>
}
