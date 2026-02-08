'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';

export function PasswordGuard({ children }: { children: React.ReactNode }) {
    const [isAuth, setIsAuth] = useState(false);
    const [input, setInput] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (input === '266haithuong') {
            setIsAuth(true);
        } else {
            setError('Mật khẩu không đúng!');
        }
    };

    if (isAuth) return <>{children}</>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-6">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
                        <Lock size={32} />
                    </div>
                    <h1 className="font-bold text-2xl text-gray-800">Đăng Nhập Quản Trị</h1>
                    <p className="text-gray-500 text-sm mt-2">Tính năng này yêu cầu quyền truy cập đặc biệt.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <input
                            type="password"
                            className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 font-medium"
                            placeholder="Nhập mật khẩu..."
                            value={input}
                            onChange={e => { setInput(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1 font-medium animate-in slide-in-from-left-1">⚠️ {error}</p>}
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        Tiếp Tục
                    </button>

                    <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-wider font-bold">
                        Secure System Access
                    </p>
                </div>
            </div>
        </div>
    );
}
