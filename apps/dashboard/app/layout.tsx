import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AgentPay Dashboard',
  description: 'Monitor and manage your AI agent wallets',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
