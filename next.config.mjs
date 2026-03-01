/** @type {import('next').NextConfig} */
const nextConfig = {
    // Không thêm Cross-Origin-Opener-Policy vì nó chặn Firebase Google Login Popup

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
