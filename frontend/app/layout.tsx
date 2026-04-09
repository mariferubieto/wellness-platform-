import type { Metadata } from 'next';
import './globals.css';
import BehaviorTracker from '@/components/ui/BehaviorTracker';
import Navbar from '@/components/ui/Navbar';

export const metadata: Metadata = {
  title: 'Shala · Manali Ayurveda · Bienestar',
  description: 'Clases de yoga, diplomados de ayurveda y retiros de bienestar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-beige antialiased">
        <BehaviorTracker />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
