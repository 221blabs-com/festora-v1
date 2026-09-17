import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Festora account to access your tickets, manage events, and discover campus experiences.',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
