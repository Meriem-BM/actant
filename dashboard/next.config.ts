import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@atactant/sdk', '@atactant/shared'],
}

export default nextConfig
