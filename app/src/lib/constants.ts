// ---------------------------------------------------------------------------
// DeepGrid app constants
// ---------------------------------------------------------------------------

export const NETWORKS = {
  localnet: {
    rpcUrl: 'http://127.0.0.1:9000',
    label: 'Localnet',
  },
  devnet: {
    rpcUrl: 'https://fullnode.devnet.sui.io:443',
    label: 'Devnet',
  },
  testnet: {
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    label: 'Testnet',
  },
} as const;

export type NetworkId = keyof typeof NETWORKS;

export const DEFAULT_NETWORK: NetworkId = 'devnet';
