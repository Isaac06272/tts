import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TTS App',
  description: 'Text-to-Speech with word-level highlighting using Edge-TTS and faster-whisper',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}