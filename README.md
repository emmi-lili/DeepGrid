# DeepGrid

**Token-incentivized automated liquidity vaults for DeepBook on Sui.**

> Persistent CLOB liquidity powered by the GRID token flywheel — real yield from market-making spreads, buyback-and-burn, and emission rewards that keep vaults running.

---

## Problem

Decentralized CLOBs like DeepBook on Sui offer superior price discovery, but suffer from **thin liquidity**:

1. **No incentive to stay** — passive LPs lose to adverse selection with no compensation beyond raw spread.
2. **High operational cost** — running MM strategies requires infrastructure, gas, and constant monitoring.
3. **Cold-start failure** — new pairs get no liquidity because there's no reward for being first.

Result: wide spreads, poor fills, traders leave, LPs leave — a death spiral.

## Solution: DeepGrid

DeepGrid combines **automated liquidity vaults** with a **token incentive flywheel**:

| Component | What it does |
|-----------|-------------|
| **Vault** | Accepts deposits, runs automated narrow-range market-making on DeepBook CLOB |
| **Strategy Engine** | Places bid/ask around mid-price, captures spread as yield |
| **GRID Token** | Emitted to LPs proportional to their share — incentivizes persistent liquidity |
| **Buyback Engine** | Portion of spread yield buys GRID from market, then burns/redistributes |

**The flywheel: Deposits → Spread Yield → Buyback GRID → Rewards → More Deposits.**

The novel insight: existing vaults can place orders, but **nobody uses them without incentives**. Our token engine + buyback makes liquidity **persistent and sustainable**.

## Why Sui?

| Sui Feature | How DeepGrid Uses It |
|-------------|---------------------|
| **Object Model** | Each order, vault, and share is a first-class object with clear ownership |
| **Shared Objects** | Vault and orderbook are shared objects enabling concurrent access |
| **Low Latency (~400ms)** | Enables near-real-time rebalancing for tight spreads |
| **Programmable TX Blocks** | Batch deposit + rebalance + claim in a single atomic tx |
| **DeepBook (Native CLOB)** | Purpose-built on-chain orderbook — no off-chain matching needed |
| **Move Language** | Linear type system prevents double-spend of coins/shares |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DeepGrid Protocol                     │
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
│   └── sources/
│       ├── vault.move          # Vault shared object (deposit/withdraw/shares)
│       ├── grid_token.move     # GRID coin type (OTW, mint/burn)
│       ├── incentive.move      # Reward-per-share emission engine
│       ├── mock_deepbook.move  # Simulated CLOB orderbook
│       ├── strategy.move       # Rebalance + settle logic
│       └── buyback.move        # Fee split + buyback-and-burn
├── app/                # Next.js frontend
│   └── src/
│       ├── app/        # Pages: home, vault, incentives, demo
│       ├── components/ # Navbar, Card, StatBox
│       ├── providers/  # Sui dapp-kit provider
│       └── lib/        # Constants, deployed addresses
├── scripts/            # TypeScript deploy & demo scripts
│   └── src/
│       ├── config.ts   # Network config, Sui client helpers
│       ├── setup.ts    # Deploy + initialize all objects
│       └── demo.ts     # Full flywheel demo sequence
├── docs/               # Architecture, pitch, demo checklist
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

### Run Demo (Localnet)

```bash
# Terminal 1: Start localnet
sui start --with-faucet

# Terminal 2: Deploy and run demo
NETWORK=localnet pnpm demo:setup
NETWORK=localnet pnpm demo:run
```

### Run UI

```bash
pnpm dev
# Open http://localhost:3000
```

## Demo Flow

The `demo:run` script executes this deterministic sequence:

1. **Deposit** — 5 SUI each (base + quote) into vault → receive VaultShare
2. **Rebalance** — Keeper places bid/ask orders around mid-price on MockDeepBook
3. **Accrue Rewards** — Mint 100 GRID, update reward-per-share accumulator
4. **Simulate Trade** — Price moves up → ask orders fill → spread yield earned
5. **Settle** — Filled orders credited to vault, spread recorded as fees
6. **Buyback** — Fee split (60% LP / 40% buyback) → buy GRID → 50% burn, 50% rewards
7. **Claim** — User claims GRID rewards proportional to their shares

Each step emits on-chain events and prints tx digests.

## Move Modules

| Module | Key Functions |
|--------|--------------|
| `vault` | `create_vault()`, `deposit()`, `withdraw()` |
| `grid_token` | `mint()`, `burn()`, `total_supply()` |
| `incentive` | `accrue_rewards()`, `claim_rewards()`, `pending_rewards()` |
| `mock_deepbook` | `place_order()`, `cancel_all()`, `simulate_trade()` |
| `strategy` | `rebalance()`, `settle_fills()` |
| `buyback` | `create_token_market()`, `buy_grid()`, `execute_buyback()` |

## Roadmap

- [ ] Integrate real DeepBook v2/v3 API (replace MockDeepBook)
- [ ] Multi-pair vault support
- [ ] Governance: on-chain voting for strategy parameters
- [ ] Auto-compounding: reinvest GRID rewards
- [ ] zkLogin for gasless onboarding
- [ ] Mainnet deployment with real token economics

## License

MIT
