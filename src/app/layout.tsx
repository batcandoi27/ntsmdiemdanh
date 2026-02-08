import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/auth-provider';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ViewModeProvider } from '@/context/view-mode-context';
import { ViewContainer } from '@/components/view-container';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hệ Thống Điểm Danh - THCS Trần Bội Cơ',
  description: 'App điểm danh học sinh',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <ViewModeProvider>
            <div className="flex flex-col min-h-screen">
              <SiteHeader />
              <ViewContainer>
                {children}
              </ViewContainer>
              <SiteFooter />
            </div>
          </ViewModeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
