import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center pt-12 pb-20">
      {/* Hero */}
      <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-center">
        Deep<span className="text-grid-500">Grid</span>
      </h1>
      <p className="mt-4 text-xl text-slate-600 dark:text-slate-400 text-center max-w-2xl">
        Token-incentivized automated liquidity vaults for{' '}
        <span className="font-semibold text-slate-800 dark:text-slate-200">DeepBook</span> on Sui.
      </p>

      <div className="flex gap-4 mt-8">
        <Link
          href="/vault"
          className="px-6 py-3 bg-grid-600 text-white rounded-lg font-medium hover:bg-grid-700 transition-colors"
        >
          Launch App
        </Link>
        <Link
          href="/demo"
          className="px-6 py-3 border border-grid-600 text-grid-600 rounded-lg font-medium hover:bg-grid-50 dark:hover:bg-grid-950 transition-colors"
        >
          Run Demo
        </Link>
      </div>

      {/* Problem → Solution */}
      <div className="mt-20 w-full max-w-4xl">
        <h2 className="text-2xl font-bold text-center mb-8">The Problem &amp; Our Solution</h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Problem */}
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-6">
            <h3 className="font-semibold text-red-700 dark:text-red-400 text-lg mb-3">
              The Problem: Thin Liquidity
            </h3>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <span className="text-red-500 shrink-0">x</span>
                CLOBs like DeepBook have wide spreads due to lack of active market makers
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 shrink-0">x</span>
                No incentive for passive LPs to provide persistent liquidity
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 shrink-0">x</span>
                Vaults exist but nobody uses them — operational cost with no reward
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 shrink-0">x</span>
                New pairs = zero liquidity death spiral
              </li>
            </ul>
          </div>

          {/* Solution */}
          <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-6">
            <h3 className="font-semibold text-green-700 dark:text-green-400 text-lg mb-3">
              Our Solution: Vault + GRID Flywheel
            </h3>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <span className="text-green-500 shrink-0">+</span>
                Automated vault places tight bid/ask on DeepBook CLOB
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 shrink-0">+</span>
                Spread yield is real revenue — not inflationary rewards
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 shrink-0">+</span>
                GRID token emitted to LPs — incentivizes persistent liquidity
              </li>
              <li className="flex gap-2">
                <span className="text-green-500 shrink-0">+</span>
                Buyback: yield buys GRID from market → 50% burn, 50% rewards
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Flywheel */}
      <div className="mt-16 w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-center mb-6">The Flywheel</h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          <div className="flex items-center justify-center gap-3 text-sm font-medium flex-wrap">
            <span className="px-3 py-2 rounded-lg bg-grid-100 dark:bg-grid-900 text-grid-700 dark:text-grid-300">
              Deposits
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              Spread Yield
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              Buyback GRID
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
              Burn + Rewards
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-3 py-2 rounded-lg bg-grid-100 dark:bg-grid-900 text-grid-700 dark:text-grid-300">
              More Deposits
            </span>
          </div>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
            Real yield from spreads makes the incentive sustainable — not a Ponzi.
          </p>
        </div>
      </div>

      {/* Why Sui */}
      <div className="mt-16 w-full max-w-4xl">
        <h2 className="text-2xl font-bold text-center mb-6">Why Sui?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Object Model', desc: 'Orders, vaults, and shares are first-class objects with clear ownership' },
            { title: 'Shared Objects', desc: 'Vault and orderbook allow concurrent access from multiple users' },
            { title: 'Low Latency (~400ms)', desc: 'Fast enough for near-real-time rebalancing with tight spreads' },
            { title: 'Programmable TXs', desc: 'Batch deposit + rebalance + claim in a single atomic transaction' },
            { title: 'DeepBook CLOB', desc: 'Native on-chain orderbook — no off-chain matching needed' },
            { title: 'Move Safety', desc: 'Linear type system prevents double-spend of coins and shares' },
          ].map(({ title, desc }) => (
            <div
              key={title}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <div className="font-semibold text-grid-600 dark:text-grid-400 mb-1">{title}</div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
