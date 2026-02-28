'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!mounted) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/40 z-[100] transition-opacity duration-300 backdrop-blur-sm",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col max-h-[85vh]",
                    isOpen ? "translate-y-0" : "translate-y-full"
                )}
            >
                {/* Drag Handle */}
                <div
                    className="w-full h-8 flex items-center justify-center cursor-pointer"
                    onClick={onClose}
                >
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                {(title || onClose) && (
                    <div className="px-6 pb-4 flex items-center justify-between border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto pb-safe">
                    {children}
                </div>
            </div>
        </>,
        document.body
    );
}
