import { createBrowserRouter, redirect } from 'react-router'

import { currentUser, logout } from '../api/auth'
import LogoutError from '../pages/LogoutError'

export const router = createBrowserRouter([
  {
    path: '/',
    id: 'admin',
    loader: async () => {
      const user = await currentUser()
      return user ?? redirect('/login')
    },
    lazy: async () => ({ Component: (await import('../layout/AdminLayout')).default }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import('../pages/Dashboard')).default }) },
      { path: 'posts', lazy: async () => { const Posts = (await import('../pages/Posts')).default; return { Component: () => <Posts kind="post" /> } } },
      { path: 'posts/new', lazy: async () => { const Editor = (await import('../pages/PostEditor')).default; return { Component: () => <Editor kind="post" /> } } },
      { path: 'posts/:id/edit', lazy: async () => { const Editor = (await import('../pages/PostEditor')).default; return { Component: () => <Editor kind="post" /> } } },
      { path: 'notes', lazy: async () => { const Posts = (await import('../pages/Posts')).default; return { Component: () => <Posts kind="note" /> } } },
      { path: 'notes/new', lazy: async () => { const Editor = (await import('../pages/PostEditor')).default; return { Component: () => <Editor kind="note" /> } } },
      { path: 'notes/:id/edit', lazy: async () => { const Editor = (await import('../pages/PostEditor')).default; return { Component: () => <Editor kind="note" /> } } },
      { path: 'trash', lazy: async () => ({ Component: (await import('../pages/Trash')).default }) },
      { path: 'thinking', lazy: async () => ({ Component: (await import('../pages/Thoughts')).default }) },
      { path: 'pages', lazy: async () => ({ Component: (await import('../pages/Pages')).default }) },
      { path: 'pages/new', lazy: async () => ({ Component: (await import('../pages/PageEditor')).default }) },
      { path: 'pages/:id/edit', lazy: async () => ({ Component: (await import('../pages/PageEditor')).default }) },
      { path: 'says', lazy: async () => ({ Component: (await import('../pages/Says')).default }) },
      { path: 'categories', lazy: async () => { const Terms = (await import('../pages/Terms')).default; return { Component: () => <Terms kind="categories" /> } } },
      { path: 'tags', lazy: async () => { const Terms = (await import('../pages/Terms')).default; return { Component: () => <Terms kind="tags" /> } } },
      { path: 'users', lazy: async () => ({ Component: (await import('../pages/Users')).default }) },
      { path: 'profile', lazy: async () => ({ Component: (await import('../pages/Profile')).default }) },
      { path: 'comments', lazy: async () => ({ Component: (await import('../pages/Comments')).default }) },
      { path: 'media', lazy: async () => ({ Component: (await import('../pages/Media')).default }) },
      { path: 'friends', lazy: async () => ({ Component: (await import('../pages/Friends')).default }) },
      { path: 'projects', lazy: async () => ({ Component: (await import('../pages/Projects')).default }) },
      { path: 'settings', lazy: async () => ({ Component: (await import('../pages/Settings')).default }) },
    ],
  },
  { path: '/logout', loader: async () => {
    try { await logout(); return redirect('/login') }
    catch { return { error: '退出失败。' } }
  }, Component: LogoutError },
  { path: '/login', lazy: async () => ({ Component: (await import('../pages/Login')).default }) },
])
