import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'localHost9 — Root Access to Great Taste',
  description: 'Your Daily Favorites, Delivered Fresh. Order delicious food online from localHost9.',
  keywords: ['food delivery', 'restaurant', 'order online', 'localHost9'],
  openGraph: {
    title: 'localHost9 — Root Access to Great Taste',
    description: 'Your Daily Favorites, Delivered Fresh',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
