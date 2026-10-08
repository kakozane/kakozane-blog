import type { Notifications } from '../types/notification'
export async function notifications(page = 1): Promise<Notifications> {
 const response = await fetch(`/api/v1/auth/notifications?page=${page}`, { credentials: 'same-origin', cache: 'no-store' })
 if (!response.ok) throw new Error('通知加载失败，请稍后重试')
 return response.json() as Promise<Notifications>
}
export async function readNotification(id: number) {
 const response = await fetch(`/api/v1/auth/notifications/${id}/read`, { method: 'PUT', credentials: 'same-origin' })
 if (!response.ok) throw new Error('标记已读失败')
 window.dispatchEvent(new Event('notifications-read'))
}
