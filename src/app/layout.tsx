import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BRAND } from '@/lib/brand';
import { publicAssetPath } from '@/lib/deploy';

export const metadata: Metadata = {
  title: `${BRAND.name} — портал молодых учёных`,
  description: BRAND.tagline,
  icons: {
    icon: publicAssetPath(BRAND.logo)
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
