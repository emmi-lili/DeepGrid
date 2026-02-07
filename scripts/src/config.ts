import 'dotenv/config';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// ---------------------------------------------------------------------------
// DeepGrid environment configuration
// ---------------------------------------------------------------------------

export type Network = 'localnet' | 'devnet' | 'testnet';

export const NETWORK: Network = (process.env.NETWORK as Network) ?? 'localnet';

const RPC_URLS: Record<Network, string> = {
  localnet: 'http://127.0.0.1:9000',
  devnet: 'https://fullnode.devnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
};

const FAUCET_URLS: Record<Network, string> = {
  localnet: 'http://127.0.0.1:9123/gas',
  devnet: 'https://faucet.devnet.sui.io/v1/gas',
  testnet: 'https://faucet.testnet.sui.io/v1/gas',
};

export const RPC_URL = process.env.RPC_URL ?? RPC_URLS[NETWORK];
export const FAUCET_URL = process.env.FAUCET_URL ?? FAUCET_URLS[NETWORK];

/** Object IDs populated after deployment (written by setup script). */
export interface DeployedObjects {
  packageId: string;
  vaultId: string;
  vaultAdminCapId: string;
  strategyConfigId: string;
  orderBookId: string;
  gridTreasuryCapId: string;
  tokenMarketId: string;
}

export const DEPLOYED_PATH = new URL('../../.deployed.json', import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Sui client + signer helpers
// ---------------------------------------------------------------------------

export function getSuiClient(): SuiClient {
  return new SuiClient({ url: RPC_URL });
}

/** Get or generate a keypair. Uses PRIVATE_KEY env var or falls back to a
 *  deterministic test key for localnet. */
export function getKeypair(): Ed25519Keypair {
  if (process.env.PRIVATE_KEY) {
    // Sui CLI exported format: suiprivkey1...
    return Ed25519Keypair.fromSecretKey(process.env.PRIVATE_KEY);
  }
  // Deterministic test key for localnet (DO NOT use on mainnet!)
  console.warn('  ⚠  No PRIVATE_KEY set — using deterministic test keypair (localnet only)');
  return Ed25519Keypair.deriveKeypair(
    'result crisp session latin must fruit genuine question prevent start coconut brave speak student dismiss',
  );
}

export async function requestFaucet(client: SuiClient, address: string) {
  if (NETWORK === 'localnet') {
    try {
      const res = await fetch(FAUCET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ FixedAmountRequest: { recipient: address } }),
      });
      if (!res.ok) throw new Error(`Faucet error: ${res.status}`);
      console.log(`  [faucet] Funded ${address.slice(0, 10)}...`);
    } catch (e: any) {
      console.warn(`  [faucet] Failed: ${e.message}`);
    }
  } else {
    try {
      const res = await fetch(FAUCET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ FixedAmountRequest: { recipient: address } }),
      });
      console.log(`  [faucet] Funded on ${NETWORK}: ${address.slice(0, 10)}...`);
    } catch (e: any) {
      console.warn(`  [faucet] Failed on ${NETWORK}: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Deployment state persistence
// ---------------------------------------------------------------------------

export function saveDeployed(data: DeployedObjects) {
  writeFileSync(DEPLOYED_PATH, JSON.stringify(data, null, 2));
  console.log(`  [save] Wrote deployed objects to ${DEPLOYED_PATH}`);
}

export function loadDeployed(): DeployedObjects {
  if (!existsSync(DEPLOYED_PATH)) {
    throw new Error(`No deployment found at ${DEPLOYED_PATH}. Run pnpm demo:setup first.`);
  }
  return JSON.parse(readFileSync(DEPLOYED_PATH, 'utf-8'));
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

export function log(label: string, value: string | number) {
  console.log(`  [${label}] ${value}`);
}

export function header(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

export { Transaction, SuiClient };
