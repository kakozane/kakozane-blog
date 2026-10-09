import { publicPreviewOrigin } from './preview-origin'

export type FrontPreview = {
  kind: 'post' | 'note' | 'thought' | 'page'
  title: string
  excerpt: string
  contentMd: string
  coverUrl: string
}

export function openFrontPreview(post: FrontPreview, onError: (error: string) => void) {
  if (post.contentMd.length > (2 << 20)) { onError('正文超过 2 MB，无法预览'); return }
  if (post.coverUrl.length > 1024 || (post.coverUrl && !/^(https:\/\/\S+|\/(?!\/)\S+)$/.test(post.coverUrl))) { onError('请先填写有效的封面地址'); return }
  let origin: string
  try { origin = publicPreviewOrigin(window.location.href) }
  catch (cause) { onError(cause instanceof Error ? cause.message : '预览地址无效'); return }
  let popup: Window | null = null
  let timer: number | undefined
  function cleanup() { window.removeEventListener('message', ready); window.clearTimeout(timer) }
  function ready(event: MessageEvent) {
    if (!popup || event.source !== popup || event.origin !== origin || event.data?.type !== 'kakozane-preview-ready') return
    popup.postMessage({ type: 'kakozane-preview', post }, origin)
    cleanup()
  }
  window.addEventListener('message', ready)
  popup = window.open(`${origin}/preview`, '_blank')
  if (!popup) { cleanup(); onError('浏览器拦截了预览窗口'); return }
  timer = window.setTimeout(() => { cleanup(); onError('预览页面未能连接，请重试') }, 10_000)
}
