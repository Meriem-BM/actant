/**
 * Agent tools — capabilities the autonomous agent can invoke.
 * Framework-agnostic: works with LangChain, CrewAI, or plain function calls.
 */

export interface ToolResult<T = unknown> {
  tool:      string
  success:   boolean
  data?:     T
  error?:    string
  latencyMs: number
}

// ─── CoinGecko (free, no API key) ─────────────────────────────────────────────

export interface TokenPrice {
  symbol:         string
  usd:            number
  usd_24h_change: number
  usd_market_cap: number
}

const COINGECKO_IDS: Record<string, string> = {
  ETH:  'ethereum',
  BTC:  'bitcoin',
  USDC: 'usd-coin',
  LINK: 'chainlink',
  UNI:  'uniswap',
  AAVE: 'aave',
  OP:   'optimism',
}

export async function getTokenPrice(symbol: string): Promise<ToolResult<TokenPrice>> {
  const start  = Date.now()
  const coinId = COINGECKO_IDS[symbol.toUpperCase()] ?? symbol.toLowerCase()

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
    )
    if (!res.ok) return { tool: 'get_token_price', success: false, error: `CoinGecko ${res.status}`, latencyMs: Date.now() - start }

    const json = await res.json() as Record<string, { usd: number; usd_24h_change: number; usd_market_cap: number }>
    const data = json[coinId]
    if (!data) return { tool: 'get_token_price', success: false, error: `Unknown token: ${symbol}`, latencyMs: Date.now() - start }

    return { tool: 'get_token_price', success: true, data: { symbol: symbol.toUpperCase(), ...data }, latencyMs: Date.now() - start }
  } catch (err) {
    return { tool: 'get_token_price', success: false, error: String(err), latencyMs: Date.now() - start }
  }
}

// ─── DeFiLlama (free, no API key) ─────────────────────────────────────────────

export interface ProtocolTVL {
  name:     string
  tvl:      number
  change1d: number
  change7d: number
  chain:    string
}

export async function getProtocolTVL(protocol: string): Promise<ToolResult<ProtocolTVL>> {
  const start = Date.now()

  try {
    const res = await fetch(`https://api.llama.fi/protocol/${protocol.toLowerCase()}`)
    if (!res.ok) return { tool: 'get_protocol_tvl', success: false, error: `DeFiLlama ${res.status}`, latencyMs: Date.now() - start }

    const json = await res.json() as { name: string; tvl: number; change_1d: number; change_7d: number; chain: string }
    return {
      tool: 'get_protocol_tvl',
      success: true,
      data: { name: json.name, tvl: json.tvl, change1d: json.change_1d, change7d: json.change_7d, chain: json.chain },
      latencyMs: Date.now() - start,
    }
  } catch (err) {
    return { tool: 'get_protocol_tvl', success: false, error: String(err), latencyMs: Date.now() - start }
  }
}

// ─── Market signal analysis ────────────────────────────────────────────────────

export interface MarketSignal {
  symbol:          string
  price:           number
  signal:          'bullish' | 'bearish' | 'neutral'
  confidence:      number  // 0–1
  reason:          string
  suggestedAction?: string
}

export function analyzeMarketSignal(price: TokenPrice): MarketSignal {
  const change = price.usd_24h_change

  if (change > 5)  return { symbol: price.symbol, price: price.usd, signal: 'bullish', confidence: Math.min(0.9, 0.5 + change / 40), reason: `${price.symbol} up ${change.toFixed(2)}% in 24h — strong momentum`, suggestedAction: `Monitor for entry at $${price.usd.toFixed(2)}` }
  if (change > 2)  return { symbol: price.symbol, price: price.usd, signal: 'bullish', confidence: 0.6, reason: `${price.symbol} up ${change.toFixed(2)}% in 24h — mild bullish` }
  if (change < -5) return { symbol: price.symbol, price: price.usd, signal: 'bearish', confidence: Math.min(0.9, 0.5 + Math.abs(change) / 40), reason: `${price.symbol} down ${Math.abs(change).toFixed(2)}% in 24h — significant drawdown`, suggestedAction: `Check exposure at $${price.usd.toFixed(2)}` }
  if (change < -2) return { symbol: price.symbol, price: price.usd, signal: 'bearish', confidence: 0.6, reason: `${price.symbol} down ${Math.abs(change).toFixed(2)}% in 24h — mild bearish` }
  return { symbol: price.symbol, price: price.usd, signal: 'neutral', confidence: 0.5, reason: `${price.symbol} flat (${change.toFixed(2)}% 24h)` }
}
