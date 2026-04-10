import type { Metadata } from 'next';
import './globals.css';
import BehaviorTracker from '@/components/ui/BehaviorTracker';
import Navbar from '@/components/ui/Navbar';
import { Playfair_Display, Cormorant_Garamond, Raleway, EB_Garamond } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
});

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-eb-garamond',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Shala · Manali Ayurveda · Bienestar',
  description: 'Clases de yoga, diplomados de ayurveda y retiros de bienestar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${cormorant.variable} ${raleway.variable} ${ebGaramond.variable}`}>
      <body className="min-h-screen bg-beige antialiased">
        <BehaviorTracker />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
