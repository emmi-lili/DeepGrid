import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
