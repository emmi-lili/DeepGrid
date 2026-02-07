# DeepGrid Architecture

## Core Modules (Move)

### 1. Vault (`vault.move`)
- Shared object holding base + quote coin balances
- Issues share tokens proportional to deposit value
- Tracks total shares for pro-rata withdrawals

### 2. GRID Token (`grid_token.move`)
- Standard Sui Coin type with TreasuryCap
- Used for emission rewards and buyback mechanics

### 3. Incentive Engine (`incentive.move`)
- Reward-per-share accumulator pattern
- Dynamic fields keyed by depositor address for reward debt tracking
- Accrues on every rebalance/settle proportional to shares

### 4. MockDeepBook (`mock_deepbook.move`)
- Simulates CLOB order placement and matching
- Order objects with side, price, size
- `simulate_trade()` moves price and creates fills
- Same interface planned for real DeepBook integration

### 5. Strategy (`strategy.move`)
- StrategyConfig: spread_bps, order_size, range_width
- `rebalance()` reads oracle price, places orders via MockDeepBook
- Deterministic for demo reproducibility

### 6. Fee Splitter + Buyback (`buyback.move`)
- Splits realized spread yield: LP portion + buyback portion
- TokenMarket: fixed-price GRID/USDC market for buyback
- Buyback flow: burn 50%, redistribute 50%

## Transaction Flow

```
User Deposit (PTB)
  └─▶ vault::deposit(coin_a, coin_b)
       ├─▶ Mint shares
       └─▶ Update reward debt

Keeper Rebalance (PTB)
  └─▶ strategy::rebalance(vault, config, oracle, book)
       ├─▶ Cancel stale orders
       ├─▶ Place bid @ mid - spread
       ├─▶ Place ask @ mid + spread
       └─▶ incentive::accrue_rewards(vault)

Simulate Trade
  └─▶ mock_deepbook::simulate_trade(book, mid_move)
       └─▶ Create Fill events

Settle
  └─▶ strategy::settle_fills(vault, book)
       ├─▶ Credit spread yield to vault
       └─▶ fee_splitter::split(yield)
            ├─▶ LP portion → vault balances
            └─▶ Buyback portion → buyback::execute()
                 ├─▶ Buy GRID from TokenMarket
                 ├─▶ Burn 50%
                 └─▶ Send 50% to reward pool

User Claim
  └─▶ incentive::claim_rewards(vault, user)
       └─▶ Transfer GRID to user
```
