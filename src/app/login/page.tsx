'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import { School, LogIn, Eye, EyeOff, AlertCircle, KeySquare, CheckCircle2, BookOpen, UserCheck } from 'lucide-react';

/**
 * Login Page v4.0
 *
 * Hỗ trợ 2 loại đăng nhập:
 * - Email + password (GV, Admin, Principal, Supervisor)
 * - Mã HS + password (Ban Cán Sự Lớp)
 *
 * Đăng ký Google mới:
 * - Chọn vai trò
 * - GVCN: chọn Lớp Chủ nhiệm + chọn nhiều Lớp Bộ môn
 * - GVBM: chọn nhiều Lớp Bộ môn
 * - Sau đăng ký: isActive=false, xem app ở chế độ đọc, chờ Admin duyệt
 */

import { setupRoleWithoutCode } from '@/app/actions/auth-setup';

interface ClassOption {
    id: string;
    name: string;
    grade: number;
    teacherName?: string;
}

import { useRouter } from 'next/navigation';
import { db as dbInstance } from '@/services/db';

export default function LoginPage() {
    const router = useRouter();
    const { 
        signIn,
        signInWithGoogle,
        authUser,
        appUser, // Thêm appUser để kiểm tra redirect
        needsRoleCode, 
        error: authError, 
        loading 
    } = useAuth();

    const [emailOrCode, setEmailOrCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Tự động chuyển hướng khi đã đăng nhập thành công
    useEffect(() => {
        if (!loading && appUser && !needsRoleCode) {
            router.push('/');
        }
    }, [appUser, loading, needsRoleCode, router]);

    // States cho bước thiết lập Role
    const [requestedRole, setRequestedRole] = useState('teacher');
    const [step, setStep] = useState<'role' | 'classes'>('role'); // Bước trong form đăng ký

    // States cho chọn lớp
    const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [homeroomClassId, setHomeroomClassId] = useState('');          // Lớp CN (GVCN)
    const [subjectClassIds, setSubjectClassIds] = useState<string[]>([]); // Lớp BM (GVCN + GVBM)

    // Đồng bộ: Nếu chọn Lớp Chủ nhiệm, nó phải có trong subjectClassIds (lớp tôi dạy)
    useEffect(() => {
        if (homeroomClassId) {
            setSubjectClassIds(prev => Array.from(new Set([...prev, homeroomClassId])));
        }
    }, [homeroomClassId]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Fetch danh sách lớp khi cần
    useEffect(() => {
        if (step === 'classes') {
            fetchClasses();
        }
    }, [step]);

    const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
            // Lấy danh sách lớp từ Supabase
            const listData = await dbInstance.getClasses();
            const list = listData.map(cls => ({
                id: cls.id,
                name: cls.name, // Sửa cls.className thành cls.name vì model Class dùng 'name'
                grade: cls.grade || 0,
                teacherName: cls.teacherName
            }));

            // Sort màng bằng JavaScript (grade tăng dần, name tăng dần)
            list.sort((a, b) => {
                if (a.grade !== b.grade) return a.grade - b.grade;
                const nameA = a.name || '';
                const nameB = b.name || '';
                // Sử dụng numeric: true để 7A2 đứng trước 7A10
                return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
            });

            setAllClasses(list);
        } catch (err) {
            console.error('Lỗi tải danh sách lớp:', err);
            setLocalError('Không thể tải danh sách lớp. Vui lòng thử lại.');
        } finally {
            setLoadingClasses(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (!emailOrCode.trim()) {
            setLocalError('Vui lòng nhập email hoặc mã học sinh.');
            return;
        }
        if (!password) {
            setLocalError('Vui lòng nhập mật khẩu.');
            return;
        }

        setIsSubmitting(true);
        try {
            await signIn(emailOrCode.trim(), password);
        } catch {
            // Error đã được set trong AuthContext
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLocalError('');
        try {
            await signInWithGoogle();
        } catch (err: any) {
            if (err.code !== 'auth/popup-closed-by-user') {
                setLocalError('Không thể kết nối với Google.');
            }
        }
    };

    const handleNextStep = () => {
        setLocalError('');
        // Các role không cần chọn lớp → submit thẳng
        if (!['teacher', 'gvbm'].includes(requestedRole)) {
            handleSetupRole();
            return;
        }
        setStep('classes');
    };

    const handleSetupRole = async (e?: FormEvent) => {
        e?.preventDefault();
        setLocalError('');

        if (!authUser) {
            setLocalError('Phiên đăng nhập Google bị mất. Vui lòng tải lại trang.');
            return;
        }

        const actualUid = authUser.uid || (authUser as any).id;
        const userEmail = authUser.email || `${actualUid}@no-email.local`;
        const userDisplayName = authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : 'Người dùng');

        // Validate chọn lớp cho GV
        if (['teacher', 'gvbm'].includes(requestedRole)) {
            if (requestedRole === 'teacher' && !homeroomClassId) {
                setLocalError('GVCN phải chọn Lớp Chủ nhiệm.');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // 1. Cập nhật mật khẩu nếu có
            if (newPassword) {
                if (newPassword.length < 6) {
                    setLocalError('Mật khẩu phải có ít nhất 6 ký tự.');
                    setIsSubmitting(false);
                    return;
                }
                const { supabaseAuth } = await import('@/services/supabase-auth-service');
                const { error: pwdError } = await supabaseAuth.updatePassword(newPassword);
                if (pwdError) {
                    setLocalError('Lỗi cập nhật mật khẩu: ' + pwdError.message);
                    setIsSubmitting(false);
                    return;
                }
            }

            // 2. Thiết lập profile
            // Tổng hợp danh sách lớp
            const assignedIds = Array.from(new Set([
                ...(homeroomClassId ? [homeroomClassId] : []),
                ...subjectClassIds,
            ]));

            const res = await setupRoleWithoutCode(
                actualUid,
                userEmail,
                userDisplayName,
                requestedRole as any,
                assignedIds,
                requestedRole === 'teacher' ? (homeroomClassId || null) : null,
            );

            if (res.success) {
                setSuccessMsg(res.message);
                // Reload sau 1.5s để AuthContext tải lại AppUser Profile
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                setLocalError(res.message);
            }
        } catch (error: any) {
            setLocalError('Đã xảy ra lỗi máy chủ.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleSubjectClass = (classId: string) => {
        setSubjectClassIds(prev =>
            prev.includes(classId)
                ? prev.filter(id => id !== classId)
                : [...prev, classId]
        );
    };

    const displayError = localError || authError;

    // Nhóm lớp theo khối
    const classesByGrade = allClasses.reduce<Record<number, ClassOption[]>>((acc, cls) => {
        if (!acc[cls.grade]) acc[cls.grade] = [];
        acc[cls.grade].push(cls);
        return acc;
    }, {});

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 mb-4">
                        <School size={32} className="text-blue-50" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {process.env.NEXT_PUBLIC_SCHOOL_NAME || 'Hệ Thống Điểm Danh'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {needsRoleCode ? 'Thiết lập tài khoản mới' : 'Đăng nhập để tiếp tục'}
                    </p>
                </div>

                {/* Form Đăng ký Google (needsRoleCode) */}
                {needsRoleCode && authUser ? (
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-5">

                        {/* Avatar */}
                        <div className="text-center border-b border-gray-100 pb-4 mb-2">
                            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 bg-gray-100 border-2 border-white shadow-sm ring-2 ring-gray-100">
                                {authUser.photoURL ? (
                                    <img src={authUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">
                                        {authUser.email?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <h3 className="font-semibold text-gray-800">{authUser.displayName}</h3>
                            <p className="text-sm text-gray-500">{authUser.email}</p>
                            <span className="inline-block px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider rounded-full mt-2 border border-amber-200">
                                Lần Đầu Đăng Nhập
                            </span>
                        </div>

                        {/* Progress indicator */}
                        {['teacher', 'gvbm'].includes(requestedRole) && step === 'classes' && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="text-gray-400">Bước 1: Vai trò ✓</span>
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-blue-600 font-medium">Bước 2: Chọn lớp</span>
                            </div>
                        )}

                        {displayError && (
                            <div className="flex items-start gap-3 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{displayError}</span>
                            </div>
                        )}

                        {successMsg ? (
                            <div className="flex items-start justify-center gap-3 bg-green-50 text-green-700 font-medium px-4 py-6 rounded-xl border border-green-200 text-center flex-col animate-in fade-in zoom-in">
                                <CheckCircle2 size={36} className="mx-auto text-green-500" />
                                <span>{successMsg}</span>
                                <span className="text-xs text-green-600/70 mt-1">Đang chuyển hướng tự động...</span>
                            </div>
                        ) : step === 'role' ? (
                            /* === BƯỚC 1: CHỌN VAI TRÒ === */
                            <>
                                <div>
                                    <label htmlFor="roleSelect" className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                        <KeySquare size={16} className="text-blue-600" />
                                        Vai trò của bạn
                                    </label>
                                    <select
                                        id="roleSelect"
                                        value={requestedRole}
                                        onChange={(e) => { setRequestedRole(e.target.value); setHomeroomClassId(''); setSubjectClassIds([]); }}
                                        className="w-full px-4 py-3 rounded-xl border border-border-default focus:border-border-focus focus:ring-4 focus:ring-sky-500/15 outline-none text-text-primary font-bold hover:bg-surface-hover bg-surface-card transition-all cursor-pointer shadow-xs"
                                    >
                                        <option value="teacher">Giáo viên chủ nhiệm (GVCN)</option>
                                        <option value="gvbm">Giáo viên bộ môn (GVBM)</option>
                                        <option value="supervisor">Giám thị</option>
                                        <option value="principal">Hiệu trưởng / Hiệu phó</option>
                                        <option value="class_monitor">Lớp trưởng / Ban cán sự</option>
                                    </select>
                                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                                        Sau khi đăng ký, tài khoản chờ Admin xét duyệt. Bạn vẫn có thể xem dữ liệu trong thời gian chờ.
                                    </p>
                                </div>

                                {/* Nhập mật khẩu mới */}
                                <div className="pt-2 border-t border-gray-100">
                                    <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                        <KeySquare size={16} className="text-blue-600" />
                                        Thiết lập mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="newPassword"
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Tối thiểu 6 ký tự"
                                            className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 placeholder:text-gray-400 transition-all font-mono"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-amber-600 mt-2 font-medium bg-amber-50 p-2 rounded-lg border border-amber-100">
                                        💡 Thiết lập mật khẩu này giúp bạn có thể đăng nhập bằng Email trực tiếp sau này mà không cần bấm nút Google.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleNextStep}
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {['teacher', 'gvbm'].includes(requestedRole) ? (
                                        <>
                                            <BookOpen size={20} />
                                            <span>Tiếp theo: Chọn lớp</span>
                                        </>
                                    ) : (
                                        isSubmitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Đang xử lý...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={20} />
                                                <span>Xác nhận & Hoàn tất</span>
                                            </>
                                        )
                                    )}
                                </button>
                            </>
                        ) : (
                            /* === BƯỚC 2: CHỌN LỚP === */
                            <form onSubmit={handleSetupRole}>
                                {loadingClasses ? (
                                    <div className="flex items-center justify-center py-8 gap-3 text-gray-400">
                                        <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                                        <span className="text-sm">Đang tải danh sách lớp...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {/* GVCN: Chọn lớp chủ nhiệm */}
                                        {requestedRole === 'teacher' && (
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                                    <UserCheck size={16} className="text-green-600" />
                                                    Lớp Chủ Nhiệm <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={homeroomClassId}
                                                    onChange={(e) => setHomeroomClassId(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl border border-border-default focus:border-border-focus focus:ring-4 focus:ring-sky-500/15 outline-none text-text-primary font-bold hover:bg-surface-hover bg-surface-card transition-all cursor-pointer shadow-xs"
                                                >
                                                    <option value="">-- Chọn lớp chủ nhiệm --</option>
                                                    {Object.entries(classesByGrade).map(([grade, classes]) => (
                                                        <optgroup key={grade} label={`Khối ${grade}`} className="text-text-secondary bg-surface-section font-bold">
                                                            {classes.map(cls => (
                                                                <option key={cls.id} value={cls.id} className="text-text-primary bg-surface-card font-medium">
                                                                    {cls.name} {cls.teacherName ? `— GV: ${cls.teacherName}` : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* GVCN + GVBM: Chọn lớp bộ môn (đa chọn) */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                                <BookOpen size={16} className="text-blue-600" />
                                                Lớp Bộ Môn (lớp của tôi)
                                                <span className="text-xs font-normal text-gray-400 ml-1">— chọn nhiều lớp</span>
                                            </label>
                                            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                                                {allClasses.length === 0 ? (
                                                    <p className="text-sm text-gray-400 text-center py-4">Chưa có lớp nào trong hệ thống</p>
                                                ) : (
                                                    Object.entries(classesByGrade).map(([grade, classes]) => (
                                                        <div key={grade}>
                                                            <div className="px-3 py-1.5 bg-teal-50 text-xs font-bold text-teal-700 uppercase tracking-wider border-b border-teal-100 italic">
                                                                Khối {grade}
                                                            </div>
                                                            {classes
                                                                .filter(cls => cls.id !== homeroomClassId) // ẨN LỚP CHỦ NHIỆM KHỎI DANH SÁCH BỘ MÔN
                                                                .map(cls => (
                                                                <label
                                                                    key={cls.id}
                                                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-teal-50 transition-colors border-b border-gray-50 last:border-0 ${subjectClassIds.includes(cls.id) ? 'bg-teal-50/50' : ''}`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={subjectClassIds.includes(cls.id)}
                                                                        onChange={() => toggleSubjectClass(cls.id)}
                                                                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                                    />
                                                                    <span className="text-sm">
                                                                        <span className="font-bold text-sky-600">{cls.name}</span>
                                                                        {cls.teacherName && (
                                                                            <span className="text-xs text-sky-400 ml-2">— GV: {cls.teacherName}</span>
                                                                        )}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            {subjectClassIds.length > 0 && (
                                                <p className="text-xs text-teal-700 font-medium mt-1.5">
                                                    Đã chọn {subjectClassIds.length} lớp bộ môn
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setStep('role'); setLocalError(''); }}
                                        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
                                    >
                                        ← Quay lại
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || loadingClasses}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Đang lưu...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={20} />
                                                <span>Xác nhận & Hoàn tất</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                ) : (
                    /* Form Login Thường */
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-5">

                        {/* Error */}
                        {displayError && (
                            <div className="flex items-start gap-3 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{displayError}</span>
                            </div>
                        )}

                        {/* Email or Student Code */}
                        <div>
                            <label htmlFor="emailOrCode" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Tên đăng nhập (Email / Mã HS)
                            </label>
                            <input
                                id="emailOrCode"
                                type="text"
                                value={emailOrCode}
                                onChange={(e) => setEmailOrCode(e.target.value)}
                                placeholder="giaovien@email.com hoặc hs8a13_01"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 placeholder:text-gray-400 transition-all"
                                autoComplete="username"
                                autoFocus
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 placeholder:text-gray-400 transition-all"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <LogIn size={20} />
                                        <span>Đăng nhập</span>
                                    </>
                                )}
                            </button>

                            <div className="relative my-6 flex items-center justify-center">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <span className="relative bg-white px-3 text-sm text-gray-400 font-medium">Hoặc</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={isSubmitting || loading}
                                className="w-full py-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-medium rounded-xl shadow-sm border border-gray-200 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span>Tiếp tục với Google</span>
                            </button>
                        </div>
                    </form>
                )}

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    Lần đầu đăng nhập Google? Chọn vai trò và lớp để Admin xét duyệt.
                </p>
            </div>
        </div>
    );
}
