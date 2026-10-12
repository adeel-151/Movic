import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MOVIC | Personal Social Video Downloader',
  description: 'Private single-user workspace for authorized video inspection, resolution selection, and compliant local storage.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
