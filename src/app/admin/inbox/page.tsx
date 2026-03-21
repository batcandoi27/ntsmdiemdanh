"use client";

import React from 'react';
import { AdminInbox } from '@/components/chat/admin-inbox';
import { useAuth } from '@/context/auth-context';
import { redirect } from 'next/navigation';

export default function AdminInboxPage() {
    const { appUser, loading } = useAuth();

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    // Bảo mật: Chỉ Admin và Hiệu trưởng mới được vào trang này
    if (!appUser || (appUser.role !== 'admin' && appUser.role !== 'principal')) {
        redirect('/');
        return null;
    }

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <AdminInbox />
        </main>
    );
}
