'use client'

import { useEffect } from 'react'
import { isAddress } from 'viem'
import { useWallets } from '@privy-io/react-auth'
import { writeStoredOperator } from '@/app/lib/storage'

interface WalletSyncProps {
  onAddress: (address: string) => void
}

function WalletSyncInner({ onAddress }: WalletSyncProps) {
  const { wallets } = useWallets()

  useEffect(() => {
    const address = wallets[0]?.address

    if (!address || !isAddress(address)) {
      return
    }

    writeStoredOperator(address)
    onAddress(address)
  }, [wallets, onAddress])

  return null
}

export default function WalletSync({ onAddress }: WalletSyncProps) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return null
  }

  return <WalletSyncInner onAddress={onAddress} />
}
