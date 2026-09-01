import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/auth-provider';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ViewModeProvider } from '@/context/view-mode-context';
import { ViewContainer } from '@/components/view-container';
import { FeatureFlagsProvider } from '@/context/feature-flags-context';
import { PrivacyProvider } from '@/context/privacy-context';
import { PrivacyDemoBadge } from '@/components/privacy-demo-badge';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Analytics } from "@vercel/analytics/next";

import { LoadingProvider } from '@/context/loading-context';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ChatProvider } from '@/context/chat-context';
import { ChatContainer } from '@/components/chat/chat-container';
import { Toaster } from 'react-hot-toast';
import { ExtensionErrorGuard } from '@/components/extension-error-guard';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'Hệ Thống Điểm Danh - THCS Trần Bội Cơ',
  description: 'Hệ thống điểm danh và quản lý giáo dục - Trường THCS Trần Bội Cơ',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function isExtensionError(err, msg, filename) {
                  var str = (err && (err.stack || err.message)) || msg || '';
                  var file = filename || '';
                  return str.indexOf('chrome-extension://') !== -1 ||
                         str.indexOf('moz-extension://') !== -1 ||
                         str.indexOf('safari-extension://') !== -1 ||
                         str.indexOf('M_ID') !== -1 ||
                         file.indexOf('chrome-extension://') !== -1;
                }
                window.addEventListener('error', function(e) {
                  if (isExtensionError(e.error, e.message, e.filename)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return true;
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  if (isExtensionError(e.reason)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return true;
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-app text-text-primary min-h-screen antialiased selection:bg-primary-soft selection:text-primary`} suppressHydrationWarning>
        <LoadingProvider>
          <AuthProvider>
            <FeatureFlagsProvider>
              <PrivacyProvider>
                <ChatProvider>
                  <ViewModeProvider>
                    <div className="flex flex-col min-h-screen pb-20 md:pb-0 bg-app">
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
              </PrivacyProvider>
            </FeatureFlagsProvider>
          </AuthProvider>
          <LoadingOverlay />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12)',
                fontSize: '14px',
                fontWeight: 600,
                padding: '12px 16px',
              },
            }}
          />
          <ExtensionErrorGuard />
        </LoadingProvider>
        <Analytics />
      </body>
    </html>
  );
}
