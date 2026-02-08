'use client';

import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
}

export function PasswordModal({ isOpen, onClose, onSuccess, title = "Yêu Cầu Mật Khẩu" }: PasswordModalProps) {
    const [input, setInput] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (input === '266haithuong') {
            setError('');
            setInput('');
            onSuccess();
        } else {
            setError('Mật khẩu không đúng!');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-6 pt-2">
                    <div className="bg-blue-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600 shadow-sm border border-blue-100">
                        <Lock size={28} />
                    </div>
                    <h3 className="font-bold text-xl text-gray-800">{title}</h3>
                    <p className="text-gray-500 text-sm mt-1">Vui lòng xác minh danh tính để tiếp tục.</p>
                </div>

                <div className="space-y-4">
                    <input
                        type="password"
                        className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 font-medium"
                        placeholder="Nhập mật khẩu..."
                        value={input}
                        onChange={e => { setInput(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-sm flex items-center gap-1 font-medium animate-in slide-in-from-left-1">⚠️ {error}</p>}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95"
                        >
                            Xác Nhận
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
