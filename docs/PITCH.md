# DeepGrid — Pitch

## One-Liner

**DeepGrid: Token-incentivized liquidity vaults that make DeepBook's CLOB actually usable.**

## Elevator Pitch (30 seconds)

DEXs on Sui have a liquidity problem — CLOBs like DeepBook need active market makers, but there's no incentive for passive LPs to provide persistent liquidity. DeepGrid solves this with automated vaults that place tight bid/ask orders on DeepBook, plus a GRID token flywheel: LPs earn real yield from spreads, a portion of which buys back GRID from the market. 50% is burned, 50% redistributed. This creates a self-reinforcing cycle where providing liquidity is actually profitable and sustainable.

## What Makes This Different

1. **Real Yield, Not Inflation** — Revenue comes from market-making spreads, not just token printing.
2. **Buyback = Sustainable Tokenomics** — GRID demand is backed by protocol revenue.
3. **Sui-Native** — Uses Sui's object model for orders, shared objects for vaults, and programmable TXs for atomic operations.
4. **Composable** — Vault shares are Sui objects that can be used as collateral, staked, or traded.

## Target Market

- DeFi protocols on Sui that need bootstrapped liquidity
- Passive LPs who want yield without running infrastructure
- Token projects that want deep orderbook liquidity for their pairs

## Technical Innovation

- **On-chain strategy config** — parameters stored as Sui objects, upgradeable by governance
- **Order objects** — each order is a first-class Sui object with clear lifecycle
- **Programmable TX batching** — deposit + rebalance + claim in one atomic transaction
- **Reward-per-share accumulator** — gas-efficient O(1) reward distribution

## Demo Flow (2 minutes)

1. Show landing page — explain problem and flywheel (30s)
2. Deposit into vault — show VaultShare created (20s)
3. Run rebalance — show orders placed on MockDeepBook (20s)
4. Simulate trade — show fills and spread yield (15s)
5. Run buyback — show GRID purchased, burned, and distributed (20s)
6. Claim rewards — show GRID in wallet (15s)

## Competitive Landscape

| Feature | DeepGrid | Generic Vault | CEX MM |
|---------|----------|---------------|--------|
| On-chain | Yes | Partial | No |
| Incentivized | GRID flywheel | None | Rebates |
| Passive LP | Yes | Yes | No |
| Composable | Sui objects | Limited | No |
| Sustainable | Real yield | Depends | Yes |
