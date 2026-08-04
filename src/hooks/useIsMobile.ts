import { useCallback, useSyncExternalStore } from 'react'

// Subscribing to a browser API is what useSyncExternalStore is for. The
// previous version seeded state from window.innerWidth and then re-synced it
// with a setState in the effect body — which renders twice on mount and can
// briefly report the wrong layout, since innerWidth and the media query do not
// always agree (scrollbar width). Reading the query as the snapshot means there
// is one source of truth and no catch-up render. It also keeps working when
// `breakpoint` changes, which a lazy useState initializer would not.
export function useIsMobile(breakpoint = 768): boolean {
  const query = `(max-width: ${breakpoint - 1}px)`

  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot)
}
