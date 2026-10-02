import { Alert, Button, Card, Form, Input, Modal, Select, Space, Switch, Typography, message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { Link, useNavigate, useParams, useRouteLoaderData } from 'react-router'
import { getPost, listTerms, savePost } from '../api/content'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import MarkdownImageUpload from '../components/MarkdownImageUpload'
import MarkdownPreview from '../components/MarkdownPreview'
import MarkdownToolbar from '../components/MarkdownToolbar'
import { openFrontPreview } from '../lib/front-preview'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { useDraftBackup } from '../hooks/useDraftBackup'
import type { AdminUser } from '../types/auth'
import type { PostInput, Term } from '../types/content'

const emptyPost: PostInput = { kind: 'post', title: '', slug: '', excerpt: '', contentMd: '', coverUrl: '', status: 'draft', pinned: false, categoryId: null, tagIds: [] }

export default function PostEditor({ kind }: { kind: 'post' | 'note' }) {
  const label = kind === 'note' ? '手记' : '文章'
  const base = kind === 'note' ? '/notes' : '/posts'
  const { id } = useParams()
  const postId = id ? Number(id) : undefined
  const admin = useRouteLoaderData('admin') as AdminUser
  const navigate = useNavigate()
  const [form] = Form.useForm<PostInput>()
  const editorRef = useRef<TextAreaRef>(null)
  const preview = Form.useWatch('contentMd', form) ?? ''
  const [categories, setCategories] = useState<Term[]>([])
  const [tags, setTags] = useState<Term[]>([])
  const [loading, setLoading] = useState(Boolean(postId))
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null)
  const backup = useDraftBackup<PostInput>(`kakozane:admin-draft:v1:${admin.id}:${kind}:${postId ?? 'new'}`)
  const setBaseUpdatedAt = backup.setBaseUpdatedAt
  const { blocker, markSaved } = useUnsavedChanges(dirty || uploadingImage)

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
        setServerUpdatedAt(post?.updatedAt ?? null)
        setBaseUpdatedAt(post?.updatedAt ?? null)
        if (post) form.setFieldsValue({
          kind: post.kind,
          title: post.title, slug: post.slug, excerpt: post.excerpt, contentMd: post.contentMd ?? '',
          coverUrl: post.coverUrl, status: post.status, pinned: post.pinned, categoryId: post.categoryId,
          tagIds: post.tags.map((tag) => tag.id),
        })
      } catch (cause) {
        message.error(cause instanceof Error ? cause.message : `${label}加载失败`)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [form, postId, label, setBaseUpdatedAt])

  async function submit(input: PostInput) {
    if (uploadingImage) { message.warning('请等图片上传完成后再保存'); return }
    setSaving(true)
    try {
      await savePost({ ...input, kind, categoryId: input.categoryId || null, tagIds: input.tagIds ?? [] }, postId)
      message.success(input.status === 'published' ? `${label}已发布` : '草稿已保存')
      backup.clear()
      markSaved()
      if (blocker.state === 'blocked') blocker.reset()
      navigate(base)
    } catch (cause) {
      message.error(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function openPreview() {
    const input = form.getFieldsValue(true) as PostInput
    openFrontPreview({
      kind, title: input.title?.trim() || `未命名${label}`, excerpt: input.excerpt ?? '',
      contentMd: input.contentMd ?? '', coverUrl: input.coverUrl ?? '',
    }, (error) => { void message.error(error) })
  }

  function queueDraft() {
    setDirty(true)
    const value = form.getFieldsValue(true) as PostInput
    backup.queue({ ...value, categoryId: value.categoryId ?? null, tagIds: value.tagIds ?? [] })
  }

  return (
    <section className="admin-page admin-editor">
      <div className="admin-page-heading"><div><Typography.Title level={2}>{postId ? `编辑${label}` : `写${label}`}</Typography.Title><Typography.Text type="secondary">正文使用 Markdown，发布后在博客前台展示</Typography.Text></div><Button onClick={() => navigate(base)}>返回列表</Button></div>
      <Card loading={loading}>
        {backup.error && <Alert message={backup.error} showIcon type="warning" />}
        <Form<PostInput> form={form} initialValues={{ ...emptyPost, kind }} layout="vertical" onFinish={(input) => void submit(input)} onValuesChange={queueDraft}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: `请输入${label}标题` }, { max: 240 }]}><Input maxLength={240} placeholder={`${label}标题`} size="large" /></Form.Item>
          <Form.Item extra="网址中使用的简短名称，可用中英文、数字和连字符" label={`${label}链接`} name="slug" rules={[{ required: true, message: `请输入${label}链接` }, { pattern: /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, message: '只能使用文字、数字和连字符' }]}><Input maxLength={160} placeholder="例如 my-first-post" /></Form.Item>
          <Form.Item label="摘要" name="excerpt" rules={[{ max: 500 }]}><Input.TextArea maxLength={500} placeholder={`用于${label}列表和搜索摘要`} rows={3} showCount /></Form.Item>
          <MarkdownToolbar editorRef={editorRef} form={form} onDirty={queueDraft} />
          <Form.Item extra="提示块可写为 > [!NOTE]、> [!TIP]、> [!WARNING] 等，下一行继续以 > 开头" label="正文（Markdown）" name="contentMd"><Input.TextArea className="markdown-editor" placeholder="开始写作，支持表格、代码块、Mermaid 图表、LaTeX 公式和提示块" ref={editorRef} rows={18} /></Form.Item>
          <MarkdownImageUpload editorRef={editorRef} form={form} onDirty={queueDraft} onUploadingChange={setUploadingImage} uploading={uploadingImage} />
          <Card className="markdown-preview" size="small" title="正文预览"><MarkdownPreview value={preview} /></Card>
          <Form.Item extra={<span>可在 <Link to="/media">媒体库</Link> 上传后复制图片地址</span>} label="封面图片地址" name="coverUrl" rules={[{ pattern: /^(https:\/\/\S+|\/(?!\/)\S+)?$/, message: '使用 HTTPS 地址或站内路径' }]}><Input maxLength={1024} placeholder="https://... 或 /uploads/..." /></Form.Item>
          <Space className="editor-selects" size="large" wrap>
            <Form.Item extra={kind === 'note' ? <span>可在 <Link to="/categories">分类管理</Link> 新建专栏</span> : undefined} label={kind === 'note' ? '专栏' : '分类'} name="categoryId"><Select allowClear options={categories.map((item) => ({ value: item.id, label: item.name }))} placeholder="未分类" style={{ width: 220 }} /></Form.Item>
            <Form.Item label="标签" name="tagIds"><Select mode="multiple" options={tags.map((item) => ({ value: item.id, label: item.name }))} placeholder="选择标签" style={{ minWidth: 250 }} /></Form.Item>
          <Form.Item label="状态" name="status"><Select options={[{ value: 'draft', label: '草稿' }, { value: 'published', label: '发布' }]} style={{ width: 140 }} /></Form.Item>
          <Form.Item label={kind === 'post' ? '置顶首页' : '精选手记'} name="pinned" valuePropName="checked"><Switch aria-label={kind === 'post' ? '置顶首页' : '精选手记'} /></Form.Item>
          </Space>
          <Form.Item><Space><Button disabled={uploadingImage} htmlType="submit" loading={saving} type="primary">保存{label}</Button><Button disabled={uploadingImage} htmlType="button" onClick={openPreview}>前台预览</Button></Space></Form.Item>
        </Form>
      </Card>
      <Modal
        cancelText="丢弃本地草稿" closable={false} keyboard={false} maskClosable={false}
        okText="恢复本地草稿" open={Boolean(backup.recovery) && !loading} title="发现未保存的本地草稿"
        onCancel={backup.clear}
        onOk={() => { if (backup.recovery) { form.setFieldsValue(backup.recovery.value); setDirty(true); backup.dismissRecovery() } }}
      >
        <p>备份时间：{backup.recovery && new Date(backup.recovery.savedAt).toLocaleString('zh-CN')}。恢复后请检查内容并手动保存。</p>
        {serverUpdatedAt && backup.recovery?.baseUpdatedAt !== serverUpdatedAt && <p>服务器上的内容已有更新，恢复本地草稿会覆盖编辑框中的新版内容。</p>}
      </Modal>
      <UnsavedChangesDialog blocker={blocker} saving={saving || uploadingImage} onDiscard={backup.clear} />
    </section>
  )
}
