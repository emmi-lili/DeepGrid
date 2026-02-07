/**
 * DeepGrid — Setup / Deploy script.
 *
 * Publishes the Move package and initializes all protocol objects:
 * Vault, StrategyConfig, OrderBook, TokenMarket.
 *
 * Usage: NETWORK=localnet pnpm --filter scripts run setup
 */
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import {
  header, log, NETWORK, RPC_URL, getSuiClient, getKeypair,
  requestFaucet, saveDeployed, Transaction,
} from './config.js';

const CONTRACTS_DIR = path.resolve(import.meta.dirname, '../../contracts');

async function main() {
  header('DeepGrid Setup');
  log('Network', NETWORK);
  log('RPC', RPC_URL);

  const client = getSuiClient();
  const keypair = getKeypair();
  const address = keypair.toSuiAddress();
  log('Address', address);

  // Fund account
  await requestFaucet(client, address);
  await new Promise(r => setTimeout(r, 2000));

  const balance = await client.getBalance({ owner: address });
  log('SUI Balance', `${Number(balance.totalBalance) / 1e9} SUI`);

  // ── 1. Build + Publish Move package ─────────────────────────────────────
  header('Step 1: Build & Publish Move Package');
  log('info', 'Building Move package...');

  try {
    execSync('sui move build', { cwd: CONTRACTS_DIR, stdio: 'pipe' });
    log('build', 'Success');
  } catch (e: any) {
    console.error('Move build failed:', e.stderr?.toString() || e.message);
    process.exit(1);
  }

  // Read compiled modules
  const buildDir = path.join(CONTRACTS_DIR, 'build', 'deepgrid', 'bytecode_modules');
  const { readdirSync } = await import('fs');
  const moduleFiles = readdirSync(buildDir).filter((f: string) => f.endsWith('.mv'));
  const modules = moduleFiles.map((f: string) =>
    Array.from(readFileSync(path.join(buildDir, f)))
  );

  // Read package dependencies
  const depsPath = path.join(CONTRACTS_DIR, 'build', 'deepgrid', 'BuildInfo.yaml');

  // Publish using the Sui SDK
  const tx = new Transaction();
  const [upgradeCap] = tx.publish({
    modules: modules.map(m => Uint8Array.from(m)),
    dependencies: [
      '0x1', // MoveStdlib
      '0x2', // SuiFramework
    ],
  });
  tx.transferObjects([upgradeCap], address);

  log('info', 'Publishing package...');
  const publishResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showObjectChanges: true, showEffects: true },
  });

  const packageId = publishResult.objectChanges?.find(
    (c: any) => c.type === 'published'
  )?.packageId;

  if (!packageId) {
    console.error('Failed to extract packageId from publish result');
    console.error(JSON.stringify(publishResult.objectChanges, null, 2));
    process.exit(1);
  }
  log('packageId', packageId);

  // Extract GRID TreasuryCap from created objects (from init function)
  const gridTreasuryCapObj = publishResult.objectChanges?.find(
    (c: any) => c.type === 'created' && c.objectType?.includes('TreasuryCap')
  );
  const gridTreasuryCapId = gridTreasuryCapObj?.objectId;
  log('gridTreasuryCapId', gridTreasuryCapId ?? 'NOT FOUND');

  // Wait for indexing
  await new Promise(r => setTimeout(r, 2000));

  // ── 2. Create Vault ─────────────────────────────────────────────────────
  header('Step 2: Create Vault');

  // For MVP we use SUI as both base and quote (simplified).
  // In production, base=SUI, quote=USDC.
  const BASE_TYPE = '0x2::sui::SUI';
  const QUOTE_TYPE = '0x2::sui::SUI';

  const txVault = new Transaction();
  txVault.moveCall({
    target: `${packageId}::vault::create_vault_entry`,
    typeArguments: [BASE_TYPE, QUOTE_TYPE],
    arguments: [],
  });

  const vaultResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: txVault,
    options: { showObjectChanges: true },
  });

  const vaultObj = vaultResult.objectChanges?.find(
    (c: any) => c.type === 'created' && c.objectType?.includes('Vault<')
  );
  const vaultId = vaultObj?.objectId ?? '';

  const vaultAdminCapObj = vaultResult.objectChanges?.find(
    (c: any) => c.type === 'created' && c.objectType?.includes('VaultAdminCap')
  );
  const vaultAdminCapId = vaultAdminCapObj?.objectId ?? '';

  log('vaultId', vaultId);
  log('vaultAdminCapId', vaultAdminCapId);

  await new Promise(r => setTimeout(r, 1000));

  // ── 3. Create StrategyConfig ────────────────────────────────────────────
  header('Step 3: Create StrategyConfig');

  const txConfig = new Transaction();
  txConfig.moveCall({
    target: `${packageId}::strategy::create_config_entry`,
    arguments: [
      txConfig.pure.u64(50),                // spread_bps = 0.5%
      txConfig.pure.u64(1_000_000_000),     // order_size = 1 SUI (1e9)
      txConfig.pure.u64(2),                 // num_orders = 2 per side
      txConfig.pure.address(address),       // keeper = deployer
    ],
  });

  const configResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: txConfig,
    options: { showObjectChanges: true },
  });

  const configObj = configResult.objectChanges?.find(
    (c: any) => c.type === 'created' && c.objectType?.includes('StrategyConfig')
  );
  const strategyConfigId = configObj?.objectId ?? '';
  log('strategyConfigId', strategyConfigId);

  await new Promise(r => setTimeout(r, 1000));

  // ── 4. Create OrderBook (MockDeepBook) ──────────────────────────────────
  header('Step 4: Create MockDeepBook OrderBook');

  const INITIAL_MID_PRICE = 10_000_000_000; // 10 QUOTE per BASE (scaled 1e9)

  const txBook = new Transaction();
  txBook.moveCall({
    target: `${packageId}::mock_deepbook::create_orderbook_entry`,
    arguments: [txBook.pure.u64(INITIAL_MID_PRICE)],
  });

  const bookResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: txBook,
    options: { showObjectChanges: true },
  });

  const bookObj = bookResult.objectChanges?.find(
    (c: any) => c.type === 'created' && c.objectType?.includes('OrderBook')
  );
  const orderBookId = bookObj?.objectId ?? '';
  log('orderBookId', orderBookId);

  await new Promise(r => setTimeout(r, 1000));

  // ── 5. Create TokenMarket ───────────────────────────────────────────────
  header('Step 5: Create TokenMarket');

  const GRID_RESERVE = 1_000_000_000_000_000; // 1M GRID (1e15 with 9 decimals)
  const GRID_PRICE = 100_000_000;             // 0.1 QUOTE per GRID (scaled 1e9)

  const txMarket = new Transaction();
  txMarket.moveCall({
    target: `${packageId}::buyback::create_token_market`,
    typeArguments: [QUOTE_TYPE],
    arguments: [
      txMarket.object(gridTreasuryCapId!),
      txMarket.pure.u64(GRID_RESERVE),
      txMarket.pure.u64(GRID_PRICE),
    ],
  });

  const marketResult = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: txMarket,
    options: { showObjectChanges: true },
  });

  const marketObj = marketResult.objectChanges?.find(
    (c: any) => c.type === 'created' && c.objectType?.includes('TokenMarket')
  );
  const tokenMarketId = marketObj?.objectId ?? '';
  log('tokenMarketId', tokenMarketId);

  // ── Save deployment ─────────────────────────────────────────────────────
  header('Setup Complete');

  const deployed = {
    packageId,
    vaultId,
    vaultAdminCapId,
    strategyConfigId,
    orderBookId,
    gridTreasuryCapId: gridTreasuryCapId ?? '',
    tokenMarketId,
  };

  saveDeployed(deployed);

  console.log('\n  Deployed objects:');
  Object.entries(deployed).forEach(([k, v]) => console.log(`    ${k}: ${v}`));
  console.log('\n  Run `pnpm demo:run` to execute the full demo flow.\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
