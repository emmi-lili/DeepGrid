export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Deep<span className="text-grid-500">Grid</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Token-incentivized automated liquidity vaults for DeepBook on Sui.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <a
            href="/vault"
            className="px-6 py-3 bg-grid-600 text-white rounded-lg font-medium hover:bg-grid-700 transition-colors"
          >
            Launch App
          </a>
          <a
            href="/demo"
            className="px-6 py-3 border border-grid-600 text-grid-600 rounded-lg font-medium hover:bg-grid-50 dark:hover:bg-grid-950 transition-colors"
          >
            Run Demo
          </a>
        </div>
        <div className="pt-8 grid grid-cols-3 gap-6 text-sm">
          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
            <div className="font-semibold text-grid-600 mb-1">Vault</div>
            <p className="text-gray-500 dark:text-gray-400">
              Deposit assets, earn spread yield from automated CLOB market-making.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
            <div className="font-semibold text-grid-600 mb-1">GRID Token</div>
            <p className="text-gray-500 dark:text-gray-400">
              Earn incentive rewards for providing persistent liquidity.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
            <div className="font-semibold text-grid-600 mb-1">Buyback</div>
            <p className="text-gray-500 dark:text-gray-400">
              Spread yield buys GRID tokens — burn + redistribute flywheel.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
