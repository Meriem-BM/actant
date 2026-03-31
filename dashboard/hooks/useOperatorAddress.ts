'use client'

import { useCallback, useState } from 'react'
import { readStoredOperator, writeStoredOperator } from '@/app/lib/storage'

export function useOperatorAddress() {
  const [operatorAddress, setOperatorAddressState] = useState<string>(() =>
    readStoredOperator(),
  )

  const setOperatorAddress = useCallback((nextAddress: string) => {
    const normalized = nextAddress.trim()
    setOperatorAddressState(normalized)
    writeStoredOperator(normalized)
  }, [])

  return {
    operatorAddress,
    setOperatorAddress,
  }
}
