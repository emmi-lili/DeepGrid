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

export default function VaultPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [depositAmount, setDepositAmount] = useState('1');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch vault object state
  const { data: vaultData, refetch: refetchVault } = useSuiClientQuery('getObject', {
    id: DEPLOYED.vaultId,
    options: { showContent: true },
  });

  const vaultFields = (vaultData?.data?.content as any)?.fields ?? null;

  // Fetch user's VaultShare objects
  const { data: sharesData, refetch: refetchShares } = useSuiClientQuery('getOwnedObjects', {
    owner: account?.address ?? '',
    filter: {
      StructType: `${DEPLOYED.packageId}::vault::VaultShare<${BASE_TYPE}, ${QUOTE_TYPE}>`,
    },
    options: { showContent: true },
  });

  const shares = sharesData?.data ?? [];

  const totalUserShares = shares.reduce((sum, obj) => {
    const fields = (obj.data?.content as any)?.fields;
    return sum + Number(fields?.shares ?? 0);
  }, 0);

  const handleDeposit = async () => {
    if (!account || DEPLOYED.packageId === '0x0') {
      setStatus('Connect wallet and deploy contracts first');
      return;
    }
    setLoading(true);
    setStatus(null);

    try {
      const amountMist = Math.floor(Number(depositAmount) * 1e9);
      const tx = new Transaction();
      const [baseCoin] = tx.splitCoins(tx.gas, [amountMist]);
      const [quoteCoin] = tx.splitCoins(tx.gas, [amountMist]);

      tx.moveCall({
        target: `${DEPLOYED.packageId}::vault::deposit_entry`,
        typeArguments: [BASE_TYPE, QUOTE_TYPE],
        arguments: [tx.object(DEPLOYED.vaultId), baseCoin, quoteCoin],
      });

      const result = await signAndExecute({ transaction: tx });
      setStatus(`Deposited! TX: ${result.digest}`);
      refetchVault();
      refetchShares();
    } catch (err: any) {
      setStatus(`Error: ${err.message?.slice(0, 120)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (shareObjectId: string) => {
    if (!account) return;
    setLoading(true);
    setStatus(null);

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${DEPLOYED.packageId}::vault::withdraw_entry`,
        typeArguments: [BASE_TYPE, QUOTE_TYPE],
        arguments: [tx.object(DEPLOYED.vaultId), tx.object(shareObjectId)],
      });

      const result = await signAndExecute({ transaction: tx });
      setStatus(`Withdrawn! TX: ${result.digest}`);
      refetchVault();
      refetchShares();
    } catch (err: any) {
      setStatus(`Error: ${err.message?.slice(0, 120)}`);
    } finally {
      setLoading(false);
    }
  };

  const formatSui = (mist: string | number) =>
    (Number(mist) / 1e9).toFixed(4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vault</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Deposit assets to earn spread yield from automated CLOB market-making.
        </p>
      </div>

      {/* Vault Stats */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-lg">Vault State</h2>
        </CardHeader>
        <CardBody>
          {vaultFields ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatBox
                label="Base Balance"
                value={formatSui(vaultFields.base_balance)}
                sub="SUI"
              />
              <StatBox
                label="Quote Balance"
                value={formatSui(vaultFields.quote_balance)}
                sub="SUI"
              />
              <StatBox label="Total Shares" value={Number(vaultFields.total_shares).toLocaleString()} />
              <StatBox
                label="Accrued Fees"
                value={formatSui(vaultFields.accrued_fee_quote)}
                sub="SUI (spread yield)"
              />
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              {DEPLOYED.vaultId === '0x0'
                ? 'Deploy contracts first (run pnpm demo:setup)'
                : 'Loading vault state...'}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Deposit */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-lg">Deposit</h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Amount (SUI each for base + quote)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                placeholder="1.0"
              />
            </div>
            <button
              onClick={handleDeposit}
              disabled={loading || !account}
              className="self-end px-6 py-2.5 bg-grid-600 text-white rounded-lg font-medium hover:bg-grid-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Deposit'}
            </button>
          </div>
          {!account && (
            <p className="text-amber-600 text-sm mt-2">Connect your wallet to deposit.</p>
          )}
        </CardBody>
      </Card>

      {/* My Shares */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">My Shares</h2>
            <span className="text-sm text-slate-500">
              Total: {totalUserShares.toLocaleString()} shares
            </span>
          </div>
        </CardHeader>
        <CardBody>
          {shares.length === 0 ? (
            <p className="text-slate-400 text-sm">No shares yet. Deposit to receive vault shares.</p>
          ) : (
            <div className="space-y-3">
              {shares.map((obj, i) => {
                const fields = (obj.data?.content as any)?.fields;
                return (
                  <div
                    key={obj.data?.objectId}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                  >
                    <div>
                      <span className="font-mono text-sm">
                        {obj.data?.objectId?.slice(0, 10)}...
                      </span>
                      <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">
                        {Number(fields?.shares ?? 0).toLocaleString()} shares
                      </span>
                    </div>
                    <button
                      onClick={() => handleWithdraw(obj.data?.objectId!)}
                      disabled={loading}
                      className="px-4 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 transition-colors"
                    >
                      Withdraw
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Status */}
      {status && (
        <div
          className={`p-4 rounded-lg text-sm ${
            status.startsWith('Error')
              ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900'
              : 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900'
          }`}
        >
          {status}
        </div>
      )}
    </div>
  );
}
