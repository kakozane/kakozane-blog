export function publicPreviewOrigin(current: string): string {
  const url = new URL(current)
  if (url.hostname === 'localhost' && url.port === '6326') url.port = '6325'
  else if (url.hostname.startsWith('admin.')) url.hostname = url.hostname.slice(6)
  else throw new Error('请通过博客后台地址打开预览')
  return url.origin
}
