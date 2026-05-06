import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Net Guard — Табло за сигурност',
  description: 'Net Guard browser extension security dashboard',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="bg">
      <body>{children}</body>
    </html>
  )
}
