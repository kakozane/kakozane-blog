// 开发服务启动后运行；复用已有 Playwright，可通过 PLAYWRIGHT_MODULE_PATH 指定。
// 上传接口使用模拟响应，不创建文章或媒体记录。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const origin = process.env.ADMIN_ORIGIN || 'https://admin.dev.kakozane.icu'
const credentials = Object.fromEntries(fs.readFileSync(
  process.env.ADMIN_CREDENTIALS_FILE || path.resolve(__dirname, '../api/bootstrap-admin.txt'), 'utf8',
).trim().split('\n').map(line => {
  const separator = line.indexOf(': ')
  return [line.slice(0, separator), line.slice(separator + 2)]
}))

async function check() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] })
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    const login = await context.request.post(`${origin}/api/v1/admin/auth/login`, { data: credentials, headers: { Origin: origin } })
    assert(login.ok(), '测试账号登录失败')
    const page = await context.newPage()
    await page.goto(`${origin}/posts/new`)
    const editor = page.getByRole('textbox', { name: '正文富文本编辑器' })
    await editor.waitFor()
    await page.getByRole('button', { name: '查看源码', exact: true }).click()
    await page.getByRole('textbox', { name: '正文源码' }).fill('> [!NOTE]\n> 提示内容\n\n普通正文')
    await page.getByRole('button', { name: '可视化编辑', exact: true }).click()
    await editor.click()
    await editor.press('ControlOrMeta+a')
    await page.getByRole('button', { name: 'Underline', exact: true }).click()
    // 等待新的富文本预览，避免断言旧的 Markdown DOM。
    await page.locator('.markdown-preview u').first().waitFor()
    assert.equal(await page.locator('.markdown-preview .markdown-alert-note').count(), 1)
    assert(!(await page.locator('.markdown-preview').innerText()).includes('[!NOTE]'))
    await page.getByRole('button', { name: '查看源码', exact: true }).click()
    await page.getByRole('textbox', { name: '正文源码' }).fill('上传测试')
    await page.getByRole('button', { name: '可视化编辑', exact: true }).click()
    await editor.click()
    await editor.press('ControlOrMeta+End')
    await page.route('**/api/v1/admin/media', async route => {
      const failed = (route.request().postData() || '').includes('failed.png')
      await route.fulfill({ status: failed ? 500 : 200, contentType: 'application/json', body: JSON.stringify(
        failed ? { error: '模拟单张上传失败' } : { id: 999, url: '/uploads/success.png' },
      ) })
    })
    await page.getByRole('button', { name: 'Add image', exact: true }).click()
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSioAAAAASUVORK5CYII=', 'base64')
    await page.locator('input[type=file]').last().setInputFiles([
      { name: 'failed.png', mimeType: 'image/png', buffer },
      { name: 'success.png', mimeType: 'image/png', buffer },
    ])
    const image = page.locator('.simple-editor img')
    await image.waitFor()
    assert.equal(await image.getAttribute('src'), '/uploads/success.png')
    assert.equal(await image.getAttribute('alt'), 'success')
    assert.equal(await image.getAttribute('title'), 'success')
    console.log('PASS 提示框富文本格式保留；部分上传失败时图片说明正确')
  } finally { await browser.close() }
}
check().catch(error => { console.error(error); process.exitCode = 1 })
