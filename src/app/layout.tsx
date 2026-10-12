import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MOVIC | Personal Video Downloader',
  description: 'Private workspace for authorized video inspection, variant selection, and compliant local downloads.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
