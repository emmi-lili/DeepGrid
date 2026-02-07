'use client';

import { useState } from 'react';
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Card, CardHeader, CardBody } from '@/components/card';
import { StatBox } from '@/components/stat-box';
import { DEPLOYED, BASE_TYPE, QUOTE_TYPE } from '@/lib/deployed';

export default function IncentivesPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  // Vault state for reward info
  const { data: vaultData } = useSuiClientQuery('getObject', {
    id: DEPLOYED.vaultId,
    options: { showContent: true },
  });
  const vaultFields = (vaultData?.data?.content as any)?.fields ?? null;

  // User's VaultShare objects
  const { data: sharesData, refetch: refetchShares } = useSuiClientQuery('getOwnedObjects', {
    owner: account?.address ?? '',
    filter: {
      StructType: `${DEPLOYED.packageId}::vault::VaultShare<${BASE_TYPE}, ${QUOTE_TYPE}>`,
    },
    options: { showContent: true },
  });

  // User's GRID balance
  const { data: gridBalance, refetch: refetchGrid } = useSuiClientQuery('getBalance', {
    owner: account?.address ?? '',
    coinType: `${DEPLOYED.packageId}::grid_token::GRID_TOKEN`,
  });

  const shares = sharesData?.data ?? [];

  const handleClaimRewards = async (shareObjectId: string) => {
    if (!account) return;
    setLoading(true);
    setStatus(null);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${DEPLOYED.packageId}::incentive::claim_rewards_entry`,
        typeArguments: [BASE_TYPE, QUOTE_TYPE],
        arguments: [
          tx.object(DEPLOYED.vaultId),
          tx.object(shareObjectId),
          tx.object(DEPLOYED.gridTreasuryCapId),
        ],
      });

      const result = await signAndExecute({ transaction: tx });
      setStatus(`Claimed GRID rewards! TX: ${result.digest}`);
      refetchShares();
      refetchGrid();
    } catch (err: any) {
      setStatus(`Error: ${err.message?.slice(0, 120)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentEvents = async () => {
    if (DEPLOYED.packageId === '0x0') return;
    try {
      const result = await client.queryEvents({
        query: { MoveModule: { package: DEPLOYED.packageId, module: 'buyback' } },
        limit: 10,
        order: 'descending',
      });
      setEvents(result.data);
    } catch {
      // Module may not have events yet
    }
  };

  const formatGrid = (amount: string | number) =>
    (Number(amount) / 1e9).toFixed(2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Incentives</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Earn GRID tokens for providing liquidity. View buyback events and claim rewards.
        </p>
      </div>

      {/* GRID Balance & Reward Pool */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <StatBox
              label="Your GRID Balance"
              value={formatGrid(gridBalance?.totalBalance ?? 0)}
              sub="GRID tokens"
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <StatBox
              label="Reward Pool"
              value={formatGrid(vaultFields?.reward_pool_balance ?? 0)}
              sub="GRID in pool"
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <StatBox
              label="Emission Rate"
              value="100"
              sub="GRID per rebalance"
            />
          </CardBody>
        </Card>
      </div>

      {/* Claim Rewards */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-lg">Claim Rewards</h2>
        </CardHeader>
        <CardBody>
          {shares.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No vault shares found. Deposit into the vault first to earn GRID rewards.
            </p>
          ) : (
            <div className="space-y-3">
              {shares.map((obj) => {
                const fields = (obj.data?.content as any)?.fields;
                const shareAmt = Number(fields?.shares ?? 0);
                const rewardDebt = Number(fields?.reward_debt ?? 0);
                const rps = Number(vaultFields?.reward_per_share ?? 0);
                const pending = Math.max(
                  0,
                  Math.floor((shareAmt * rps) / 1e12 - rewardDebt),
                );

                return (
                  <div
                    key={obj.data?.objectId}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800"
                  >
                    <div className="space-y-1">
                      <span className="font-mono text-sm">
                        {obj.data?.objectId?.slice(0, 10)}...
                      </span>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {shareAmt.toLocaleString()} shares
                      </div>
                      <div className="text-sm font-medium text-grid-600 dark:text-grid-400">
                        Pending: ~{formatGrid(pending)} GRID
                      </div>
                    </div>
                    <button
                      onClick={() => handleClaimRewards(obj.data?.objectId!)}
                      disabled={loading || pending <= 0}
                      className="px-4 py-2 bg-grid-600 text-white rounded-lg text-sm font-medium hover:bg-grid-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? '...' : 'Claim'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Buyback Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Recent Buyback Events</h2>
            <button
              onClick={loadRecentEvents}
              className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Load Events
            </button>
          </div>
        </CardHeader>
        <CardBody>
          {events.length === 0 ? (
            <p className="text-slate-400 text-sm">No buyback events yet. Run the demo flow first.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.map((evt, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                >
                  <div className="text-grid-600 dark:text-grid-400 font-semibold">
                    {evt.type.split('::').pop()}
                  </div>
                  <pre className="mt-1 text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {JSON.stringify(evt.parsedJson, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Status */}
      {status && (
        <div
          className={`p-4 rounded-lg text-sm ${
            status.startsWith('Error')
              ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200'
              : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200'
          }`}
        >
          {status}
        </div>
      )}
    </div>
  );
}
