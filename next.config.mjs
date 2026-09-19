/** @type {import('next').NextConfig} */
const nextConfig = {
    // Tắt hoàn toàn Source Maps trên môi trường Production để chống dịch ngược mã nguồn (Rule 22 & GS-3)
    productionBrowserSourceMaps: false,

    // Cấu hình Defense-in-Depth Security Headers (GS-4)
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'unsafe-none',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                ],
            },
        ];
    },

    // Proxy Firebase Auth handler để custom domain hiện đúng trên Google Login
    async rewrites() {
        return [
            {
                source: '/__/auth/:path*',
                destination: 'https://tranboico-c0787.firebaseapp.com/__/auth/:path*',
            },
        ];
    },
};

export default nextConfig;
