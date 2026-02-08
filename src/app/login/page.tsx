'use client';

import { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, AlertCircle, Chrome, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (isRegister && password !== confirmPass) {
            setError('Mật khẩu nhập lại không khớp!');
            setLoading(false);
            return;
        }

        try {
            if (isRegister) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            router.push('/'); // Redirect dashboard
        } catch (err: any) {
            console.error(err);
            let msg = 'Lỗi xác thực: ' + err.code;
            if (err.code === 'auth/invalid-credential') msg = 'Thông tin đăng nhập không đúng.';
            if (err.code === 'auth/email-already-in-use') msg = 'Email này đã được sử dụng.';
            if (err.code === 'auth/weak-password') msg = 'Mật khẩu quá yếu (tối thiểu 6 ký tự).';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            router.push('/');
        } catch (err: any) {
            console.error(err);
            setError('Lỗi đăng nhập Google: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-light/50 to-white flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-100 transition-all">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4 shadow-sm">
                        {isRegister ? <UserPlus className="text-primary w-8 h-8" /> : <Lock className="text-primary w-8 h-8" />}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'}
                    </h1>
                    <p className="text-gray-500 mt-1">Hệ thống điểm danh THCS Trần Bội Cơ</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 text-sm border border-red-100 animate-in fade-in slide-in-from-top-1">
                        <AlertCircle size={16} className="shrink-0" />
                        {error}
                    </div>
                )}

                {/* Google Login Button */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-xl mb-6 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                    <Chrome size={20} className="text-blue-500" />
                    Tiếp tục với Google
                </button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Hoặc dùng Email</span>
                    </div>
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="email"
                                required
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="password"
                                required
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {isRegister && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nhập lại Mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all"
                                    placeholder="••••••••"
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70 active:scale-95 translate-y-0"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            isRegister ? <><UserPlus size={20} /> ĐĂNG KÝ TÀI KHOẢN</> : <><LogIn size={20} /> ĐĂNG NHẬP</>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => { setIsRegister(!isRegister); setError(''); }}
                        className="text-primary hover:text-primary-dark font-medium text-sm hover:underline transition-all"
                    >
                        {isRegister ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Tạo mới miễn phí'}
                    </button>
                </div>
            </div>
        </div>
    );
}
