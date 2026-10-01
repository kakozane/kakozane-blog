import { createBrowserRouter, redirect } from 'react-router'

import { currentUser } from '../api/auth'
import Dashboard from '../pages/Dashboard'
import Login from '../pages/Login'

export const router = createBrowserRouter([
  {
    path: '/',
    loader: async () => {
      const user = await currentUser()
      return user ?? redirect('/login')
    },
    element: <Dashboard />,
  },
  { path: '/login', element: <Login /> },
])
