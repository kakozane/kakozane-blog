import { createBrowserRouter, redirect } from 'react-router'

import { currentUser } from '../api/auth'

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
      { path: 'posts', lazy: async () => ({ Component: (await import('../pages/Posts')).default }) },
      { path: 'posts/new', lazy: async () => ({ Component: (await import('../pages/PostEditor')).default }) },
      { path: 'posts/:id/edit', lazy: async () => ({ Component: (await import('../pages/PostEditor')).default }) },
      { path: 'categories', lazy: async () => { const Terms = (await import('../pages/Terms')).default; return { Component: () => <Terms kind="categories" /> } } },
      { path: 'tags', lazy: async () => { const Terms = (await import('../pages/Terms')).default; return { Component: () => <Terms kind="tags" /> } } },
      { path: 'users', lazy: async () => ({ Component: (await import('../pages/Users')).default }) },
      { path: 'profile', lazy: async () => ({ Component: (await import('../pages/Profile')).default }) },
      { path: 'comments', lazy: async () => ({ Component: (await import('../pages/Comments')).default }) },
      { path: 'media', lazy: async () => ({ Component: (await import('../pages/Media')).default }) },
      { path: 'settings', lazy: async () => ({ Component: (await import('../pages/Settings')).default }) },
    ],
  },
  { path: '/login', lazy: async () => ({ Component: (await import('../pages/Login')).default }) },
])
