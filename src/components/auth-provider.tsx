'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider as AuthContextProvider, useAuth } from '@/context/auth-context';
import { LogOut, AlertTriangle, Clock } from 'lucide-react';

/**
 * AuthProvider v3.1
 *
 * Bọc AuthContextProvider + xử lý redirect:
 * - Chưa login → redirect /login
 * - Đang ở /login mà đã login → redirect /
 * - Pending (isActive=false) → cho xem app ở chế độ đọc + banner vàng
 * - Loading → hiện overlay
 */

/** Banner nhỏ hiện ở trên cùng khi tài khoản đang chờ xét duyệt */
function PendingBanner() {
    const { appUser, signOut } = useAuth();
    if (!appUser || appUser.isActive) return null;

    return (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 z-50 shrink-0">
            <div className="flex items-center gap-2 text-amber-800 text-sm min-w-0">
                <Clock size={15} className="shrink-0 text-amber-500" />
                <span className="truncate">
                    <strong>Chờ xét duyệt:</strong>{' '}
                    Tài khoản đang chờ Admin kích hoạt. Bạn có thể sử dụng đầy đủ các chức năng trong thời gian chờ.
                </span>
            </div>
            <button
                onClick={() => signOut()}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-red-600 font-medium transition-colors whitespace-nowrap"
            >
                <LogOut size={13} />
                Đăng xuất
            </button>
        </div>
    );
}

function AuthGuardInner({ children }: { children: React.ReactNode }) {
    const { firebaseUser, appUser, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [checked, setChecked] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);

    useEffect(() => {
        // Delay hiển thị overlay 500ms để tránh giật màn hình nếu auth load nhanh
        let timer: NodeJS.Timeout;
        if (loading) {
            timer = setTimeout(() => setShowOverlay(true), 500);
        } else {
            setShowOverlay(false);
        }
        return () => clearTimeout(timer);
    }, [loading]);

    useEffect(() => {
        if (loading) return;

        const isLoginPage = pathname === '/login';

        if (!firebaseUser && !isLoginPage) {
            router.push('/login');
        } else if (firebaseUser && isLoginPage) {
            // Nếu đã login Google nhưng appUser chưa tồn tại (chưa setup) -> Được ở lại /login để setup
            if (!appUser) {
                setChecked(true);
            }
            // Pending hoặc active đều chuyển về trang chủ
            else {
                router.push('/');
            }
        } else if (firebaseUser && !appUser && !isLoginPage) {
            // Tình huống: Có Firebase session nhưng chưa có AppUser -> Bắt quay về Login làm Form Setup Role
            router.push('/login');
        } else {
            setChecked(true);
        }
    }, [firebaseUser, appUser, loading, pathname, router]);

    // Loading overlay
    if (loading || !checked) {
        return (
            <div className={`fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center transition-opacity duration-300 ${showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {showOverlay && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                        <span className="text-sm text-gray-500 font-medium">Đang kiểm tra đăng nhập...</span>
                        <p className="text-xs text-gray-400 mt-2 max-w-xs text-center">
                            Đang đồng bộ phiên bản. Nếu quá trình này kéo dài, vui lòng tải lại trang.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return <>{children}</>;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <AuthContextProvider>
            <AuthGuardInner>
                <PendingBanner />
                {children}
            </AuthGuardInner>
        </AuthContextProvider>
    );
}
