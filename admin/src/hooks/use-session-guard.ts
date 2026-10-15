import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { currentUser } from '../api/auth'

// 接口鉴权会立即拒绝旧会话；轮询让停留中的页面也能及时退出。
export function useSessionGuard() {
  const navigate = useNavigate()
  useEffect(() => {
    let disposed = false
    let pending = false
    async function check() {
      if (disposed || pending || document.hidden) return
      pending = true
      try {
        const user = await currentUser()
        if (!disposed && !user) {
          void navigate('/login', { replace: true, state: { sessionExpired: true } })
        }
      } catch { /* 网络故障不等于会话失效，等待下次检查。 */ }
      finally { pending = false }
    }
    void check()
    const timer = window.setInterval(check, 15_000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      disposed = true
      window.clearInterval(timer)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [navigate])
}
