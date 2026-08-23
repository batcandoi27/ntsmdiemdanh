'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    overlayClassName?: string;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, overlayClassName, className }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            onClose();
        }
    };

    return (
        <div
            ref={overlayRef}
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200",
                overlayClassName
            )}
            onClick={handleOverlayClick}
        >
            <div
                className={cn(
                    "bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] max-h-[92dvh] flex flex-col overflow-hidden my-auto border border-slate-100 animate-in zoom-in-95 duration-200",
                    className
                )}
            >
                {/* Sticky Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0 bg-white sticky top-0 z-10">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 line-clamp-1 pr-2">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                        aria-label="Đóng modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
                    {children}
                </div>
            </div>
        </div>
    );
}
