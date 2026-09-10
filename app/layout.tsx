import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * Next does not apply basePath to the manifest link, so it carries the prefix
 * explicitly — otherwise the browser looks at the domain root, which on GitLab
 * Pages belongs to someone else. The manifest's own `start_url` is relative
 * ("./"), which the spec resolves against the manifest URL, so it needs no
 * prefix of its own.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'Leave By',
  description: "When to stop working, so you don't miss the bus.",
  manifest: `${BASE}/manifest.json`,
};

export const viewport: Viewport = {
  themeColor: '#0a0e14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
