'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    // Also reset Lenis scroll if available
    const lenisInstance = (window as any).__lenis
    if (lenisInstance) {
      lenisInstance.scrollTo(0, { immediate: true })
    }
  }, [pathname])

  return null
}
