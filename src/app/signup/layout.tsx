import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a free Festora account to discover and attend campus events, buy tickets instantly, and manage your registrations.',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
