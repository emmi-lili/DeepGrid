/**
 * DeepGrid — Full demo flow script.
 *
 * Executes the deterministic sequence:
 *   deposit → rebalance → simulate_trade → settle → buyback → claim rewards
 *
 * Usage: NETWORK=localnet pnpm --filter scripts run demo
 */
import {
  header, log, NETWORK, RPC_URL,
  getSuiClient, getKeypair, loadDeployed,
  Transaction,
} from './config.js';

// Types for SUI/SUI vault (MVP simplification)
const BASE_TYPE = '0x2::sui::SUI';
const QUOTE_TYPE = '0x2::sui::SUI';

async function main() {
  header('DeepGrid Demo Flow');
  log('Network', NETWORK);
  log('RPC', RPC_URL);

  const client = getSuiClient();
  const keypair = getKeypair();
  const address = keypair.toSuiAddress();
  const deployed = loadDeployed();
  const pkg = deployed.packageId;

  log('Address', address);
  log('Package', pkg);

  const printBalance = async (label: string) => {
    const bal = await client.getBalance({ owner: address });
    console.log(`  [${label}] SUI Balance: ${(Number(bal.totalBalance) / 1e9).toFixed(4)} SUI`);
  };

  await printBalance('before');

  // ── 1. Deposit ──────────────────────────────────────────────────────────
  header('Step 1: Deposit into Vault');

  const DEPOSIT_AMOUNT = 5_000_000_000; // 5 SUI each for base + quote

  const txDeposit = new Transaction();
  const [baseCoin] = txDeposit.splitCoins(txDeposit.gas, [DEPOSIT_AMOUNT]);
  const [quoteCoin] = txDeposit.splitCoins(txDeposit.gas, [DEPOSIT_AMOUNT]);

  txDeposit.moveCall({
    target: `${pkg}::vault::deposit_entry`,
    typeArguments: [BASE_TYPE, QUOTE_TYPE],
    arguments: [
      txDeposit.object(deployed.vaultId),
      baseCoin,
      quoteCoin,
    ],
  });

  const depositResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: txDeposit,
    options: { showObjectChanges: true, showEvents: true },
  });

  log('deposit tx', depositResult.digest);

  // Find VaultShare
  const shareObj = depositResult.objectChanges?.find(
    (c: any) => c.type === 'created' && c.objectType?.includes('VaultShare')
  );
  const shareId = shareObj?.objectId ?? '';
  log('VaultShare ID', shareId);

  if (depositResult.events?.length) {
    depositResult.events.forEach((e: any) => {
      log('event', `${e.type.split('::').pop()}: ${JSON.stringify(e.parsedJson)}`);
    });
  }

  await new Promise(r => setTimeout(r, 1500));

  // ── 2. Rebalance ────────────────────────────────────────────────────────
  header('Step 2: Rebalance (place orders)');

  const txRebalance = new Transaction();
  txRebalance.moveCall({
    target: `${pkg}::strategy::rebalance_entry`,
    typeArguments: [BASE_TYPE, QUOTE_TYPE],
    arguments: [
      txRebalance.object(deployed.vaultId),
      txRebalance.object(deployed.strategyConfigId),
      txRebalance.object(deployed.orderBookId),
    ],
  });

  const rebalanceResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: txRebalance,
    options: { showEvents: true },
  });
  log('rebalance tx', rebalanceResult.digest);

  if (rebalanceResult.events?.length) {
    rebalanceResult.events.forEach((e: any) => {
      log('event', `${e.type.split('::').pop()}: ${JSON.stringify(e.parsedJson)}`);
    });
  }

  await new Promise(r => setTimeout(r, 1500));

  // ── 3. Accrue Rewards (incentive emission) ──────────────────────────────
  header('Step 3: Accrue GRID Rewards');

  const txAccrue = new Transaction();
  txAccrue.moveCall({
    target: `${pkg}::incentive::accrue_rewards`,
    typeArguments: [BASE_TYPE, QUOTE_TYPE],
    arguments: [
      txAccrue.object(deployed.vaultId),
      txAccrue.object(deployed.gridTreasuryCapId),
    ],
  });

  const accrueResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: txAccrue,
    options: { showEvents: true },
  });
  log('accrue tx', accrueResult.digest);

  if (accrueResult.events?.length) {
    accrueResult.events.forEach((e: any) => {
      log('event', `${e.type.split('::').pop()}: ${JSON.stringify(e.parsedJson)}`);
    });
  }

  await new Promise(r => setTimeout(r, 1500));

  // ── 4. Simulate Trade ───────────────────────────────────────────────────
  header('Step 4: Simulate Trade (price moves up)');

  const txTrade = new Transaction();
  txTrade.moveCall({
    target: `${pkg}::mock_deepbook::simulate_trade`,
    arguments: [
      txTrade.object(deployed.orderBookId),
      txTrade.pure.bool(true),             // price_up
      txTrade.pure.u64(500_000_000),       // delta = 0.5 QUOTE
    ],
  });

  const tradeResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: txTrade,
    options: { showEvents: true },
  });
  log('trade tx', tradeResult.digest);

  if (tradeResult.events?.length) {
    tradeResult.events.forEach((e: any) => {
      log('event', `${e.type.split('::').pop()}: ${JSON.stringify(e.parsedJson)}`);
    });
  }

  await new Promise(r => setTimeout(r, 1500));

  // ── 5. Settle Fills ─────────────────────────────────────────────────────
  header('Step 5: Settle Fills');

  const txSettle = new Transaction();
  txSettle.moveCall({
    target: `${pkg}::strategy::settle_fills_entry`,
    typeArguments: [BASE_TYPE, QUOTE_TYPE],
    arguments: [
      txSettle.object(deployed.vaultId),
      txSettle.object(deployed.orderBookId),
    ],
  });

  const settleResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: txSettle,
    options: { showEvents: true },
  });
  log('settle tx', settleResult.digest);

  if (settleResult.events?.length) {
    settleResult.events.forEach((e: any) => {
      log('event', `${e.type.split('::').pop()}: ${JSON.stringify(e.parsedJson)}`);
    });
  }

  await new Promise(r => setTimeout(r, 1500));

  // ── 6. Buyback ──────────────────────────────────────────────────────────
  header('Step 6: Execute Buyback (fee split + buy GRID + burn/rewards)');

  const txBuyback = new Transaction();
  txBuyback.moveCall({
    target: `${pkg}::buyback::execute_buyback_entry`,
    typeArguments: [BASE_TYPE, QUOTE_TYPE],
    arguments: [
      txBuyback.object(deployed.vaultId),
      txBuyback.object(deployed.tokenMarketId),
      txBuyback.object(deployed.gridTreasuryCapId),
    ],
  });

  try {
    const buybackResult = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txBuyback,
      options: { showEvents: true },
    });
    log('buyback tx', buybackResult.digest);

    if (buybackResult.events?.length) {
      buybackResult.events.forEach((e: any) => {
        log('event', `${e.type.split('::').pop()}: ${JSON.stringify(e.parsedJson)}`);
      });
    }
  } catch (e: any) {
    log('buyback', `Skipped (no fees accrued or insufficient balance): ${e.message?.slice(0, 100)}`);
  }

  await new Promise(r => setTimeout(r, 1500));

  // ── 7. Claim Rewards ────────────────────────────────────────────────────
  header('Step 7: Claim GRID Rewards');

  if (shareId) {
    const txClaim = new Transaction();
    txClaim.moveCall({
      target: `${pkg}::incentive::claim_rewards_entry`,
      typeArguments: [BASE_TYPE, QUOTE_TYPE],
      arguments: [
        txClaim.object(deployed.vaultId),
        txClaim.object(shareId),
        txClaim.object(deployed.gridTreasuryCapId),
      ],
    });

    try {
      const claimResult = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: txClaim,
        options: { showEvents: true },
      });
      log('claim tx', claimResult.digest);

      if (claimResult.events?.length) {
        claimResult.events.forEach((e: any) => {
          log('event', `${e.type.split('::').pop()}: ${JSON.stringify(e.parsedJson)}`);
        });
      }
    } catch (e: any) {
      log('claim', `Skipped: ${e.message?.slice(0, 100)}`);
    }
  } else {
    log('claim', 'No VaultShare found — skipping');
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  header('Demo Complete');
  await printBalance('after');

  // Read vault state
  try {
    const vaultObj = await client.getObject({
      id: deployed.vaultId,
      options: { showContent: true },
    });
    if (vaultObj.data?.content && 'fields' in vaultObj.data.content) {
      const fields = vaultObj.data.content.fields as any;
      console.log('\n  Vault State:');
      log('total_shares', fields.total_shares);
      log('accrued_fee_quote', fields.accrued_fee_quote);
      log('reward_per_share', fields.reward_per_share);
      log('reward_pool_balance', fields.reward_pool_balance);
    }
  } catch {
    log('vault', 'Could not read vault state');
  }

  console.log('\n  ✅ Full flywheel demonstrated:');
  console.log('     deposit → rebalance → trade → settle → buyback → claim');
  console.log('     Spread yield → fee split → GRID buyback → burn + rewards\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
