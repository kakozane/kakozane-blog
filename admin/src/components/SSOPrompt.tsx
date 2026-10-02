import { Alert, Button, Space } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { ssoCandidate, ssoLogin } from '../api/sso'
import type { SSOCandidate } from '../types/sso'

export function SSOPrompt() {
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState<SSOCandidate | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let controller: AbortController
    function refresh() {
      controller?.abort()
      controller = new AbortController()
      const signal = controller.signal
      void ssoCandidate(signal).then((value) => { if (!signal.aborted) setCandidate(value) })
        .catch(() => { if (!signal.aborted) setCandidate(null) })
    }
    refresh()
    window.addEventListener('focus', refresh)
    return () => { controller.abort(); window.removeEventListener('focus', refresh) }
  }, [])

  async function confirm() {
    if (!candidate) return
    setPending(true)
    setError('')
    try {
      await ssoLogin(candidate)
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '单点登录失败')
    } finally { setPending(false) }
  }

  if (!candidate) return null
  return <Space className="admin-sso-prompt" orientation="vertical" size="middle">
    <Alert showIcon type={candidate.canLogin ? 'info' : 'warning'} message={`您已登录前台（${candidate.user.displayName}）`}
      description={candidate.canLogin ? '是否使用此账号登录管理后台？也可以在下方使用其他账号。' : '该账号没有后台权限，请使用管理员账号登录。'} />
    {candidate.canLogin && <Button block loading={pending} onClick={() => void confirm()}>使用此账号登录后台</Button>}
    {error && <Alert role="alert" message={error} type="error" showIcon />}
  </Space>
}
