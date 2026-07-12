import type { Metadata } from 'next';
import { Geist_Mono, Caveat } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TransitOps | Enterprise Fleet Operations & Management Platform',
  description:
    'A high-performance smart transport operations platform designed to streamline dispatching, vehicle registries, fuel logs, maintenance, driver profiles, and real-time operational analytics.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
