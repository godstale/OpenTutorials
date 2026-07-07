import type { Metadata } from 'next';
import { Geist, Geist_Mono, Montserrat } from 'next/font/google';
import localFont from 'next/font/local';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import './globals.css';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-serif',
});

const notoSansKr = localFont({
  src: '../public/fonts/Noto_Sans_KR/NotoSansKR-VariableFont_wght.ttf',
  variable: '--font-noto-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Open Tutorials',
  description: 'AI 튜터와 함께 학습하고 나만의 강의를 관리하세요',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={cn(geistSans.variable, geistMono.variable, montserrat.variable, notoSansKr.variable)}>
      <body className="min-w-[1024px] font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
