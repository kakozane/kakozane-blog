import { Button } from '@/components/tiptap-ui-primitive/button'
import { MoonStarIcon } from '@/components/tiptap-icons/moon-star-icon'
import { SunIcon } from '@/components/tiptap-icons/sun-icon'
import { useAdminTheme } from '@/theme/AdminTheme'

export function ThemeToggle() {
  const { dark, toggle } = useAdminTheme()
  return <Button onClick={toggle} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} variant="ghost">
    {dark ? <MoonStarIcon className="tiptap-button-icon" /> : <SunIcon className="tiptap-button-icon" />}
  </Button>
}
