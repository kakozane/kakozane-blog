import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'

const ThemeContext = createContext({ dark: false, toggle: () => {} })
export const useAdminTheme = () => useContext(ThemeContext)

export function AdminTheme({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('kakozane-admin-theme') === 'dark' } catch { return false }
  })
  const algorithm = dark ? theme.darkAlgorithm : theme.defaultAlgorithm
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : 'light'
    const token = theme.getDesignToken({ algorithm })
    for (const key of ['colorText', 'colorTextSecondary', 'colorBgLayout', 'colorBgContainer', 'colorFillAlter', 'colorBorderSecondary', 'colorPrimary', 'colorPrimaryBg'] as const) {
      root.style.setProperty(`--admin-${key}`, token[key])
    }
    try { localStorage.setItem('kakozane-admin-theme', dark ? 'dark' : 'light') } catch { /* 禁用存储时仍可切换当前页面主题。 */ }
  }, [dark, algorithm])
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark(value => !value) }}>
    <ConfigProvider locale={zhCN} theme={{ algorithm, token: { colorPrimary: '#1677ff', borderRadius: 6, fontSize: 14 } }}>{children}</ConfigProvider>
  </ThemeContext.Provider>
}
