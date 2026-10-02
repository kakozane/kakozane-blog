import { Alert, Button, Card, Form, Input, Modal, Select, Space, Typography, message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { Link, useNavigate, useParams, useRouteLoaderData } from 'react-router'
import { getPage, savePage } from '../api/pages'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import MarkdownImageUpload from '../components/MarkdownImageUpload'
import MarkdownPreview from '../components/MarkdownPreview'
import MarkdownToolbar from '../components/MarkdownToolbar'
import { openFrontPreview } from '../lib/front-preview'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { useDraftBackup } from '../hooks/useDraftBackup'
import type { AdminUser } from '../types/auth'
import type { PageInput } from '../types/page'

export default function PageEditor() {
  const { id } = useParams()
  const pageId = id ? Number(id) : undefined
  const admin = useRouteLoaderData('admin') as AdminUser
  const navigate = useNavigate()
  const [form] = Form.useForm<PageInput>()
  const editorRef = useRef<TextAreaRef>(null)
  const preview = Form.useWatch('contentMd', form) ?? ''
  const [loading, setLoading] = useState(Boolean(pageId))
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null)
  const backup = useDraftBackup<PageInput>(`kakozane:admin-draft:v1:${admin.id}:page:${pageId ?? 'new'}`)
  const setBaseUpdatedAt = backup.setBaseUpdatedAt
  const { blocker, markSaved } = useUnsavedChanges(dirty || uploadingImage)

  useEffect(() => {
    if (!pageId) return
    let active = true
    void getPage(pageId).then((page) => {
      if (active) {
        setServerUpdatedAt(page.updatedAt)
        setBaseUpdatedAt(page.updatedAt)
        form.setFieldsValue({ title: page.title, slug: page.slug, description: page.description, contentMd: page.contentMd ?? '', status: page.status })
      }
    }).catch((cause: unknown) => message.error(cause instanceof Error ? cause.message : '页面加载失败'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [form, pageId, setBaseUpdatedAt])

  async function submit(input: PageInput) {
    if (uploadingImage) { message.warning('请等图片上传完成后再保存'); return }
    setSaving(true)
    try { await savePage(input, pageId); message.success(input.status === 'published' ? '页面已发布' : '草稿已保存'); backup.clear(); markSaved(); if (blocker.state === 'blocked') blocker.reset(); navigate('/pages') }
    catch (cause) { message.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setSaving(false) }
  }

  function openPreview() {
    const input = form.getFieldsValue(true) as PageInput
    openFrontPreview({ kind: 'page', title: input.title?.trim() || '未命名页面', excerpt: input.description ?? '', contentMd: input.contentMd ?? '', coverUrl: '' },
      (error) => { void message.error(error) })
  }

  function queueDraft() {
    setDirty(true)
    backup.queue(form.getFieldsValue(true) as PageInput)
  }

  return <section className="admin-page admin-editor">
    <div className="admin-page-heading"><div><Typography.Title level={2}>{pageId ? '编辑页面' : '新建页面'}</Typography.Title><Typography.Text type="secondary">页面公开地址为 /pages/链接名</Typography.Text></div><Link to="/pages"><Button>返回列表</Button></Link></div>
    <Card loading={loading}>
      {backup.error && <Alert message={backup.error} showIcon type="warning" />}
      <Form<PageInput> form={form} initialValues={{ title: '', slug: '', description: '', contentMd: '', status: 'draft' }} layout="vertical" onFinish={(input) => void submit(input)} onValuesChange={queueDraft}>
        <Form.Item label="标题" name="title" rules={[{ required: true, whitespace: true }, { max: 240 }]}><Input maxLength={240} size="large" /></Form.Item>
        <Form.Item extra="可用中文、英文、数字和连字符" label="链接名" name="slug" rules={[{ required: true }, { pattern: /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, message: '只能使用文字、数字和连字符' }]}><Input maxLength={160} placeholder="例如 uses" /></Form.Item>
        <Form.Item label="摘要" name="description" rules={[{ max: 500 }]}><Input.TextArea maxLength={500} rows={3} showCount /></Form.Item>
        <MarkdownToolbar editorRef={editorRef} form={form} onDirty={queueDraft} />
        <Form.Item label="正文（Markdown）" name="contentMd"><Input.TextArea className="markdown-editor" ref={editorRef} rows={18} /></Form.Item>
        <MarkdownImageUpload editorRef={editorRef} form={form} onDirty={queueDraft} onUploadingChange={setUploadingImage} uploading={uploadingImage} />
        <Card className="markdown-preview" size="small" title="正文预览"><MarkdownPreview value={preview} /></Card>
        <Form.Item label="状态" name="status"><Select options={[{ value: 'draft', label: '草稿' }, { value: 'published', label: '发布' }]} style={{ width: 150 }} /></Form.Item>
        <Space><Button disabled={uploadingImage} htmlType="submit" loading={saving} type="primary">保存页面</Button><Button disabled={uploadingImage} htmlType="button" onClick={openPreview}>前台预览</Button></Space>
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
}
