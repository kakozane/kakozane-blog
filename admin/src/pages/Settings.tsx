import { Button, Card, Form, Input, Typography, message } from 'antd'
import { useEffect, useState } from 'react'

import { getSite, updateSite } from '../api/site'
import type { Site } from '../types/site'

export default function Settings() {
  const [form] = Form.useForm<Site>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void getSite().then((site) => { if (active) form.setFieldsValue(site) })
      .catch((cause: unknown) => message.error(cause instanceof Error ? cause.message : '加载失败'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [form])

  async function save(input: Site) {
    setSaving(true)
    try {
      form.setFieldsValue(await updateSite(input))
      message.success('站点设置已保存')
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setSaving(false) }
  }

  return (
    <section className="admin-page admin-editor">
      <div className="admin-page-heading"><div><Typography.Title level={2}>站点设置</Typography.Title><Typography.Text type="secondary">管理博客名称、简介、关于页面和公开地址</Typography.Text></div></div>
      <Card loading={loading}>
        <Form<Site> form={form} layout="vertical" onFinish={(input) => void save(input)}>
          <Form.Item label="博客名称" name="title" rules={[{ required: true }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
          <Form.Item label="首页标语" name="tagline" rules={[{ required: true }, { max: 240 }]}><Input maxLength={240} /></Form.Item>
          <Form.Item label="站点简介" name="description" rules={[{ max: 500 }]}><Input.TextArea maxLength={500} rows={3} showCount /></Form.Item>
          <Form.Item label="关于页面（Markdown）" name="aboutMd"><Input.TextArea className="markdown-editor" rows={10} /></Form.Item>
          <Form.Item extra="用于 RSS、sitemap 等公开链接" label="公开站点地址" name="siteUrl" rules={[{ required: true }, { type: 'url', message: '请输入完整的 HTTPS 地址' }]}><Input placeholder="https://kakozane.icu" /></Form.Item>
          <Form.Item label="GitHub 地址" name="githubUrl" rules={[{ type: 'url', message: '请输入完整的 HTTPS 地址' }]}><Input placeholder="https://github.com/..." /></Form.Item>
          <Button htmlType="submit" loading={saving} type="primary">保存设置</Button>
        </Form>
      </Card>
    </section>
  )
}
