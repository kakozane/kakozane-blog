import { useEffect, useState } from 'react'
import { Button, Popconfirm, Space, Table, Typography, message } from 'antd'
import { listPosts } from '../api/content'
import { restorePost, purgePost } from '../api/writing'
import type { Post } from '../types/content'
export default function Trash() {
 const [items, setItems] = useState<Post[]>([])
 const [page, setPage] = useState(1)
 const [total, setTotal] = useState(0)
 const [busy, setBusy] = useState(false)
 async function load() { const data = await listPosts(page, 20, 'trash'); setItems(data.items);setTotal(data.total) }
 useEffect(() => { void load().catch(error => message.error(error.message)) }, [page])
 async function action(id: number, purge = false) {setBusy(true);try {if(purge) await purgePost(id);else await restorePost(id);await load()}catch(error){void message.error(error instanceof Error ? error.message : '操作失败')}finally{setBusy(false)}}
 return <section className="admin-page"><Typography.Title level={2}>回收站</Typography.Title><Typography.Paragraph type="secondary">文章、手记和思考移入后不再公开。恢复为草稿，不会自动重新发布。</Typography.Paragraph><Table rowKey="id" dataSource={items} loading={busy} pagination={{current:page,pageSize:20,total,onChange:setPage,showSizeChanger:false}} columns={[
 {title:'标题',dataIndex:'title'}, {title:'类型',dataIndex:'kind',render:(kind:Post['kind'])=>({post:'文章',note:'手记',thought:'思考'})[kind]},
 {title:'操作',render:(_,item)=><Space><Button onClick={()=>void action(item.id)}>恢复为草稿</Button><Popconfirm title="彻底删除？" description="正文、评论、点赞和版本历史将永久删除。" onConfirm={()=>void action(item.id,true)}><Button danger>彻底删除</Button></Popconfirm></Space>}
 ]}/></section>
}
