'use client';

import { useState, useEffect } from 'react';
import { AppUser, UserRole, ROLE_DISPLAY, Class } from '@/types/models';
import { updateUser } from '@/services/user-service';
import { adminCreateUser } from '@/app/actions/admin-users';
import { useAuth } from '@/context/auth-context';
import { X, Save, AlertCircle } from 'lucide-react';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit: AppUser | null;
    classes: Class[];
}

export function UserFormModal({ isOpen, onClose, onSuccess, userToEdit, classes }: UserFormModalProps) {
    const { appUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState<UserRole>('teacher');
    const [email, setEmail] = useState('');
    const [studentCode, setStudentCode] = useState('');
    const [password, setPassword] = useState('');
    const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);

    useEffect(() => {
        if (userToEdit) {
            setDisplayName(userToEdit.displayName);
            setRole(userToEdit.role);
            setEmail(userToEdit.email || '');
            setStudentCode(userToEdit.studentCode || '');
            setPassword(''); // Cannot edit password easily from here
            setAssignedClassIds(userToEdit.assignedClassIds || []);
        } else {
            setDisplayName('');
            setRole('teacher');
            setEmail('');
            setStudentCode('');
            setPassword('123456'); // Mật khẩu mặc định
            setAssignedClassIds([]);
        }
    }, [userToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (userToEdit) {
                // Edit mode
                await updateUser(userToEdit.uid, {
                    displayName,
                    role,
                    assignedClassIds,
                    });
            } else {
                // Create mode
                if (!appUser) throw new Error("Chưa đăng nhập");

                const res = await adminCreateUser({
                    displayName,
                    role,
                    email: role !== 'class_monitor' ? email : undefined,
                    studentCode: role === 'class_monitor' ? studentCode : undefined,
                    password,
                    assignedClassIds,
                    createdBy: appUser.uid,
                });

                if (!res.success) throw new Error(res.message);
            }
            onSuccess();
        } catch (err: any) {
            console.error('Lỗi lưu user:', err);
            setError(err.message || 'Có lỗi xảy ra khi lưu người dùng.');
        } finally {
            setLoading(false);
        }
    };

    const toggleClass = (classId: string) => {
        setAssignedClassIds(prev =>
            prev.includes(classId)
                ? prev.filter(id => id !== classId)
                : [...prev, classId]
        );
    };

    const isEditMode = !!userToEdit;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800">
                        {isEditMode ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white text-blue-700 font-bold hover:bg-blue-50 transition-colors"
                            >
                                <option value="teacher">Giáo viên</option>
                                <option value="class_monitor">Ban cán sự lớp</option>
                                <option value="supervisor">Giám thị</option>
                                <option value="principal">Hiệu trưởng / PHT</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên hiển thị</label>
                            <input
                                type="text"
                                required
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="VD: Cô Lê Hạnh Nhàn"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>

                        {role === 'class_monitor' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mã học sinh (Dùng làm tên đăng nhập)</label>
                                <input
                                    type="text"
                                    required
                                    disabled={isEditMode}
                                    value={studentCode}
                                    onChange={(e) => setStudentCode(e.target.value)}
                                    placeholder="VD: 8A13_01"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                />
                                {isEditMode && <p className="text-xs text-gray-500 mt-1">Không thể thay đổi mã đăng nhập sau khi tạo.</p>}
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email đăng nhập</label>
                                <input
                                    type="email"
                                    required
                                    disabled={isEditMode}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="VD: gv.admin@school.edu.vn"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                />
                                {isEditMode && <p className="text-xs text-gray-500 mt-1">Không thể đổi email qua form này.</p>}
                            </div>
                        )}

                        {!isEditMode && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                                <input
                                    type="text"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Mật khẩu tối thiểu 6 ký tự. Người dùng có thể tự đổi sau.</p>
                            </div>
                        )}

                        {(role === 'teacher' || role === 'class_monitor' || role === 'supervisor') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                                    <span>Phân công lớp</span>
                                    <span className="text-blue-600 cursor-pointer text-xs font-normal hover:underline" onClick={() => setAssignedClassIds(classes.map(c => c.id))}>
                                        Chọn tất cả
                                    </span>
                                </label>
                                <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto p-2 bg-gray-50/50">
                                    {classes.length === 0 ? (
                                        <p className="p-4 text-center text-sm text-gray-500">Chưa có dữ liệu lớp học</p>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {classes.map(c => (
                                                <label
                                                    key={c.id}
                                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${assignedClassIds.includes(c.id)
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'bg-white border-gray-100 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                        checked={assignedClassIds.includes(c.id)}
                                                        onChange={() => toggleClass(c.id)}
                                                    />
                                                    <span className={`text-sm font-medium truncate ${assignedClassIds.includes(c.id) ? 'text-blue-700' : 'text-gray-700'}`}>
                                                        {c.name}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {role === 'class_monitor' ? 'Ban cán sự chỉ nên được phân công 1 lớp.' : 'Giáo viên/Giám thị có thể được phân công nhiều lớp.'}
                                </p>
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        form="user-form"
                        disabled={loading}
                        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-70"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save size={16} />
                        )}
                        {isEditMode ? 'Cập nhật' : 'Tạo tài khoản'}
                    </button>
                </div>
            </div>
        </div>
    );
}
