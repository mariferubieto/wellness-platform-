import type { Metadata } from 'next';
import './globals.css';
import BehaviorTracker from '@/components/ui/BehaviorTracker';
import Navbar from '@/components/ui/Navbar';
import { Playfair_Display, Josefin_Sans, Raleway, EB_Garamond } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['700', '800', '900'],
  display: 'swap',
});

const josefin = Josefin_Sans({
  subsets: ['latin'],
  variable: '--font-josefin',
  weight: ['100', '200', '300'],
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
    <html lang="es" className={`${playfair.variable} ${josefin.variable} ${raleway.variable} ${ebGaramond.variable}`}>
      <body className="min-h-screen bg-beige antialiased">
        <BehaviorTracker />
        <Navbar />
        {children}
      </body>
    </html>
  );
}

