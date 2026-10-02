import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { RouterProvider } from 'react-router'

import { router } from './router'

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6, fontSize: 14, colorBgLayout: '#f5f5f5' } }}>
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}
