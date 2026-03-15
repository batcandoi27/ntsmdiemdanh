'use client';

import { useState, useEffect } from 'react';
import { AppUser, UserRole, ROLE_DISPLAY } from '@/types/models';
import { deactivateUser, activateUser, getUsersPaginated } from '@/services/user-service';
import { deleteUserAccount } from '@/app/actions/admin-users';
import { useAuth } from '@/context/auth-context';
import { Users, Search, Plus, UserCheck, UserX, Edit, MoreVertical, Shield, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Class } from '@/types/models';
import { db } from '@/services/db';
import { UserFormModal } from './user-form-modal';

export function UserManagementTab() {
    const { appUser, loading: authLoading } = useAuth();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');

    // Pagination state
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const PAGE_SIZE = 20;

    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, classesData] = await Promise.all([
                getUsersPaginated(PAGE_SIZE),
                db.getClasses()
            ]);

            setUsers(usersRes.users);
            setHasMore(usersRes.hasMore);
            setClasses(classesData);
        } catch (error) {
            console.error('Lỗi tải dữ liệu người dùng:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (!hasMore || loadingMore || users.length === 0) return;

        setLoadingMore(true);
        try {
            const lastUid = users[users.length - 1].uid;
            const res = await getUsersPaginated(PAGE_SIZE, lastUid);
            setUsers(prev => [...prev, ...res.users]);
            setHasMore(res.hasMore);
        } catch (error) {
            console.error('Lỗi khi tải thêm người dùng:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleToggleStatus = async (user: AppUser) => {
        if (!confirm(`Bạn có chắc muốn ${user.isActive ? 'vô hiệu hoá' : 'kích hoạt'} tài khoản ${user.displayName}?`)) return;

        try {
            if (user.isActive) {
                await deactivateUser(user.uid);
            } else {
                await activateUser(user.uid);
            }
            // Update local state
            setUsers(users.map(u => u.uid === user.uid ? { ...u, isActive: !user.isActive } : u));
        } catch (error) {
            alert('Lỗi khi cập nhật trạng thái');
            console.error(error);
        }
    };

    const handleDeleteUser = async (user: AppUser) => {
        const confirmMsg = `CẢNH BÁO NGUY HIỂM!\n\nBạn sắp xoá VĨNH VIỄN tài khoản của "${user.displayName}" (${user.email || user.studentCode}).\n\nHành động này không thể khôi phục. Bạn có chắc chắn muốn tiếp tục không?`;

        if (!confirm(confirmMsg)) return;

        try {
            setLoading(true);
            const res = await deleteUserAccount(user.uid);
            if (res.success) {
                alert(res.message);
                // Cập nhật local state bằng cách lọc bỏ user đã xoá
                setUsers(prev => prev.filter(u => u.uid !== user.uid));
            } else {
                alert('Lỗi: ' + res.message);
            }
        } catch (error: any) {
            alert('Lỗi khi xoá tài khoản: ' + error.message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setIsFormOpen(true);
    };

    const openEditModal = (user: AppUser) => {
        setEditingUser(user);
        setIsFormOpen(true);
    };

    const onFormSuccess = () => {
        loadData();
        setIsFormOpen(false);
    };

    const filteredUsers = users.filter(u => {
        const matchSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.studentCode && u.studentCode.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.isActive : !u.isActive);
        return matchSearch && matchRole && matchStatus;
    });

    if (authLoading) return null;

    if (appUser?.role !== 'admin' && appUser?.role !== 'principal') {
        return <div className="p-8 text-center text-gray-500">Bạn không có quyền truy cập chức năng này.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-blue-600" size={20} />
                        Quản lý Tài khoản
                    </h2>
                    <p className="text-sm text-gray-500">Tạo và phân quyền cho người dùng hệ thống</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            if (confirm('Chức năng này sẽ tạo hàng loạt tài khoản cho GVCN, Giám Thị Khối và Lớp trưởng dựa trên danh sách Lớp hiện có.\n\nLƯU Ý QUAN TRỌNG: Do bảo mật của Firebase, tài khoản Admin hiện tại sẽ bị BẤT BỘC ĐĂNG XUẤT sau khi tiến trình hoàn tất. Bạn có muốn tiếp tục?')) {
                                try {
                                    setLoading(true);
                                    const { batchCreateAccounts } = await import('@/services/user-service');
                                    await batchCreateAccounts(classes, appUser?.uid || '', (msg) => {
                                        console.log(msg); // Mở console để xem progress
                                    });
                                    alert('Tạo tài khoản hoàn tất! Vui lòng đăng nhập lại.');
                                    // Đăng xuất admin
                                    const { auth } = await import('@/lib/firebase');
                                    await auth.signOut();
                                } catch (e: any) {
                                    alert('Lỗi: ' + e.message);
                                    setLoading(false);
                                }
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium transition-colors"
                        title="Tạo TK Tự Động (GVCN, Giám Thị, Cán Sự)"
                    >
                        <Shield size={18} />
                        <span className="hidden sm:inline">Tạo Tự Động</span>
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Tạo tài khoản</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm theo tên, email, mã HS..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white text-blue-700 font-bold hover:bg-blue-50 transition-colors"
                >
                    <option value="all">Tất cả vai trò</option>
                    <option value="admin">Admin</option>
                    <option value="principal">Hiệu trưởng / PHT</option>
                    <option value="supervisor">Giám thị</option>
                    <option value="teacher">Giáo viên</option>
                    <option value="class_monitor">Ban cán sự</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white text-blue-700 font-bold hover:bg-blue-50 transition-colors"
                >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="pending">Chờ duyệt</option>
                </select>
            </div>

            {/* User List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-700">
                            <tr>
                                <th className="px-5 py-3.5 font-semibold">Tài khoản</th>
                                <th className="px-5 py-3.5 font-semibold">Vai trò</th>
                                <th className="px-5 py-3.5 font-semibold">Quyền truy cập lớp</th>
                                <th className="px-5 py-3.5 font-semibold">Trạng thái</th>
                                <th className="px-5 py-3.5 font-semibold text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                                        <div className="flex justify-center mb-2">
                                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                                        Không tìm thấy tài khoản nào khớp với điều kiện tìm kiếm.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => {
                                    const roleInfo = ROLE_DISPLAY[user.role];

                                    // Parse classes assigned
                                    let assignedText = '';
                                    if (user.permissions.canViewAllClasses) {
                                        assignedText = 'Tất cả các lớp';
                                    } else if (user.assignedClassIds.length > 0) {
                                        if (user.assignedClassIds.length > 3) {
                                            assignedText = `${user.assignedClassIds.length} lớp được phân công`;
                                        } else {
                                            assignedText = user.assignedClassIds.join(', ');
                                        }
                                    } else {
                                        assignedText = 'Chưa phân lớp';
                                    }

                                    return (
                                        <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="font-medium text-gray-900">{user.displayName}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {user.email || user.studentCode}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100">
                                                    <span>{roleInfo?.badge}</span>
                                                    <span className={roleInfo?.color}>{roleInfo?.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-gray-600">{assignedText}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {user.isActive ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-full">
                                                        <UserCheck size={14} />
                                                        Đang hoạt động
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-full">
                                                        <UserX size={14} />
                                                        Vô hiệu hoá
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Edit size={18} />
                                                    </button>

                                                    {user.uid !== appUser?.uid && (
                                                        <>
                                                            <button
                                                                onClick={() => handleToggleStatus(user)}
                                                                className={cn(
                                                                    "p-2 rounded-lg transition-colors",
                                                                    user.isActive
                                                                        ? "text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                                                        : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                                )}
                                                                title={user.isActive ? "Vô hiệu hoá" : "Kích hoạt"}
                                                            >
                                                                <Shield size={18} />
                                                            </button>

                                                            <button
                                                                onClick={() => handleDeleteUser(user)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                                title="Xoá vĩnh viễn"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {loadingMore ? (
                            <>
                                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                                Đang tải...
                            </>
                        ) : (
                            'Xem thêm'
                        )}
                    </button>
                </div>
            )}

            {/* Modal */}
            {isFormOpen && (
                <UserFormModal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={onFormSuccess}
                    userToEdit={editingUser}
                    classes={classes}
                />
            )}
        </div>
    );
}
