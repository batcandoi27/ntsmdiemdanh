'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useFeatureFlags } from './feature-flags-context';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'tbk_privacy_demo_mode';

interface PrivacyContextType {
    isPrivacyMode: boolean;
    togglePrivacyMode: () => void;
    setPrivacyMode: (enabled: boolean) => void;
    maskStudentName: (name: string) => string;
    maskSchoolName: (name: string) => string;
    maskUserName: (userName: string) => string;
    maskPhone: (phone: string) => string;
    maskCitizenId: (cccd: string) => string;
    maskAddress: (address: string) => string;
    maskGeneralText: (text: string) => string;
}

const PrivacyContext = createContext<PrivacyContextType>({
    isPrivacyMode: false,
    togglePrivacyMode: () => {},
    setPrivacyMode: () => {},
    maskStudentName: (name: string) => name,
    maskSchoolName: (name: string) => name,
    maskUserName: (userName: string) => userName,
    maskPhone: (phone: string) => phone,
    maskCitizenId: (cccd: string) => cccd,
    maskAddress: (address: string) => address,
    maskGeneralText: (text: string) => text,
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    const { flags, updateFlag } = useFeatureFlags();
    const [isPrivacyMode, setIsPrivacyModeState] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            try {
                const local = localStorage.getItem(STORAGE_KEY);
                if (local !== null) return local === 'true';
            } catch (_) {}
        }
        return false;
    });

    // Đồng bộ với feature_flags.privacyDemoMode nếu có
    useEffect(() => {
        if (flags && typeof flags.privacyDemoMode === 'boolean') {
            setIsPrivacyModeState(flags.privacyDemoMode);
            try {
                localStorage.setItem(STORAGE_KEY, String(flags.privacyDemoMode));
            } catch (_) {}
        }
    }, [flags?.privacyDemoMode]);

    const setPrivacyMode = useCallback((enabled: boolean) => {
        setIsPrivacyModeState(enabled);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, String(enabled));
                window.dispatchEvent(new Event('privacyModeUpdated'));
            } catch (_) {}
        }
        // Lưu vào Feature Flags trên Server
        updateFlag('privacyDemoMode', enabled).catch(() => {});
        if (enabled) {
            toast.success('🔒 Đã bật ẩn danh', { duration: 2500 });
        } else {
            toast('🔓 Đã tắt ẩn danh', { duration: 2000 });
        }
    }, [updateFlag]);

    const togglePrivacyMode = useCallback(() => {
        setPrivacyMode(!isPrivacyMode);
    }, [isPrivacyMode, setPrivacyMode]);

    // Lắng nghe sự kiện đồng bộ đa tab
    useEffect(() => {
        const handleSync = () => {
            try {
                const local = localStorage.getItem(STORAGE_KEY);
                if (local !== null) {
                    setIsPrivacyModeState(local === 'true');
                }
            } catch (_) {}
        };
        window.addEventListener('storage', handleSync);
        window.addEventListener('privacyModeUpdated', handleSync);
        return () => {
            window.removeEventListener('storage', handleSync);
            window.removeEventListener('privacyModeUpdated', handleSync);
        };
    }, []);

    // -------------------------------------------------------------------------
    // 1. HÀM MÃ HÓA TÊN TRƯỜNG (Giữ chữ THCS, ẩn phần tên riêng thành THCS *****)
    // -------------------------------------------------------------------------
    const maskSchoolName = useCallback((name: string): string => {
        if (!isPrivacyMode || !name || typeof name !== 'string') return name || '';
        if (name.toUpperCase().includes('THCS')) {
            return 'THCS *****';
        }
        return '*****';
    }, [isPrivacyMode]);

    // -------------------------------------------------------------------------
    // 2. HÀM MÃ HÓA NICK ĐĂNG NHẬP / TÊN NGƯỜI DÙNG (Ẩn hẳn thành *****)
    // -------------------------------------------------------------------------
    const maskUserName = useCallback((userName: string): string => {
        if (!isPrivacyMode || !userName || typeof userName !== 'string') return userName || '';
        return '*****';
    }, [isPrivacyMode]);

    // -------------------------------------------------------------------------
    // 3. HÀM XỬ LÝ TÊN HỌC SINH (Giữ nguyên tên đầy đủ, không ẩn)
    // -------------------------------------------------------------------------
    const maskStudentName = useCallback((fullName: string): string => {
        return fullName || '';
    }, []);

    // -------------------------------------------------------------------------
    // 4. HÀM MÃ HÓA SỐ ĐIỆN THOẠI
    // -------------------------------------------------------------------------
    const maskPhone = useCallback((phone: string): string => {
        if (!isPrivacyMode || !phone || typeof phone !== 'string') return phone || '';
        const clean = phone.trim();
        if (clean.length < 6) return '***';
        return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
    }, [isPrivacyMode]);

    // -------------------------------------------------------------------------
    // 5. HÀM MÃ HÓA CCCD / ĐỊNH DANH CÁ NHÂN
    // -------------------------------------------------------------------------
    const maskCitizenId = useCallback((cccd: string): string => {
        if (!isPrivacyMode || !cccd || typeof cccd !== 'string') return cccd || '';
        const clean = cccd.trim();
        if (clean.length < 6) return '******';
        return `${clean.slice(0, 4)}******${clean.slice(-2)}`;
    }, [isPrivacyMode]);

    // -------------------------------------------------------------------------
    // 6. HÀM MÃ HÓA ĐỊA CHỈ NHÀ
    // -------------------------------------------------------------------------
    const maskAddress = useCallback((address: string): string => {
        if (!isPrivacyMode || !address || typeof address !== 'string') return address || '';
        const parts = address.split(',');
        if (parts.length <= 1) return '***, P.**, Q.*';
        return parts.map((p, idx) => {
            if (idx === 0) return 'Số *** Đ***';
            return p.trim().length > 3 ? `${p.trim().slice(0, 2)}***` : '***';
        }).join(', ');
    }, [isPrivacyMode]);

    // -------------------------------------------------------------------------
    // 7. HÀM MÃ HÓA CHUNG
    // -------------------------------------------------------------------------
    const maskGeneralText = useCallback((text: string): string => {
        if (!isPrivacyMode || !text || typeof text !== 'string') return text || '';
        return maskSchoolName(maskStudentName(text));
    }, [isPrivacyMode, maskSchoolName, maskStudentName]);

    return (
        <PrivacyContext.Provider value={{
            isPrivacyMode,
            togglePrivacyMode,
            setPrivacyMode,
            maskStudentName,
            maskSchoolName,
            maskUserName,
            maskPhone,
            maskCitizenId,
            maskAddress,
            maskGeneralText
        }}>
            {children}
        </PrivacyContext.Provider>
    );
}

export function usePrivacy() {
    return useContext(PrivacyContext);
}
