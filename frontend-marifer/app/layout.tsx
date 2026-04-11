import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/ui/Navbar';
import LeadPopup from '@/components/ui/LeadPopup';
import { Playfair_Display, Josefin_Sans, Fredoka, EB_Garamond } from 'next/font/google';

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
const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: '400',
  display: 'swap',
});
const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-eb-garamond',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Marifer · Yoga, Ayurveda y Bienestar',
  description: 'Retiros de bienestar, diplomados de ayurveda y clases de yoga con Marifer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${josefin.variable} ${fredoka.variable} ${ebGaramond.variable}`}>
      <body className="min-h-screen bg-beige antialiased">
        <Navbar />
        {children}
        <LeadPopup />
      </body>
    </html>
  );
}
