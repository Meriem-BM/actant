'use client'

import { useCallback, useEffect, useState } from 'react'
import { readStoredOperator, writeStoredOperator } from '@/app/lib/storage'

export function useOperatorAddress() {
  const [operatorAddress, setOperatorAddressState] = useState<string>('')

  useEffect(() => {
    const stored = readStoredOperator()
    if (stored) {
      setOperatorAddressState(stored)
    }
  }, [])

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
