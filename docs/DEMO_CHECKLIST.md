# DeepGrid Demo Checklist

## Pre-Demo Setup

- [ ] Sui CLI installed (`sui --version`)
- [ ] Node.js 18+ and pnpm installed
- [ ] Terminal 1: `sui start --with-faucet` (localnet running)
- [ ] Terminal 2: `pnpm install` in repo root
- [ ] Run `NETWORK=localnet pnpm demo:setup` — note the deployed object IDs
- [ ] (Optional) Update `app/src/lib/deployed.ts` with actual IDs for UI demo
- [ ] Run `pnpm dev` to start the UI

## During Demo (2 minutes)

### Screen 1: Landing Page (30s)
- [ ] Show problem/solution section
- [ ] Show flywheel diagram
- [ ] Show "Why Sui" section

### Screen 2: Demo CLI (30s)
- [ ] Show terminal running `NETWORK=localnet pnpm demo:run`
- [ ] Point out: deposit → rebalance → trade → settle → buyback → claim
- [ ] Highlight tx digests and event output

### Screen 3: Vault Page (30s)
- [ ] Connect wallet (Sui Wallet extension)
- [ ] Show vault state: base/quote balance, total shares
- [ ] Deposit SUI — show VaultShare created
- [ ] Show updated vault balances

### Screen 4: Incentives Page (30s)
- [ ] Show GRID token balance
- [ ] Show pending rewards on VaultShares
- [ ] Click "Claim" — show GRID tokens received
- [ ] Click "Load Events" — show buyback events

## Key Talking Points

1. "The vault automates market-making on DeepBook's CLOB"
2. "GRID token incentives make providing liquidity sustainable"
3. "Buyback-and-burn creates real token demand from protocol revenue"
4. "Everything runs on Sui — objects, shared state, programmable TXs"
5. "This is MVP — ready to integrate real DeepBook in production"

## Post-Demo

- Show the architecture diagram on Demo page
- Mention: "MockDeepBook has the same interface as real DeepBook"
- Mention: "Strategy config is on-chain and governance-upgradeable"
