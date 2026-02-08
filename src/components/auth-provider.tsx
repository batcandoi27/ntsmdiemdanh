'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

// AuthProvider sử dụng overlay loading thay vì return null để tránh Hydration Mismatch
export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            setLoading(false);

            const isLoginPage = pathname === '/login';
            const isPublicPage = pathname === '/'; // Homepage public cho đơn giản (hoặc cần login)

            // Logic redirect
            if (!authUser && !isLoginPage) {
                router.push('/login');
            }
            // Redirect logic nên handle ở Middleware hoặc Page component level để tốt hơn.
            // Ở đây chỉ set state.
        });

        return () => unsubscribe();
    }, [router, pathname]);

    return (
        <>
            {children}
            {loading && (
                <div className="fixed inset-0 bg-white/80 z-[9999] flex items-center justify-center pointer-events-none">
                    {/* Overlay loading nhẹ nhàng, không block DOM tree */}
                </div>
            )}
        </>
    );
}
