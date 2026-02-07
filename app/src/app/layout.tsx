import type { Metadata } from 'next';
import './globals.css';
import { SuiProviders } from '@/providers/sui-provider';
import { Navbar } from '@/components/navbar';

export const metadata: Metadata = {
  title: 'DeepGrid — Automated Liquidity Vaults on Sui',
  description:
    'Token-incentivized liquidity vaults for DeepBook CLOB on Sui. Earn real yield from market-making spreads with GRID token flywheel.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-slate-50 dark:bg-slate-950">
        <SuiProviders>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </SuiProviders>
      </body>
    </html>
  );
}
