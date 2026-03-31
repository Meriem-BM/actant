import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@actant/sdk', '@agentpay/shared'],
}

export default nextConfig
