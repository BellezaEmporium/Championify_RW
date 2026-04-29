import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Championify',
  description: 'Downloads League of Legends builds and imports them into the game',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

