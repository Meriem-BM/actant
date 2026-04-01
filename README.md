# Actant

Actant is a monorepo for building and running autonomous payment agents on Base using:
- `ERC-4337` account abstraction
- `ERC-8004` agent identity/reputation flows
- a Next.js dashboard for control and monitoring
- a TypeScript SDK for wallet + payment orchestration

## Monorepo Layout

```text
.
├── dashboard/            # Next.js app (UI + API route demo flow)
├── packages/
│   ├── contracts/        # Solidity contracts + Foundry deployment/testing
│   ├── sdk/              # @actant/sdk
│   └── shared/           # @actant/shared shared types/constants
├── package.json          # workspace scripts
└── turbo.json            # Turborepo task graph
```

## Prerequisites

- `bun` (repo is configured with `packageManager: bun@1.1.38`)
- `Node.js` 20+
- `Foundry` (only if you need to build/test/deploy contracts)

## Quick Start

1. Install dependencies:

```bash
bun install
```

2. Configure dashboard environment:

```bash
cp dashboard/.env.example dashboard/.env.local
```

3. Start all workspace dev tasks:

```bash
bun run dev
```

The dashboard runs on `http://localhost:3001`.

## Environment Setup

### Dashboard (`dashboard/.env.local`)

Use `dashboard/.env.example` as the source of truth. Important values:
- `NEXT_PUBLIC_PRIVY_APP_ID`
- RPC URLs (`BASE_SEPOLIA_RPC_URL`, `BASE_MAINNET_RPC_URL`, `NEXT_PUBLIC_RPC_URL`)
- deployed contract addresses (`REGISTRY_ADDRESS`, `FACTORY_ADDRESS`, and `NEXT_PUBLIC_*` mirrors)
- optional bundler URL (`NEXT_PUBLIC_BUNDLER_URL`)

### Contracts (`packages/contracts/.env`)

Use `packages/contracts/.env.example`:
- `BASE_SEPOLIA_RPC_URL`
- `BASE_MAINNET_RPC_URL`
- `ETHERSCAN_API_KEY`

Set `PRIVATE_KEY` when running deployment targets.

## Workspace Commands

From repo root:

```bash
bun run dev       # turbo dev
bun run build     # turbo build
bun run lint      # turbo lint
bun run format    # prettier
```

## Package-Level Commands

### Dashboard

```bash
cd dashboard
bun run dev
bun run build
bun run lint
```

### SDK

```bash
cd packages/sdk
bun run build
```

### Shared

```bash
cd packages/shared
bun run build
```

### Contracts (Foundry)

```bash
cd packages/contracts
make build
make test
make deploy-local
make deploy-sepolia
make deploy-mainnet
```

`make deploy-*` uses `script/Deploy.s.sol` and writes deployment output to `packages/contracts/deployment.env`.

## Key Packages

- `@actant/sdk`: Agent wallet lifecycle, payment execution, x402 retry flow, bundler helpers.
- `@actant/shared`: cross-package type and chain constant definitions.
- `@actant/dashboard`: operator-facing UI for creating/running/monitoring agents.

## Notes

- The demo runs from the dashboard with the currently connected wallet.
- If `NEXT_PUBLIC_BUNDLER_URL` is omitted, wallet payment calls can fall back to direct contract execution paths depending on flow.
