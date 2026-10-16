// 联调脚本使用与浏览器一致的协议；敏感数据只经 stdin / 内存传递。
const crypto = require('node:crypto')
function createEnvelope(metadata, path, data) {
  const key = crypto.randomBytes(32), iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from('blog-password:v1\nPOST\n' + path))
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ issuedAt: metadata.issuedAt, data })), cipher.final(), cipher.getAuthTag(),
  ])
  return {
    version: 1, keyId: metadata.keyId,
    wrappedKey: crypto.publicEncrypt({
      key: crypto.createPublicKey({ key: Buffer.from(metadata.publicKey, 'base64'), format: 'der', type: 'spki' }),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256',
    }, key).toString('base64'),
    iv: iv.toString('base64'), data: encrypted.toString('base64'),
  }
}
async function encryptedBody(request, origin, path, data) {
  const response = await request.get(origin + '/api/v1/auth/encryption-key')
  if (!response.ok()) throw new Error('Failed to get password encryption key')
  return createEnvelope(await response.json(), path, data)
}
module.exports = { createEnvelope, encryptedBody }
if (require.main === module) {
  let input = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', chunk => { input += chunk })
  process.stdin.on('end', () => {
    const { metadata, path, data } = JSON.parse(input)
    process.stdout.write(JSON.stringify(createEnvelope(metadata, path, data)))
  })
}
