import EmojiPicker, { EmojiStyle, Theme, type PickerProps } from 'emoji-picker-react'
import zhJSON from 'emoji-picker-react/dist/data/emojis-zh.json?raw'
import { useAdminTheme } from '../theme/AdminTheme'

// 使用库内 JSON，避开其语言包 TS 源码与严格类型导入规则的冲突。
const zh: NonNullable<PickerProps['emojiData']> = JSON.parse(zhJSON)

export default function EmojiPickerPanel({ onSelect }: { onSelect: (emoji: string) => void }) {
  const { dark } = useAdminTheme()
  return <EmojiPicker
    emojiData={zh}
    emojiStyle={EmojiStyle.NATIVE}
    theme={dark ? Theme.DARK : Theme.LIGHT}
    width="min(350px, calc(100vw - 48px))"
    height={380}
    searchPlaceholder="搜索表情"
    previewConfig={{ showPreview: false }}
    onEmojiClick={({ emoji }) => onSelect(emoji)}
  />
}
