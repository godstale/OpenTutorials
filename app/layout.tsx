import type { Metadata } from 'next';
import { Geist, Geist_Mono, Montserrat } from 'next/font/google';
import localFont from 'next/font/local';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ToastProvider } from '@/components/ui/toast';
import { LanguageProvider } from '@/lib/context/LanguageContext';
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var font = localStorage.getItem('font-preference');
                  if (font === 'noto') {
                    document.documentElement.classList.add('font-noto-sans-active');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-w-[1024px] font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <TooltipProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
