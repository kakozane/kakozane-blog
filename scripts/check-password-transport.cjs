// 本地开发栈联调。仅修改临时用户密码；BLOG_TEST_ADMIN_USER/PASSWORD 提供管理员。
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const A = 'https://admin.dev.retniw.cc', F = 'https://dev.retniw.cc'
async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] })
  const owner = await browser.newContext({ ignoreHTTPSErrors: true })
  const reader = await browser.newContext({ ignoreHTTPSErrors: true })
  const captures = [], secrets = [process.env.BLOG_TEST_ADMIN_PASSWORD]
  function capture(context) {
    context.on('request', request => {
      if (request.method() === 'POST' && /\/(login|register|change-password|reset-password|admin\/users)$/.test(new URL(request.url()).pathname)) {
        captures.push({ url: request.url(), body: request.postData() })
      }
    })
  }
  capture(owner); capture(reader)
  const admin = await owner.newPage(), front = await reader.newPage()
  let childID
  async function login(page, origin, username, password) {
    await page.goto(origin + (origin === A ? '/login' : '/?auth=login'))
    await page.getByLabel('账号', { exact: true }).fill(username)
    await page.getByLabel('密码', { exact: true }).fill(password)
    const result = page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST').catch(() => null)
    await page.getByRole('button', { name: /^登\s*录$/ }).click()
    const response = await result
    if (!response) {
      console.log('Login UI:', await page.locator('.login-error, .auth-error').allTextContents())
      console.log('Crypto capability:', await page.evaluate(() => ({ secure: window.isSecureContext, subtle: !!crypto.subtle })))
      throw new Error('Login request was not sent')
    }
    assert.equal(response.status(), 200, 'login failed')
    await page.waitForURL(origin + '/')
  }
  try {
    assert(process.env.BLOG_TEST_ADMIN_USER && process.env.BLOG_TEST_ADMIN_PASSWORD, 'provide local test admin credentials')
    await login(admin, A, process.env.BLOG_TEST_ADMIN_USER, secrets[0])
    const username = 'cipher_' + crypto.randomBytes(6).toString('hex')
    const first = crypto.randomBytes(20).toString('hex'), second = first + '2', third = first + '3'
    secrets.push(first, second, third)
    const user = await admin.evaluate(async input => {
      const api = await import('/src/api/users.ts')
      return api.createUser(input)
    }, { username, password: first, displayName: '密码加密测试', role: 'admin' })
    childID = user.id
    await login(front, F, username, first)
    await front.goto(F + '/account')
    await front.getByLabel('当前密码', { exact: true }).fill(first)
    await front.getByLabel('新密码（至少 8 位）', { exact: true }).fill(second)
    await front.getByLabel('确认新密码', { exact: true }).fill(second)
    let changed = front.waitForResponse(r => r.url().endsWith('/auth/change-password'))
    await front.getByRole('button', { name: '修改密码', exact: true }).click()
    assert.equal((await changed).status(), 204, 'front password change')
    await front.waitForURL(/auth=login/)
    const staff = await reader.newPage()
    await login(staff, A, username, second)
    await staff.goto(A + '/profile')
    await staff.getByLabel('当前密码', { exact: true }).fill(second)
    await staff.getByLabel('新密码', { exact: true }).fill(third)
    await staff.getByLabel('确认新密码', { exact: true }).fill(third)
    changed = staff.waitForResponse(r => r.url().endsWith('/auth/change-password'))
    await staff.getByRole('button', { name: '修改密码', exact: true }).click()
    assert.equal((await changed).status(), 204, 'admin password change')
    await staff.waitForURL(A + '/login')
    await login(staff, A, username, third)
    const resetResponse = admin.waitForResponse(r => r.url().endsWith('/reset-password'))
    const reset = await admin.evaluate(async id => (await import('/src/api/users.ts')).resetPassword(id), childID)
    const wire = await (await resetResponse).text()
    assert(reset.password && !wire.includes(reset.password) && !wire.includes('"password"'), 'reset response must be ciphertext')
    secrets.push(reset.password)
    await login(front, F, username, reset.password)
    // 不发测试邮件；验证码错误应由业务层返回，证明注册密文已成功解密。
    const registration = await front.evaluate(async input => {
      try { await (await import('/app/modules/auth/api/auth.ts')).register(input); return '' }
      catch (error) { return error.message }
    }, { username: username + '_new', password: first, displayName: '测试', email: username + '@example.com', code: '000000' })
    assert.match(registration, /验证码/)
    for (const item of captures) {
      const body = JSON.parse(item.body)
      assert.equal(body.version, 1)
      assert(body.data && body.wrappedKey && body.iv)
      for (const secret of secrets) assert(!item.body.includes(secret), 'plaintext leaked in payload')
    }
    const raw = await owner.request.post(A + '/api/v1/admin/auth/login', {
      data: { username, password: first }, headers: { Origin: A },
    })
    assert.equal(raw.status(), 400, 'plaintext fallback forbidden')
    const replay = await owner.request.post(captures[0].url, {
      data: JSON.parse(captures[0].body), headers: { Origin: A },
    })
    assert.equal(replay.status(), 400, 'replay forbidden')
    console.log('PASS: browser login, both password-change forms, create/reset, registration validation, encrypted Network payload/response, plaintext/replay rejection')
  } finally {
    if (childID) await owner.request.delete(A + '/api/v1/admin/users/' + childID, { headers: { Origin: A } })
    await browser.close()
  }
}
run().catch(error => { console.error(error); process.exit(1) })
