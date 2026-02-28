'use client';

import { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, ShieldAlert, CheckCircle2, Shield, Loader2, Eye, EyeOff, Power, Check, X, Users } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import {
    getAllApiKeys,
    createApiKey,
    toggleApiKeyStatus,
    deleteApiKey,
    ApiKeyRecord
} from '@/services/api-key-service';
import { getRoleCodes, saveRoleCodes } from '@/app/actions/settings';
import { cn } from '@/lib/utils';

export function ApiTab() {
    const { appUser, loading: authLoading } = useAuth();
    const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Role Codes state
    const [roleCodes, setRoleCodes] = useState({
        principal: '',
        supervisor: '',
        teacher: '',
        gvbm: ''
    });
    const [savingRoles, setSavingRoles] = useState(false);
    const [roleSaveMsg, setRoleSaveMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Create form
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPermissions, setNewPermissions] = useState<string[]>(['read']);

    // UI state
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    const [visibleRoles, setVisibleRoles] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [keysData, rolesRes] = await Promise.all([
                getAllApiKeys(),
                getRoleCodes()
            ]);
            setKeys(keysData);
            if (rolesRes.success && rolesRes.roleCodes) {
                setRoleCodes(prev => ({ ...prev, ...rolesRes.roleCodes }));
            }
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRoleCodes = async () => {
        if (!appUser || appUser.role !== 'admin') return;
        setSavingRoles(true);
        setRoleSaveMsg(null);
        try {
            const res = await saveRoleCodes(roleCodes, appUser.role);
            if (res.success) {
                setRoleSaveMsg({ type: 'success', text: res.message });
                setTimeout(() => setRoleSaveMsg(null), 3000);
            } else {
                setRoleSaveMsg({ type: 'error', text: res.message });
            }
        } catch (error) {
            setRoleSaveMsg({ type: 'error', text: 'Đã xảy ra lỗi' });
        } finally {
            setSavingRoles(false);
        }
    };

    const handleCreateKey = async () => {
        if (!appUser || !newName.trim()) return;

        setActionLoading(true);
        try {
            const newKey = await createApiKey(appUser, newName.trim(), newPermissions);
            setKeys([newKey, ...keys]);
            setNewName('');
            setIsCreating(false);

            // Auto show the newly created key once so user can copy it
            setVisibleKeys(prev => ({ ...prev, [newKey.id]: true }));
        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra khi tạo mã mới.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleStatus = async (key: ApiKeyRecord) => {
        setActionLoading(true);
        try {
            await toggleApiKeyStatus(key.id, !key.isActive);
            setKeys(keys.map(k => k.id === key.id ? { ...k, isActive: !key.isActive } : k));
        } catch (error) {
            console.error(error);
            alert('Lỗi khi đổi trạng thái mã vùng.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (key: ApiKeyRecord) => {
        if (!confirm('Hành động này không thể hoàn tác. Các ứng dụng đang dùng khoá này sẽ bị gián đoạn. Bạn có chắc chắn xoá?')) {
            return;
        }

        setActionLoading(true);
        try {
            await deleteApiKey(key.id);
            setKeys(keys.filter(k => k.id !== key.id));
        } catch (error) {
            console.error(error);
            alert('Lỗi khi xoá mã vùng.');
        } finally {
            setActionLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(text);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleVisibility = (id: string, isRoleCode = false) => {
        if (isRoleCode) {
            setVisibleRoles(prev => ({ ...prev, [id]: !prev[id] }));
        } else {
            setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
        }
    };

    const maskKey = (keyStr: string) => {
        if (!keyStr) return '';
        if (keyStr.length <= 12) return '********';
        return `${keyStr.substring(0, 8)}...${keyStr.substring(keyStr.length - 4)}`;
    };

    if (authLoading) return null;

    if (appUser?.role !== 'admin') {
        return <div className="p-8 text-center text-gray-500">Chỉ Admin mới có quyền quản lý cấu hình hệ thống năng cao.</div>;
    }

    return (
        <div className="space-y-6">

            {/* Role Codes Configuration */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="text-indigo-600" size={20} />
                            Mã Phân Quyền Đăng Ký (Role Codes)
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Sử dụng cấp quyền tự động cho giáo viên khi đăng nhập Google lần đầu.</p>
                    </div>
                    <button
                        onClick={handleSaveRoleCodes}
                        disabled={savingRoles || loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:bg-indigo-800 font-medium transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50"
                    >
                        {savingRoles ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                        Lưu Thay Đổi
                    </button>
                </div>

                {roleSaveMsg && (
                    <div className={cn("p-3 mb-5 rounded-lg text-sm border flex items-center gap-2", roleSaveMsg.type === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                        {roleSaveMsg.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
                        {roleSaveMsg.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Hiệu trưởng */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Mã Hiệu Trưởng</label>
                        <div className="relative">
                            <input
                                type={visibleRoles['principal'] ? "text" : "password"}
                                value={roleCodes.principal}
                                onChange={async (e) => setRoleCodes(p => ({ ...p, principal: e.target.value }))}
                                placeholder="BGH_DEFAULT_2026"
                                className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                            />
                            <button onClick={async () => toggleVisibility('principal', true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {visibleRoles['principal'] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    {/* Giám thị */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Mã Giám Thị</label>
                        <div className="relative">
                            <input
                                type={visibleRoles['supervisor'] ? "text" : "password"}
                                value={roleCodes.supervisor}
                                onChange={async (e) => setRoleCodes(p => ({ ...p, supervisor: e.target.value }))}
                                placeholder="GIAMTHI_DEFAULT_2026"
                                className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                            />
                            <button onClick={async () => toggleVisibility('supervisor', true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {visibleRoles['supervisor'] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    {/* GVCN */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Mã GVCN</label>
                        <div className="relative">
                            <input
                                type={visibleRoles['teacher'] ? "text" : "password"}
                                value={roleCodes.teacher}
                                onChange={async (e) => setRoleCodes(p => ({ ...p, teacher: e.target.value }))}
                                placeholder="GVCN_DEFAULT_2026"
                                className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                            />
                            <button onClick={async () => toggleVisibility('teacher', true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {visibleRoles['teacher'] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    {/* GVBM */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Mã GV Bộ Môn</label>
                        <div className="relative">
                            <input
                                type={visibleRoles['gvbm'] ? "text" : "password"}
                                value={roleCodes.gvbm}
                                onChange={async (e) => setRoleCodes(p => ({ ...p, gvbm: e.target.value }))}
                                placeholder="GVBM_DEFAULT_2026"
                                className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                            />
                            <button onClick={async () => toggleVisibility('gvbm', true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {visibleRoles['gvbm'] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-gray-200">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Key className="text-blue-600" size={20} />
                        API Keys (App bên thứ ba)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Cấp quyền truy cập hệ thống điểm danh qua REST API</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={async () => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm shadow-sm"
                    >
                        <Plus size={16} />
                        Tạo Secret Key Mới
                    </button>
                )}
            </div>

            {/* Create Form */}
            {isCreating && (
                <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ShieldAlert size={18} className="text-blue-600" />
                        Tạo Secret Key Mới
                    </h4>

                    <div className="space-y-4 max-w-lg">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tên Ứng Dụng / Mục Đích</label>
                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={async e => setNewName(e.target.value)}
                                placeholder="Vd: Zalo Mini App, Cổng Phụ Huynh..."
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Phân quyền gốc</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newPermissions.includes('read')}
                                        onChange={async e => {
                                            if (e.target.checked) setNewPermissions([...newPermissions, 'read']);
                                            else setNewPermissions(newPermissions.filter(p => p !== 'read'));
                                        }}
                                        className="text-blue-600 focus:ring-blue-500 rounded h-4 w-4"
                                    />
                                    <span className="text-sm text-gray-700">Chỉ Đọc (Read-only)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newPermissions.includes('write')}
                                        onChange={async e => {
                                            if (e.target.checked) setNewPermissions([...newPermissions, 'write']);
                                            else setNewPermissions(newPermissions.filter(p => p !== 'write'));
                                        }}
                                        className="text-blue-600 focus:ring-blue-500 rounded h-4 w-4"
                                    />
                                    <span className="text-sm text-gray-700">Đánh dấu (Read & Write)</span>
                                </label>
                            </div>
                        </div>

                        <div className="pt-3 flex gap-3">
                            <button
                                onClick={handleCreateKey}
                                disabled={actionLoading || !newName.trim()}
                                className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Tạo Mã'}
                            </button>
                            <button
                                onClick={async () => { setIsCreating(false); setNewName(''); }}
                                className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Huỷ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keys Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-700 font-medium">
                            <tr>
                                <th className="px-5 py-3.5">Key Name</th>
                                <th className="px-5 py-3.5">Secret Key</th>
                                <th className="px-5 py-3.5">Quyền hạn</th>
                                <th className="px-5 py-3.5">Người tạo</th>
                                <th className="px-5 py-3.5">Ngày tạo</th>
                                <th className="px-5 py-3.5 text-center">Trạng thái</th>
                                <th className="px-5 py-3.5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                                        <div className="flex justify-center mb-2">
                                            <Loader2 size={24} className="animate-spin text-blue-500" />
                                        </div>
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : keys.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                                        Chưa có API Key nào được tạo trong hệ thống.
                                    </td>
                                </tr>
                            ) : (
                                keys.map(key => (
                                    <tr key={key.id} className={cn("hover:bg-gray-50/50 transition-colors", !key.isActive && "opacity-60")}>
                                        <td className="px-5 py-4 font-bold text-gray-900">{key.name}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 font-mono bg-gray-100 px-3 py-1.5 rounded-lg text-xs tracking-wider border border-gray-200">
                                                {visibleKeys[key.id] ? key.id : maskKey(key.id)}

                                                <div className="flex gap-1 ml-auto">
                                                    <button
                                                        onClick={() => toggleVisibility(key.id)}
                                                        className="text-gray-400 hover:text-gray-700"
                                                        title={visibleKeys[key.id] ? "Ẩn mã" : "Hiển thị mã"}
                                                    >
                                                        {visibleKeys[key.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => copyToClipboard(key.id)}
                                                        className={cn(
                                                            "transition-colors",
                                                            copiedId === key.id ? "text-emerald-500" : "text-gray-400 hover:text-blue-600"
                                                        )}
                                                        title="Copy mã"
                                                    >
                                                        {copiedId === key.id ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex gap-1">
                                                {key.permissions.map(p => (
                                                    <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded border border-blue-100">
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-medium text-gray-500">
                                            {key.userName}
                                        </td>
                                        <td className="px-5 py-4 text-xs">
                                            {new Date(key.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {key.isActive ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                                                    Hoạt động
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-full">
                                                    Đã khoá
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(key)}
                                                    disabled={actionLoading}
                                                    className={cn(
                                                        "p-1.5 rounded-lg transition-colors border shadow-sm",
                                                        key.isActive
                                                            ? "bg-white border-orange-200 text-orange-600 hover:bg-orange-50"
                                                            : "bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                                    )}
                                                    title={key.isActive ? "Vô hiệu hoá (Khoá)" : "Kích hoạt lại"}
                                                >
                                                    <Power size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(key)}
                                                    disabled={actionLoading}
                                                    className="p-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shadow-sm"
                                                    title="Xoá vĩnh viễn"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 text-sm text-blue-800">
                <Shield className="shrink-0 mt-0.5 text-blue-600" size={18} />
                <div>
                    <h4 className="font-bold mb-1">Bảo mật API Key</h4>
                    <p className="opacity-90">API Key cho phép bên thứ ba (hoặc ứng dụng ngoài) gọi API tới hệ thống. Để bảo mật, không chia sẻ khoá này lên mã nguồn mở hoặc những nơi công cộng. Có thể vô hiệu hoá bất cứ lúc nào nếu nghi ngờ bị lộ.</p>
                </div>
            </div>
        </div>
    );
}
