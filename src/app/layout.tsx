import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/auth-provider';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ViewModeProvider } from '@/context/view-mode-context';
import { ViewContainer } from '@/components/view-container';
import { FeatureFlagsProvider } from '@/context/feature-flags-context';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Analytics } from "@vercel/analytics/next"

import { LoadingProvider } from '@/context/loading-context';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ChatProvider } from '@/context/chat-context';
import { ChatContainer } from '@/components/chat/chat-container';
import { Toaster } from 'react-hot-toast';
import { ExtensionErrorGuard } from '@/components/extension-error-guard';

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
        <LoadingProvider>
          <AuthProvider>
            <FeatureFlagsProvider>
              <ChatProvider>
                <ViewModeProvider>
                  <div className="flex flex-col min-h-screen pb-20 md:pb-0">
                    <SiteHeader />
                    <ViewContainer>
                      {children}
                    </ViewContainer>
                    <SiteFooter />
                    <BottomNav />
                    <ChatContainer />
                  </div>
                </ViewModeProvider>
              </ChatProvider>
            </FeatureFlagsProvider>
          </AuthProvider>
          <LoadingOverlay />
          <Toaster position="top-right" />
          <ExtensionErrorGuard />
        </LoadingProvider>
        <Analytics />
      </body>
    </html>
  )
}
