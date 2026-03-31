export const OPERATOR_STORAGE_KEY = 'actant_operator'

export function readStoredOperator(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  return localStorage.getItem(OPERATOR_STORAGE_KEY) ?? ''
}

export function writeStoredOperator(address: string): void {
  if (typeof window === 'undefined') {
    return
  }

  if (address) {
    localStorage.setItem(OPERATOR_STORAGE_KEY, address)
    return
  }

  localStorage.removeItem(OPERATOR_STORAGE_KEY)
}
