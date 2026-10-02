import { useCallback, useEffect, useRef, useState } from 'react'

import { readLocalDraft, removeLocalDraft, writeLocalDraft, type LocalDraft } from '../lib/local-draft'

export function useDraftBackup<T>(key: string) {
  const [recovery, setRecovery] = useState<LocalDraft<T> | null>(() => readLocalDraft<T>(key))
  const [error, setError] = useState('')
  const pending = useRef<T | null>(null)
  const baseUpdatedAt = useRef<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const flush = useCallback(() => {
    if (pending.current === null) return
    const value = pending.current
    pending.current = null
    if (!writeLocalDraft(key, value, baseUpdatedAt.current)) setError('本地草稿未能保存，请手动保存到服务器。')
    else setError('')
  }, [key])

  useEffect(() => {
    window.addEventListener('beforeunload', flush)
    return () => { window.removeEventListener('beforeunload', flush); window.clearTimeout(timer.current); flush() }
  }, [flush])

  const queue = useCallback((value: T) => {
    pending.current = value
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, 500)
  }, [flush])

  const clear = useCallback(() => {
    window.clearTimeout(timer.current)
    pending.current = null
    if (!removeLocalDraft(key)) setError('无法清除本地草稿，请检查浏览器存储。')
    else setError('')
    setRecovery(null)
  }, [key])

  const setBaseUpdatedAt = useCallback((value: string | null) => { baseUpdatedAt.current = value }, [])
  const dismissRecovery = useCallback(() => setRecovery(null), [])

  return { recovery, error, queue, clear, dismissRecovery, setBaseUpdatedAt }
}
