import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { notifications, readNotification } from '../lib/notifications'
import { contentPath } from '../lib/content-path'
import type { Notifications, ReplyNotification } from '../types/notification'

export function NotificationBadge() {
 const [unread, setUnread] = useState(0)
 useEffect(() => {
  let active = true
  const refresh = () => { if (document.visibilityState === 'hidden') return; void notifications().then(data => { if (active) setUnread(data.unread) }).catch(() => {}) }
  refresh(); const timer = setInterval(refresh, 60000)
  window.addEventListener('notifications-read', refresh)
  document.addEventListener('visibilitychange', refresh)
  return () => { active = false; clearInterval(timer); window.removeEventListener('notifications-read', refresh); document.removeEventListener('visibilitychange', refresh) }
 }, [])
 return <Link className="site-login" to="/account#notifications" aria-label={`回复通知，${unread} 条未读`}>通知{unread > 0 ? ` ${unread}` : ''}</Link>
}
export function NotificationInbox() {
 const [page, setPage] = useState(1)
 const [data, setData] = useState<Notifications | null>(null)
 const [error, setError] = useState('')
 const [busy, setBusy] = useState(false)
 useEffect(() => { let active = true; setData(null); setError(''); void notifications(page).then(value => { if (active) setData(value) }).catch(cause => { if (active) setError(cause.message) });return () => { active = false } }, [page])
 async function open(item: ReplyNotification) {
  setBusy(true);setError('')
  try {
   const prefix = contentPath(item.kind, item.slug)
   const response = await fetch(`/api/v1${prefix}/comments/${item.commentId}/location`)
   if (!response.ok) throw new Error('这条回复已不可见')
   const location = await response.json() as { page: number }
   await readNotification(item.id)
   window.location.assign(`${prefix}?commentsPage=${location.page}#comment-${item.commentId}`)
  } catch (cause) { setError(cause instanceof Error ? cause.message : '打开通知失败') } finally { setBusy(false) }
 }
 return <section id="notifications"><h2>评论回复通知{data && <span className="account-likes-count">{data.unread} 条未读</span>}</h2>
  {error && <p role="alert">{error}</p>}
  {!data && !error && <p>正在加载…</p>}
  {data && <><ol className="account-likes-list">{data.items.map(item => <li key={item.id}><div><strong>{item.read ? '' : '● '}{item.authorName}</strong> 回复了你在《{item.title}》下的评论<p>{item.body}</p><button disabled={busy} onClick={() => void open(item)}>查看回复</button></div><time>{new Date(item.createdAt).toLocaleString('zh-CN')}</time></li>)}</ol>{data.items.length === 0 && <p>暂无回复通知。</p>}<nav className="pagination" aria-label="通知分页"><button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button><button disabled={data.items.length < 20} onClick={() => setPage(page + 1)}>下一页</button></nav></>}
 </section>
}
