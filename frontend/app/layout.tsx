import type { Metadata } from 'next';
import './globals.css';
import BehaviorTracker from '@/components/ui/BehaviorTracker';

export const metadata: Metadata = {
  title: 'Shala · Manali Ayurveda · Bienestar',
  description: 'Clases de yoga, diplomados de ayurveda y retiros de bienestar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-beige antialiased">
        <BehaviorTracker />
        {children}
      </body>
    </html>
  );
}
