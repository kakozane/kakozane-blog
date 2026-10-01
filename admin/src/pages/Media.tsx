import { Button, Card, Pagination, Popconfirm, Space, Typography, Upload, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'

import { deleteMedia, listMedia, uploadMedia } from '../api/media'
import type { Media as MediaItem } from '../types/media'

export default function Media() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const refresh = useCallback(async () => {
    try {
      const data = await listMedia(page)
      setItems(data.items)
      setTotal(data.total)
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '图片加载失败') }
  }, [page])
  useEffect(() => { void refresh() }, [refresh])

  async function remove(id: number) {
    try {
      await deleteMedia(id)
      message.success('图片已删除')
      await refresh()
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '删除失败') }
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><Typography.Title level={2}>媒体库</Typography.Title><Typography.Text type="secondary">上传文章封面和正文图片，支持 JPEG、PNG、GIF、WebP，最多 5 MB</Typography.Text></div>
        <Upload accept="image/jpeg,image/png,image/gif,image/webp" customRequest={({ file, onSuccess, onError }) => { if (typeof file === 'string') { onError?.(new Error('无效文件')); return } void uploadMedia(file).then(() => { onSuccess?.({}); void refresh() }).catch((cause: unknown) => { onError?.(cause instanceof Error ? cause : new Error('上传失败')); message.error(cause instanceof Error ? cause.message : '上传失败') }) }} showUploadList={false}><Button type="primary">上传图片</Button></Upload>
      </div>
      {items.length === 0 && <Card><Typography.Text type="secondary">媒体库还是空的。</Typography.Text></Card>}
      <div className="media-grid">{items.map((item) => <Card key={item.id} cover={<img alt="" loading="lazy" src={item.url} />}>
        <Typography.Text type="secondary">{item.width} × {item.height} · {(item.sizeBytes / 1024).toFixed(0)} KB</Typography.Text>
        <Space className="media-actions"><Typography.Text code copyable={{ text: item.url }}>{item.url}</Typography.Text><Popconfirm title="删除这张图片？" description="文章中引用的图片也会失效" onConfirm={() => void remove(item.id)}><Button danger size="small" type="link">删除</Button></Popconfirm></Space>
      </Card>)}</div>
      {total > 40 && <Pagination current={page} onChange={setPage} pageSize={40} showSizeChanger={false} total={total} />}
    </section>
  )
}
