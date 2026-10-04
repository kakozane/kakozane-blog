import { AdminTheme } from './theme/AdminTheme'
import { RouterProvider } from 'react-router'

import { router } from './router'

export default function App() {
  return (
    <AdminTheme>
      <RouterProvider router={router} />
    </AdminTheme>
  )
}
