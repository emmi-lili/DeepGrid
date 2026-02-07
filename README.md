# DeepGrid

**Token-incentivized automated liquidity vaults for DeepBook on Sui.**

> Persistent CLOB liquidity powered by GRID token flywheel — real yield from spreads, buyback-and-burn, and emission rewards that keep vaults running.

---

## Problem

Decentralized CLOBs like DeepBook on Sui offer superior price discovery, but suffer from **thin liquidity**:

1. **No incentive to stay** — passive LPs lose to adverse selection with no compensation beyond raw spread.
2. **High operational cost** — running market-making strategies requires infrastructure, gas, and constant monitoring.
3. **Cold-start failure** — new pairs get no liquidity because there's no reward for being first.

Result: wide spreads, poor fills, traders leave, liquidity providers leave — a death spiral.

## Solution: DeepGrid

DeepGrid combines **automated liquidity vaults** with a **token incentive flywheel**:

| Component | What it does |
|-----------|-------------|
| **Vault** | Accepts deposits, runs automated narrow-range market-making on DeepBook CLOB |
| **Strategy Engine** | Places bid/ask around mid-price, captures spread as yield |
| **GRID Token** | Emitted to LPs proportional to their share — incentivizes persistent liquidity |
| **Buyback Engine** | Portion of spread yield buys GRID from market, then burns/redistributes |

The flywheel: **Deposits → Spread Yield → Buyback GRID → Rewards → More Deposits**.

## Why Sui?

| Sui Feature | How DeepGrid Uses It |
|-------------|---------------------|
| **Object Model** | Each order, vault, and config is a first-class object with clear ownership |
| **Shared Objects** | Vault and orderbook are shared objects enabling concurrent access |
| **Low Latency (~400ms)** | Enables near-real-time rebalancing for tight spreads |
| **Programmable Transaction Blocks** | Batch deposit + rebalance + claim in a single atomic tx |
| **DeepBook (Native CLOB)** | Purpose-built on-chain orderbook — no off-chain matching needed |
| **Move Language** | Linear type system prevents double-spend of coins/shares |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      DeepGrid Protocol                   │
│                                                          │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────────┐  │
│  │  Vault   │──▶│  Strategy   │──▶│  MockDeepBook    │  │
│  │ (Shared) │   │  Config     │   │  (CLOB Sim)      │  │
│  │          │◀──│             │◀──│                   │  │
│  └────┬─────┘   └─────────────┘   └──────────────────┘  │
│       │                                                   │
│       │ spread yield                                      │
│       ▼                                                   │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────────┐  │
│  │   Fee    │──▶│  TokenMkt   │──▶│  GRID Token      │  │
│  │ Splitter │   │  (Buyback)  │   │  (Mint/Burn)     │  │
│  └──────────┘   └─────────────┘   └──────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │           Incentive Engine (Rewards)              │    │
│  │  emission per rebalance → pro-rata to LPs         │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Repo Structure

```
deepgrid/
├── contracts/          # Sui Move smart contracts
│   └── sources/        # Move modules (vault, incentive, strategy, mock_deepbook)
├── app/                # Next.js frontend
│   └── src/
├── scripts/            # TypeScript deploy & demo scripts
│   └── src/
├── docs/               # Architecture diagrams & writeup
└── README.md
```

## Quick Start

### Prerequisites

- [Sui CLI](https://docs.sui.io/build/install) (v1.30+)
- Node.js 18+ and pnpm
- (Optional) Sui localnet: `sui start --with-faucet`

### Install

```bash
pnpm install
```

### Build Move Contracts

```bash
pnpm move:build
```

### Run Demo

```bash
# Start localnet in another terminal:
sui start --with-faucet

# Deploy and initialize:
pnpm demo:setup

# Run full demo flow:
pnpm demo:run
```

### Run UI

```bash
pnpm dev
# Open http://localhost:3000
```

## Demo Flow

1. **Deploy** — Publish Move package, create Vault + StrategyConfig + MockDeepBook
2. **Deposit** — User deposits SUI + USDC into vault, receives share tokens
3. **Rebalance** — Keeper calls rebalance(), places orders around mid-price
4. **Trade** — Simulate fills on MockDeepBook
5. **Settle** — Record spread yield in vault, accrue GRID rewards to LPs
6. **Buyback** — Portion of yield buys GRID, 50% burn + 50% to reward pool
7. **Claim** — User claims GRID rewards

## License

MIT
