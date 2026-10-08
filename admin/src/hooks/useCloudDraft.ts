import { useEffect, useRef, useState } from 'react'
import { getDraft, putDraft, removeDraft, type Draft } from '../api/writing'
import type { PostInput } from '../types/content'

export function useCloudDraft(key: string) {
  const version = useRef(0)
  const ready = useRef(false)
  const pending = useRef<PostInput | null>(null)
  const task = useRef<Promise<void> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [recovery, setRecovery] = useState<Draft | null>(null)
  const [status, setStatus] = useState('正在读取云端草稿…')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void getDraft(key).then(draft => {
      if (!active) return
      version.current = draft.version
      ready.current = draft.version === 0
      setRecovery(draft.version ? draft : null)
      if (!draft.version && pending.current) timer.current = setTimeout(() => { void flush().catch(() => {}) }, 1500)
      setStatus(draft.version ? '发现云端草稿，请选择恢复或丢弃' : '云端自动保存已就绪')
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '云端草稿读取失败，请刷新重试') })
    return () => { active = false; ready.current = false; clearTimeout(timer.current) }
  }, [key])

  async function flush(): Promise<void> {
    clearTimeout(timer.current)
    if (task.current) { await task.current; return flush() }
    if (!pending.current) return
    if (!ready.current) throw new Error('请先处理云端草稿提示或刷新页面')
    const input = pending.current
    pending.current = null
    setStatus('正在保存到云端…')
    const saving = putDraft(key, version.current, input).then(result => {
      version.current = result.version
      setStatus(`云端已保存 ${new Date(result.updatedAt).toLocaleTimeString('zh-CN')}`)
      setError('')
    }).catch(cause => {
      pending.current ??= input
      ready.current = false
      const text = cause instanceof Error ? cause.message : '云端保存失败'
      setError(text + '。本地备份仍保留，请刷新后恢复。')
      throw cause
    }).finally(() => { task.current = null })
    task.current = saving
    await saving
    if (pending.current) await flush()
  }
  function queue(input: PostInput) {
    pending.current = input
    clearTimeout(timer.current)
    if (ready.current) timer.current = setTimeout(() => { void flush().catch(() => {}) }, 1500)
  }
  function accept() { ready.current = true; setRecovery(null); setStatus('已恢复云端草稿，尚未发布') }
  async function discard() {
    if (version.current) await removeDraft(key, version.current)
    version.current = 0; ready.current = true; setRecovery(null); setStatus('云端自动保存已就绪')
  }
  async function clear() { await flush(); await discard(); pending.current = null; clearTimeout(timer.current) }
  return { recovery, status, error, queue, flush, accept, discard, clear }
}
