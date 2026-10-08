export type ReplyNotification = { id: number; commentId: number; kind: 'post' | 'note' | 'thought'; slug: string; title: string; authorName: string; body: string; read: boolean; createdAt: string }
export type Notifications = { items: ReplyNotification[]; unread: number }
