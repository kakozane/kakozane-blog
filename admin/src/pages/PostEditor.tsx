import { Button, Card, Form, Input, Select, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { getPost, listTerms, savePost } from '../api/content'
import type { PostInput, Term } from '../types/content'

const emptyPost: PostInput = { title: '', slug: '', excerpt: '', contentMd: '', coverUrl: '', status: 'draft', categoryId: null, tagIds: [] }

export default function PostEditor() {
  const { id } = useParams()
  const postId = id ? Number(id) : undefined
  const navigate = useNavigate()
  const [form] = Form.useForm<PostInput>()
  const preview = Form.useWatch('contentMd', form) ?? ''
  const [categories, setCategories] = useState<Term[]>([])
  const [tags, setTags] = useState<Term[]>([])
  const [loading, setLoading] = useState(Boolean(postId))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [categoryItems, tagItems, post] = await Promise.all([
          listTerms('categories'), listTerms('tags'), postId ? getPost(postId) : Promise.resolve(null),
        ])
        if (!active) return
        setCategories(categoryItems)
        setTags(tagItems)
        if (post) form.setFieldsValue({
          title: post.title, slug: post.slug, excerpt: post.excerpt, contentMd: post.contentMd ?? '',
          coverUrl: post.coverUrl, status: post.status, categoryId: post.categoryId,
          tagIds: post.tags.map((tag) => tag.id),
        })
      } catch (cause) {
        message.error(cause instanceof Error ? cause.message : '文章加载失败')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [form, postId])

  async function submit(input: PostInput) {
    setSaving(true)
    try {
      await savePost({ ...input, categoryId: input.categoryId || null, tagIds: input.tagIds ?? [] }, postId)
      message.success(input.status === 'published' ? '文章已发布' : '草稿已保存')
      navigate('/posts')
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-page admin-editor">
      <div className="admin-page-heading"><div><Typography.Title level={2}>{postId ? '编辑文章' : '写文章'}</Typography.Title><Typography.Text type="secondary">正文使用 Markdown，发布后在博客前台展示</Typography.Text></div><Button onClick={() => navigate('/posts')}>返回列表</Button></div>
      <Card loading={loading}>
        <Form<PostInput> form={form} initialValues={emptyPost} layout="vertical" onFinish={(input) => void submit(input)}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入文章标题' }, { max: 240 }]}><Input maxLength={240} placeholder="文章标题" size="large" /></Form.Item>
          <Form.Item extra="网址中使用的简短名称，可用中英文、数字和连字符" label="文章链接" name="slug" rules={[{ required: true, message: '请输入文章链接' }, { pattern: /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, message: '只能使用文字、数字和连字符' }]}><Input maxLength={160} placeholder="例如 my-first-post" /></Form.Item>
          <Form.Item label="摘要" name="excerpt" rules={[{ max: 500 }]}><Input.TextArea maxLength={500} placeholder="用于文章列表和搜索摘要" rows={3} showCount /></Form.Item>
          <Form.Item label="正文（Markdown）" name="contentMd"><Input.TextArea className="markdown-editor" placeholder="开始写作，支持 Markdown 和表格" rows={18} /></Form.Item>
          <Card className="markdown-preview" size="small" title="正文预览"><ReactMarkdown remarkPlugins={[remarkGfm]}>{preview || '暂无内容'}</ReactMarkdown></Card>
          <Form.Item extra={<span>可在 <Link to="/media">媒体库</Link> 上传后复制图片地址</span>} label="封面图片地址" name="coverUrl" rules={[{ pattern: /^(https:\/\/\S+|\/(?!\/)\S+)?$/, message: '使用 HTTPS 地址或站内路径' }]}><Input placeholder="https://... 或 /uploads/..." /></Form.Item>
          <Space className="editor-selects" size="large" wrap>
            <Form.Item label="分类" name="categoryId"><Select allowClear options={categories.map((item) => ({ value: item.id, label: item.name }))} placeholder="未分类" style={{ width: 220 }} /></Form.Item>
            <Form.Item label="标签" name="tagIds"><Select mode="multiple" options={tags.map((item) => ({ value: item.id, label: item.name }))} placeholder="选择标签" style={{ minWidth: 250 }} /></Form.Item>
            <Form.Item label="状态" name="status"><Select options={[{ value: 'draft', label: '草稿' }, { value: 'published', label: '发布' }]} style={{ width: 140 }} /></Form.Item>
          </Space>
          <Form.Item><Button htmlType="submit" loading={saving} type="primary">保存文章</Button></Form.Item>
        </Form>
      </Card>
    </section>
  )
}
