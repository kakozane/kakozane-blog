import { useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

export function useUnsavedChanges(dirty: boolean) {
  const allowLeave = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useBeforeUnload((event) => {
    if (!dirty || allowLeave.current) return
    event.preventDefault()
    event.returnValue = ''
  })
  return { blocker, markSaved: () => { allowLeave.current = true } }
}
