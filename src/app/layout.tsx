import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Achadinhos | Moda, beleza e mais',
  description:
    'Moda, beleza, acessórios e perfumes em um só lugar. Sua vitrine de achados selecionados a dedo com as melhores ofertas da Shopee, Amazon e SHEIN.',
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${plusJakarta.variable} antialiased`}
    >
      <body className="min-h-screen bg-[#FBF8F3] text-[#3E3230]">
        <div className="w-full max-w-[1440px] mx-auto min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
