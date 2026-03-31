'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { shortAddress } from '@/app/lib/format'
import { writeStoredOperator } from '@/app/lib/storage'

function WalletConnectInner() {
  const { login, logout, authenticated, ready } = usePrivy()
  const { wallets } = useWallets()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const wallet = wallets[0]
  const address = wallet?.address

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!address) {
      return
    }

    writeStoredOperator(address)
  }, [address])

  if (!ready) {
    return (
      <div className="h-8 w-32 animate-pulse rounded-full border border-white/[0.08] bg-white/[0.04]" />
    )
  }

  if (!authenticated || !address) {
    return (
      <button
        onClick={login}
        className="flex items-center gap-2 rounded-full bg-[#ff9f95] px-4 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-[#1a0f11] transition-opacity hover:opacity-90"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12V7H5a2 2 0 010-4h14v4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 5v14a2 2 0 002 2h16v-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 12a2 2 0 000 4h4v-4h-4z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Connect Wallet
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-full border border-[#7ad8b833] bg-[#7ad8b80d] px-3.5 py-1.5 transition-colors hover:border-[#7ad8b855] hover:bg-[#7ad8b814]"
      >
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#7ad8b8]" />
        <span className="font-mono text-[12px] text-[#7ad8b8]">
          {shortAddress(address)}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`text-[#7ad8b8]/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M2 3.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#ff7c6f18] bg-[#0f080a] shadow-2xl"
          >
            <div className="border-b border-[#ff7c6f12] px-4 py-3">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white/25">
                Connected
              </p>
              <p className="break-all font-mono text-[13px] text-[#ff9f95]">
                {address}
              </p>
            </div>

            <div className="p-2">
              <Link
                href="/control"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-mono text-[13px] text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect
                    x="1"
                    y="1"
                    width="5"
                    height="5"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <rect
                    x="8"
                    y="1"
                    width="5"
                    height="5"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <rect
                    x="1"
                    y="8"
                    width="5"
                    height="5"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <rect
                    x="8"
                    y="8"
                    width="5"
                    height="5"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
                Manage Agents
              </Link>

              <button
                onClick={() => {
                  logout()
                  setOpen(false)
                  writeStoredOperator('')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-mono text-[13px] text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M9 1H12a1 1 0 011 1v10a1 1 0 01-1 1H9"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5.5 9.5L2 7l3.5-2.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 7h8"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function WalletConnect() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return null
  }

  return <WalletConnectInner />
}
