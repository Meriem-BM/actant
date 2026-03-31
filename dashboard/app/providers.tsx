'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { baseSepolia, base } from 'viem/chains'

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!appId) {
    return <>{children}</>
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['wallet', 'email'],
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia, base],
        appearance: {
          theme: 'dark',
          accentColor: '#ff9f95',
          showWalletLoginFirst: true,
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
