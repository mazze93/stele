import { useEffect, useRef } from 'react'
import type { ThemeId } from '@/data/themes'
import { THEME_MAP } from '@/data/themes'
export function useTheme(themeId: ThemeId) {
  const prevLinkRef = useRef<HTMLLinkElement | null>(null)
  useEffect(() => {
    const theme = THEME_MAP[themeId]; if (!theme) return
    const root = document.documentElement
    for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v)
    if (prevLinkRef.current) { prevLinkRef.current.remove(); prevLinkRef.current = null }
    const link = document.createElement('link')
    link.rel = 'stylesheet'; link.href = theme.fonts.googleUrl
    document.head.appendChild(link); prevLinkRef.current = link
  }, [themeId])
}
