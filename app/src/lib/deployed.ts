// Deployed object IDs — updated by demo:setup script or manually
// For demo purposes, these can be hardcoded after running setup.

export interface DeployedObjects {
  packageId: string;
  vaultId: string;
  vaultAdminCapId: string;
  strategyConfigId: string;
  orderBookId: string;
  gridTreasuryCapId: string;
  tokenMarketId: string;
}

// Default placeholder — replace after running `pnpm demo:setup`
export const DEPLOYED: DeployedObjects = {
  packageId: '0x0',
  vaultId: '0x0',
  vaultAdminCapId: '0x0',
  strategyConfigId: '0x0',
  orderBookId: '0x0',
  gridTreasuryCapId: '0x0',
  tokenMarketId: '0x0',
};

// Coin types for the MVP (SUI/SUI for simplicity)
export const BASE_TYPE = '0x2::sui::SUI';
export const QUOTE_TYPE = '0x2::sui::SUI';
