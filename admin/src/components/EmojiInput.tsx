import { SmileOutlined } from '@ant-design/icons'
import { Button, Input, Popover, Space, Spin } from 'antd'
import { lazy, Suspense, useRef, useState } from 'react'

const EmojiPickerPanel = lazy(() => import('./EmojiPickerPanel'))

type EmojiInputProps = {
  id?: string
  value?: string
  onChange?: (value: string) => void
}

export function EmojiInput({ id, value, onChange }: EmojiInputProps) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return <Space.Compact style={{ width: '100%' }}>
    <Input id={id} value={value ?? ''} onChange={event => onChange?.(event.target.value)} maxLength={16} placeholder="例如 💻" allowClear />
    <Popover
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      content={<div onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); button.current?.focus() }
      }}><Suspense fallback={<Spin tip="正在加载表情"><div style={{ width: 280, height: 160 }} /></Spin>}>
        <EmojiPickerPanel onSelect={emoji => { onChange?.(emoji); setOpen(false); button.current?.focus() }} />
      </Suspense></div>}
    >
      <Button ref={button} htmlType="button" icon={<SmileOutlined />} aria-expanded={open} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>选表情</Button>
    </Popover>
  </Space.Compact>
}
