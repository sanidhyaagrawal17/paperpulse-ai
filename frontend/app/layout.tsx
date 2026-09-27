import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PaperPulse AI | Agentic Literature Review Engine',
  description: 'Production-grade agentic literature review platform with ChromaDB, NetworkX cluster expansion, and deterministic citation verification guardrails.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#040508] text-[#f1f5f9] antialiased selection:bg-blue-600/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
