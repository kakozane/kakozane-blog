export type LocalDraft<T> = { version: 1; savedAt: number; baseUpdatedAt: string | null; value: T }

export function readLocalDraft<T>(key: string): LocalDraft<T> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const draft: unknown = JSON.parse(raw)
    if (!draft || typeof draft !== 'object' || !('version' in draft) || draft.version !== 1 ||
      !('savedAt' in draft) || typeof draft.savedAt !== 'number' || !Number.isFinite(draft.savedAt) ||
      !('baseUpdatedAt' in draft) || (draft.baseUpdatedAt !== null && typeof draft.baseUpdatedAt !== 'string') ||
      !('value' in draft) || !draft.value || typeof draft.value !== 'object' || Array.isArray(draft.value)) return null
    return draft as LocalDraft<T>
  } catch { return null }
}

export function writeLocalDraft<T>(key: string, value: T, baseUpdatedAt: string | null): boolean {
  try {
    // ponytail: 同一篇内容跨标签页编辑时最后一次本地写入胜出；需要并发编辑时再加冲突检测。
    localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now(), baseUpdatedAt, value }))
    return true
  } catch { return false }
}

export function removeLocalDraft(key: string): boolean {
  try { localStorage.removeItem(key); return true }
  catch { return false }
}
