'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/card';

interface DemoStep {
  id: string;
  label: string;
  description: string;
  command: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'setup',
    label: '1. Deploy Contracts',
    description: 'Build Move package, publish to chain, create Vault + StrategyConfig + OrderBook + TokenMarket.',
    command: 'NETWORK=localnet pnpm demo:setup',
  },
  {
    id: 'deposit',
    label: '2. Run Full Demo',
    description: 'Execute the complete flywheel: deposit → rebalance → trade → settle → buyback → claim.',
    command: 'NETWORK=localnet pnpm demo:run',
  },
];

const CLI_STEPS = [
  { label: 'Start Localnet', cmd: 'sui start --with-faucet', note: 'Run in a separate terminal' },
  { label: 'Install Dependencies', cmd: 'pnpm install', note: '' },
  { label: 'Deploy & Initialize', cmd: 'NETWORK=localnet pnpm demo:setup', note: 'Publishes Move package, creates all objects' },
  { label: 'Run Demo Flow', cmd: 'NETWORK=localnet pnpm demo:run', note: 'Deposit → rebalance → trade → settle → buyback → claim' },
  { label: 'Start UI', cmd: 'pnpm dev', note: 'Opens http://localhost:3000' },
];

export default function DemoPage() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Demo</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Step-by-step guide to deploy and run the full DeepGrid demo.
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-lg">Quick Start (CLI)</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {CLI_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-grid-100 dark:bg-grid-900 flex items-center justify-center text-grid-700 dark:text-grid-300 font-bold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{step.label}</div>
                  {step.note && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{step.note}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 px-3 py-2 bg-slate-900 text-green-400 rounded-lg text-sm font-mono">
                      {step.cmd}
                    </code>
                    <button
                      onClick={() => copyToClipboard(step.cmd, i)}
                      className="shrink-0 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {copiedIdx === i ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* What the Demo Shows */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-lg">What the Demo Proves</h2>
        </CardHeader>
        <CardBody>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-sm text-grid-600 dark:text-grid-400 mb-2">
                Vault + CLOB Mechanics
              </h3>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <li>- Deposit SUI into shared vault object</li>
                <li>- Receive VaultShare tokens (Sui objects)</li>
                <li>- Keeper rebalances: places bid/ask on MockDeepBook</li>
                <li>- Price moves → orders fill → spread yield accrues</li>
                <li>- Withdraw: burn shares, get proportional assets</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-grid-600 dark:text-grid-400 mb-2">
                GRID Token Flywheel
              </h3>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <li>- GRID emitted to LPs per rebalance (100 GRID)</li>
                <li>- Spread yield split: 60% to LPs, 40% to buyback</li>
                <li>- Buyback purchases GRID from TokenMarket</li>
                <li>- Bought GRID: 50% burned, 50% to reward pool</li>
                <li>- Users claim GRID rewards proportional to shares</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Architecture */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-lg">Architecture</h2>
        </CardHeader>
        <CardBody>
          <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
{`┌─────────────────────────────────────────────────────────┐
│                    DeepGrid Protocol                     │
│                                                          │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────────┐  │
│  │  Vault   │──▶│  Strategy   │──▶│  MockDeepBook    │  │
│  │ (Shared) │   │  Config     │   │  (CLOB Sim)      │  │
│  │          │◀──│             │◀──│                   │  │
│  └────┬─────┘   └─────────────┘   └──────────────────┘  │
│       │                                                   │
│       │ spread yield                                      │
│       ▼                                                   │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────────┐  │
│  │   Fee    │──▶│  TokenMkt   │──▶│  GRID Token      │  │
│  │ Splitter │   │  (Buyback)  │   │  (Mint/Burn)     │  │
│  └──────────┘   └─────────────┘   └──────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │           Incentive Engine (Rewards)              │    │
│  │  emission per rebalance → pro-rata to LPs         │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘`}
          </pre>
        </CardBody>
      </Card>

      {/* Screenshots Checklist */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-lg">Screenshots Checklist for Judges</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-2 text-sm">
            {[
              'Landing page with Problem/Solution and Why Sui',
              'Vault page: deposit tx + VaultShare created',
              'Vault page: balance updates after deposit',
              'Terminal: demo:run output showing full flywheel',
              'Incentives page: GRID balance after claiming rewards',
              'Incentives page: buyback events with burn + reward amounts',
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                <input type="checkbox" className="rounded" />
                {item}
              </label>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
