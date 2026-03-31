interface ShortAddressOptions {
  prefix?: number
  suffix?: number
}

export function shortAddress(
  address: string,
  options: ShortAddressOptions = {},
): string {
  const { prefix = 6, suffix = 4 } = options

  if (!address) {
    return ''
  }

  if (address.length <= prefix + suffix + 1) {
    return address
  }

  return `${address.slice(0, prefix)}…${address.slice(-suffix)}`
}

export function toNumber(value: string | number, fallback = 0): number {
  const parsed =
    typeof value === 'number' ? value : Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

export function formatUsd(value: string | number, fractionDigits = 2): string {
  return `$${toNumber(value).toFixed(fractionDigits)}`
}
