import { Button, Card, Form, Input, Typography, message } from 'antd'
import { useEffect, useState } from 'react'

import { getSite, updateSite } from '../api/site'
import type { Site } from '../types/site'

function localDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export default function Settings() {
  const [form] = Form.useForm<Site>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void getSite().then((site) => { if (active) form.setFieldsValue({ ...site, navLinks: site.navLinks ?? [], statusUntil: localDateTime(site.statusUntil) }) })
      .catch((cause: unknown) => message.error(cause instanceof Error ? cause.message : '加载失败'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [form])

  async function save(input: Site) {
    setSaving(true)
    try {
      const hasEmoji = Boolean(input.statusEmoji?.trim())
      const hasText = Boolean(input.statusText?.trim())
      if (hasEmoji !== hasText) throw new Error('近况表情和文字请同时填写')
      const until = hasText && input.statusUntil ? new Date(input.statusUntil) : null
      if (until && !(until.getTime() > Date.now())) throw new Error('显示至需要是未来时间')
      const site = await updateSite({ ...input, navLinks: input.navLinks ?? [], statusUntil: until?.toISOString() ?? null })
      form.setFieldsValue({ ...site, navLinks: site.navLinks ?? [], statusUntil: localDateTime(site.statusUntil) })
      message.success('站点设置已保存')
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setSaving(false) }
  }

  return (
    <section className="admin-page admin-editor">
      <div className="admin-page-heading"><div><Typography.Title level={2}>站点设置</Typography.Title><Typography.Text type="secondary">管理博客名称、简介、站长近况和公开地址</Typography.Text></div></div>
      <Card loading={loading}>
        <Form<Site> form={form} layout="vertical" onFinish={(input) => void save(input)}>
          <Form.Item label="博客名称" name="title" rules={[{ required: true }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
          <Form.Item label="首页标语" name="tagline" rules={[{ required: true }, { max: 240 }]}><Input maxLength={240} /></Form.Item>
          <Form.Item label="站点简介" name="description" rules={[{ max: 500 }]}><Input.TextArea maxLength={500} rows={3} showCount /></Form.Item>
          <Form.Item label="关于页面（Markdown）" name="aboutMd"><Input.TextArea className="markdown-editor" rows={10} /></Form.Item>
          <Form.Item extra="用于 RSS、sitemap 等公开链接" label="公开站点地址" name="siteUrl" rules={[{ required: true }, { type: 'url', message: '请输入完整的 HTTPS 地址' }]}><Input placeholder="https://kakozane.icu" /></Form.Item>
          <Form.Item label="GitHub 地址" name="githubUrl" rules={[{ type: 'url', message: '请输入完整的 HTTPS 地址' }]}><Input placeholder="https://github.com/..." /></Form.Item>
          <Form.Item extra="可先在媒体库上传头像，再填写 /uploads/... 地址；留空时首页使用纯文字排版" label="首页头像地址" name="avatarUrl" rules={[{ pattern: /^(https:\/\/\S+|\/(?!\/)\S+)?$/, message: '使用 HTTPS 地址或站内路径' }]}><Input placeholder="/uploads/..." /></Form.Item>
          <Form.Item extra="可在媒体库上传方形图片并填写 /uploads/...；留空使用默认 K 图标" label="浏览器标签图标地址" name="faviconUrl" rules={[{ pattern: /^(https:\/\/\S+|\/(?!\/)\S+)?$/, message: '使用 HTTPS 地址或站内路径' }]}><Input placeholder="/uploads/..." /></Form.Item>
          <Typography.Title level={4}>自定义导航</Typography.Title>
          <Typography.Paragraph type="secondary">最多 5 条，显示在前台“更多”和手机菜单中。可链接到已发布页面或 HTTPS 网站。</Typography.Paragraph>
          <Form.List name="navLinks">{(fields, { add, remove }) => <>
            {fields.map((field) => <div className="setting-nav-row" key={field.key}>
              <Form.Item label="名称" name={[field.name, 'label']} rules={[{ required: true, whitespace: true, message: '请输入名称' }, { max: 20, message: '最多 20 个字' }]}><Input maxLength={20} placeholder="例如 作品集" /></Form.Item>
              <Form.Item label="链接" name={[field.name, 'href']} rules={[{ required: true, message: '请输入链接' }, { max: 512, message: '链接过长' }, { validator: (_, value: string) => !value || /^(https:\/\/[^\s]+|\/(?!\/)[^\s]*)$/.test(value) ? Promise.resolve() : Promise.reject(new Error('使用站内 / 路径或 HTTPS 地址')) }]}><Input placeholder="/pages/portfolio 或 https://..." /></Form.Item>
              <Button aria-label={`删除第 ${field.name + 1} 条导航`} className="setting-nav-remove" onClick={() => remove(field.name)} type="text">删除</Button>
            </div>)}
            <Button disabled={fields.length >= 5} onClick={() => add({ label: '', href: '' })} type="dashed">添加导航</Button>
          </>}</Form.List>
          <Typography.Title level={4}>站长近况</Typography.Title>
          <Typography.Paragraph type="secondary">填写表情和文字后显示在首页；两项都留空即可隐藏。</Typography.Paragraph>
          <Form.Item label="表情" name="statusEmoji" rules={[{ max: 16 }]}><Input maxLength={16} placeholder="例如 💻" /></Form.Item>
          <Form.Item label="近况" name="statusText" rules={[{ max: 160 }]}><Input maxLength={160} placeholder="例如 正在整理新的文章" /></Form.Item>
          <Form.Item extra="可选；到期后自动从前台隐藏，留空则持续显示" label="显示至" name="statusUntil"><Input type="datetime-local" /></Form.Item>
          <Button htmlType="submit" loading={saving} type="primary">保存设置</Button>
        </Form>
      </Card>
    </section>
  )
}
