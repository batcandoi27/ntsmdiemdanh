/** @type {import('next').NextConfig} */
const nextConfig = {
    // Cấu hình header để cho phép Firebase Auth Popup hoạt động bình thường
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin-allow-popups',
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
