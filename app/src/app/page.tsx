'use client';

import { useState } from 'react';

// ─── Tab definitions ─────────────────────────────────────────────
const TABS = ['Overview', 'Vault', 'Incentives', 'Demo'] as const;
type Tab = (typeof TABS)[number];

export default function Home() {
  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold">
          Deep<span className="text-cyan-400">Grid</span>
        </h1>
        <p className="mt-2 text-slate-400">
          Token-incentivized liquidity vaults for DeepBook on Sui
        </p>
      </header>

      {/* Tab bar */}
      <nav className="flex gap-1 mb-8 bg-slate-900 rounded-lg p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {tab === 'Overview' && <OverviewTab />}
      {tab === 'Vault' && <VaultTab />}
      {tab === 'Incentives' && <IncentivesTab />}
      {tab === 'Demo' && <DemoTab />}
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────
function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* Problem / Solution */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-5">
          <h3 className="font-semibold text-red-400 mb-3">The Problem</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>- CLOBs have wide spreads, no active market makers</li>
            <li>- No incentive for passive LPs to stay</li>
            <li>- Vaults exist but nobody uses them</li>
            <li>- New trading pairs = zero liquidity</li>
          </ul>
        </div>
        <div className="bg-green-950/40 border border-green-900 rounded-lg p-5">
          <h3 className="font-semibold text-green-400 mb-3">Our Solution</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>+ Automated vault places tight bid/ask on CLOB</li>
            <li>+ Spread yield = real revenue, not inflation</li>
            <li>+ GRID token emitted to LPs as incentive</li>
            <li>+ Buyback: yield buys GRID, 50% burn / 50% rewards</li>
          </ul>
        </div>
      </div>

      {/* Flywheel */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="font-semibold mb-4 text-center">The Flywheel</h3>
        <div className="flex items-center justify-center gap-2 flex-wrap text-sm font-medium">
          {['Deposits', 'Spread Yield', 'Buyback GRID', 'Burn + Rewards', 'More Deposits'].map(
            (step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded bg-slate-800 text-cyan-300">
                  {step}
                </span>
                {i < 4 && <span className="text-slate-600">&#8594;</span>}
              </span>
            ),
          )}
        </div>
        <p className="text-center text-xs text-slate-500 mt-3">
          Real yield from spreads makes incentives sustainable
        </p>
      </div>

      {/* Why Sui */}
      <div>
        <h3 className="font-semibold mb-3">Why Sui?</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            ['Object Model', 'Orders, vaults, shares are first-class objects'],
            ['Shared Objects', 'Concurrent access to vault and orderbook'],
            ['Low Latency', '~400ms finality for near-real-time rebalancing'],
            ['Programmable TXs', 'Batch deposit + rebalance + claim atomically'],
            ['DeepBook CLOB', 'Native on-chain orderbook on Sui'],
            ['Move Safety', 'Linear types prevent double-spend'],
          ].map(([title, desc]) => (
            <div key={title} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-cyan-400 font-medium text-sm">{title}</div>
              <div className="text-xs text-slate-400 mt-1">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Vault ───────────────────────────────────────────────────────
function VaultTab() {
  const [deposited, setDeposited] = useState(false);

  return (
    <div className="space-y-6">
      {/* Vault state */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="font-semibold mb-4">Vault State</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Base Balance', deposited ? '5.0000 SUI' : '0 SUI'],
            ['Quote Balance', deposited ? '5.0000 SUI' : '0 SUI'],
            ['Total Shares', deposited ? '10,000,000,000' : '0'],
            ['Spread Fees', deposited ? '0.5000 SUI' : '0 SUI'],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-slate-500 uppercase">{label}</div>
              <div className="text-lg font-bold mt-1">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Deposit */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="font-semibold mb-3">Deposit</h3>
        <div className="flex gap-3">
          <input
            type="number"
            defaultValue="5"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            placeholder="Amount (SUI)"
          />
          <button
            onClick={() => setDeposited(true)}
            className="px-6 py-2 bg-cyan-600 rounded-lg text-sm font-medium hover:bg-cyan-500 transition-colors"
          >
            Deposit
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Deposits equal SUI into base + quote. Receives VaultShare object.
        </p>
      </div>

      {/* Shares */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="font-semibold mb-3">My Shares</h3>
        {!deposited ? (
          <p className="text-sm text-slate-500">No shares yet. Deposit to receive vault shares.</p>
        ) : (
          <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
            <div>
              <div className="font-mono text-sm">0xa1b2c3...d4e5</div>
              <div className="text-xs text-slate-400 mt-1">10,000,000,000 shares</div>
            </div>
            <button
              onClick={() => setDeposited(false)}
              className="px-4 py-1.5 text-sm border border-red-800 text-red-400 rounded-lg hover:bg-red-950 transition-colors"
            >
              Withdraw
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Incentives ──────────────────────────────────────────────────
function IncentivesTab() {
  const [claimed, setClaimed] = useState(false);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          ['Your GRID Balance', claimed ? '100.00' : '0.00', 'GRID tokens'],
          ['Reward Pool', '1,000,000', 'GRID in pool'],
          ['Emission Rate', '100', 'GRID per rebalance'],
        ].map(([label, value, sub]) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-500 uppercase">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
            <div className="text-xs text-slate-500">{sub}</div>
          </div>
        ))}
      </div>

      {/* Claim */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="font-semibold mb-3">Claim Rewards</h3>
        <div className="flex items-center justify-between bg-slate-800 rounded-lg p-4">
          <div>
            <div className="text-sm">Pending GRID rewards</div>
            <div className="text-xl font-bold text-cyan-400 mt-1">
              {claimed ? '0.00' : '100.00'} GRID
            </div>
          </div>
          <button
            onClick={() => setClaimed(true)}
            disabled={claimed}
            className="px-5 py-2 bg-cyan-600 rounded-lg text-sm font-medium hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {claimed ? 'Claimed' : 'Claim'}
          </button>
        </div>
      </div>

      {/* Buyback events */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="font-semibold mb-3">Recent Buyback Events</h3>
        <div className="space-y-2">
          {[
            { quote: '0.2000', grid: '2,000', burned: '1,000', rewards: '1,000' },
            { quote: '0.1500', grid: '1,500', burned: '750', rewards: '750' },
          ].map((evt, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-3 text-xs">
              <div className="flex gap-4 flex-wrap">
                <span>
                  <span className="text-slate-500">Quote spent:</span>{' '}
                  <span className="text-white">{evt.quote} SUI</span>
                </span>
                <span>
                  <span className="text-slate-500">GRID bought:</span>{' '}
                  <span className="text-cyan-400">{evt.grid}</span>
                </span>
                <span>
                  <span className="text-slate-500">Burned:</span>{' '}
                  <span className="text-red-400">{evt.burned}</span>
                </span>
                <span>
                  <span className="text-slate-500">To rewards:</span>{' '}
                  <span className="text-green-400">{evt.rewards}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Demo ────────────────────────────────────────────────────────
function DemoTab() {
  const [copied, setCopied] = useState<number | null>(null);

  const steps = [
    { label: 'Start Localnet', cmd: 'sui start --with-faucet', note: 'Run in separate terminal' },
    { label: 'Install Deps', cmd: 'pnpm install', note: '' },
    { label: 'Deploy Contracts', cmd: 'NETWORK=localnet pnpm demo:setup', note: 'Publishes Move package' },
    { label: 'Run Demo Flow', cmd: 'NETWORK=localnet pnpm demo:run', note: 'Full flywheel sequence' },
    { label: 'Start UI', cmd: 'pnpm dev', note: 'http://localhost:3000' },
  ];

  const copy = (cmd: string, i: number) => {
    navigator.clipboard.writeText(cmd);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Steps */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="font-semibold mb-4">Quick Start</h3>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-cyan-900 flex items-center justify-center text-cyan-300 text-xs font-bold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{s.label}</div>
                {s.note && <div className="text-xs text-slate-500">{s.note}</div>}
              </div>
              <div className="flex items-center gap-2">
                <code className="px-3 py-1.5 bg-slate-950 rounded text-xs text-green-400 font-mono">
                  {s.cmd}
                </code>
                <button
                  onClick={() => copy(s.cmd, i)}
                  className="px-2 py-1.5 text-xs border border-slate-700 rounded hover:bg-slate-800 transition-colors"
                >
                  {copied === i ? 'OK' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="font-semibold mb-3">Architecture</h3>
        <pre className="text-[11px] font-mono text-slate-400 overflow-x-auto leading-relaxed">
{`┌────────────────────────────────────────────────────┐
│                 DeepGrid Protocol                   │
│                                                     │
│  Vault ──▶ Strategy ──▶ MockDeepBook (CLOB Sim)    │
│    │                                                │
│    │ spread yield                                   │
│    ▼                                                │
│  FeeSplitter ──▶ TokenMarket ──▶ GRID Token         │
│   60% LP          (Buyback)      (Mint/Burn)        │
│   40% buyback                                       │
│                                                     │
│  Incentive Engine: 100 GRID per rebalance to LPs    │
└────────────────────────────────────────────────────┘`}
        </pre>
      </div>

      {/* Demo flow */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="font-semibold mb-3">Demo Flow</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            'Deposit 5 SUI',
            'Rebalance (bid/ask)',
            'Accrue GRID',
            'Simulate Trade',
            'Settle Fills',
            'Buyback + Burn',
            'Claim Rewards',
          ].map((step, i) => (
            <span key={step} className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 bg-slate-800 rounded text-slate-300">{step}</span>
              {i < 6 && <span className="text-slate-600">&#8594;</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
