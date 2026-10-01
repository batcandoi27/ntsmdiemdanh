'use client';

import { useState } from 'react';
import { Column, ColumnFrequency, Student } from '@/types/models';
import { createColumn } from '@/services/column-service';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/context/auth-context';
import { Plus, X, Save, Clock, Calendar, CheckSquare, Users, User, CreditCard, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    classId: string;
    className: string;
    students: Student[];
    initialFrequency?: ColumnFrequency;
    onSuccess: () => void;
}

export function CreateMonitorColumnModal({
    isOpen,
    onClose,
    classId,
    className,
    students,
    initialFrequency = 'one_time',
    onSuccess,
}: Props) {
    const { appUser } = useAuth();
    const [saving, setSaving] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [frequency, setFrequency] = useState<ColumnFrequency>(initialFrequency);
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [periodType, setPeriodType] = useState<'month' | 'semester' | 'custom'>('month');

    // Suggestions for one_time
    const [suggestions, setSuggestions] = useState<string[]>(['Đã nộp', 'Chưa nộp']);
    const [newSuggestion, setNewSuggestion] = useState('');

    // Scope
    const [scope, setScope] = useState<'all' | 'subset'>('all');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [studentSearch, setStudentSearch] = useState('');

    // VietQR & Parent Portal
    const [isSharedWithParents, setIsSharedWithParents] = useState(true);
    const [paymentEnabled, setPaymentEnabled] = useState(false);
    const [recipientType, setRecipientType] = useState<'school' | 'teacher'>('teacher');
    const [defaultAmount, setDefaultAmount] = useState<number>(0);

    const handleAddSuggestion = () => {
        if (!newSuggestion.trim()) return;
        if (!suggestions.includes(newSuggestion.trim())) {
            setSuggestions([...suggestions, newSuggestion.trim()]);
        }
        setNewSuggestion('');
    };

    const handleRemoveSuggestion = (index: number) => {
        setSuggestions(suggestions.filter((_, i) => i !== index));
    };

    const toggleStudent = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
        );
    };

    const toggleSelectAllStudents = () => {
        if (selectedStudentIds.length === students.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(students.map(s => s.id));
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Vui lòng nhập tên sổ');
            return;
        }

        if (frequency === 'period') {
            if (!startDate || !endDate) {
                toast.error('Vui lòng chọn ngày bắt đầu và kết thúc');
                return;
            }
        }

        if (scope === 'subset' && selectedStudentIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất một học sinh trong nhóm');
            return;
        }

        setSaving(true);
        try {
            const newId = `${classId}_custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            const columnData: Omit<Column, 'createdAt' | 'updatedAt'> = {
                id: newId,
                classId,
                userId: appUser?.uid || 'unknown',
                name: name.trim(),
                scope: 'custom',
                frequency,
                allowFreeText: true,
                archived: false,
                order: 10,
                isSharedWithParents,
                applicableScope: scope,
                applicableStudentIds: scope === 'subset' ? selectedStudentIds : undefined,
                paymentConfig: {
                    enabled: paymentEnabled,
                    recipientType,
                    defaultAmount: Number(defaultAmount) || 0,
                    unit: 'VNĐ',
                },
                periodConfig: frequency === 'period' ? {
                    type: periodType,
                    startDate,
                    endDate,
                } : undefined,
                subPeriods: [],
                suggestions: frequency === 'one_time' ? suggestions : [],
            };

            await createColumn(columnData);
            toast.success(`Đã tạo sổ "${name}" cho lớp ${className}`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating monitor column:', error);
            toast.error(error.message || 'Có lỗi xảy ra khi tạo sổ');
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s =>
        (s.fullName || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(studentSearch.toLowerCase()))
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Tạo Sổ Mới - Lớp ${className}`}>
            <div className="space-y-5 max-h-[75vh] overflow-y-auto px-1 py-1">
                {/* 1. Tên sổ */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                        Tên sổ theo dõi / Khoản thu <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="VD: Bảo hiểm tai nạn, Quỹ lớp tháng 10, Tiền học thêm toán..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        autoFocus
                    />
                </div>

                {/* 2. Loại theo dõi (Đồng bộ 100% chuẩn 3 loại như Cài đặt) */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Loại theo dõi
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                        <button
                            type="button"
                            onClick={() => setFrequency('daily')}
                            className={cn(
                                "p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-1.5 relative overflow-hidden",
                                frequency === 'daily'
                                    ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
                                    : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-full",
                                frequency === 'daily' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                            )}>
                                <Calendar size={20} />
                            </div>
                            <span className="font-bold text-xs">Theo ngày</span>
                            <span className={cn(
                                "text-[10px] leading-tight line-clamp-2",
                                frequency === 'daily' ? "text-blue-700" : "text-slate-500"
                            )}>
                                Ghi nhận mỗi ngày (VD: Tham gia hoạt động)
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFrequency('period')}
                            className={cn(
                                "p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-1.5 relative overflow-hidden",
                                frequency === 'period'
                                    ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
                                    : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-full",
                                frequency === 'period' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                            )}>
                                <Clock size={20} />
                            </div>
                            <span className="font-bold text-xs">Theo giai đoạn</span>
                            <span className={cn(
                                "text-[10px] leading-tight line-clamp-2",
                                frequency === 'period' ? "text-blue-700" : "text-slate-500"
                            )}>
                                Ghi nhận theo kỳ (VD: Học phí tháng)
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFrequency('one_time')}
                            className={cn(
                                "p-3 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-1.5 relative overflow-hidden",
                                frequency === 'one_time'
                                    ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
                                    : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-full",
                                frequency === 'one_time' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                            )}>
                                <CheckSquare size={20} />
                            </div>
                            <span className="font-bold text-xs">Một lần</span>
                            <span className={cn(
                                "text-[10px] leading-tight line-clamp-2",
                                frequency === 'one_time' ? "text-blue-700" : "text-slate-500"
                            )}>
                                Hoàn thành một lần (VD: Nộp hồ sơ)
                            </span>
                        </button>
                    </div>
                </div>

                {/* 3. Cấu hình thời gian nếu là Period */}
                {frequency === 'period' && (
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-3">
                        <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                            <Clock size={14} className="text-indigo-600" />
                            <span>Thời gian theo dõi giai đoạn</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Từ ngày</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Đến ngày</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Suggestions nếu là One-time */}
                {frequency === 'one_time' && (
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                            Gợi ý trạng thái nhanh
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {suggestions.map((sug, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200"
                                >
                                    <span>{sug}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSuggestion(idx)}
                                        className="text-slate-400 hover:text-red-500 p-0.5"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSuggestion}
                                onChange={e => setNewSuggestion(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSuggestion(); } }}
                                placeholder="Thêm gợi ý (VD: Đã nộp 50k, Miễn giảm)..."
                                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleAddSuggestion}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition"
                            >
                                Thêm
                            </button>
                        </div>
                    </div>
                )}

                {/* 5. Phạm vi áp dụng học sinh */}
                <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Phạm vi học sinh áp dụng
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            onClick={() => setScope('all')}
                            className={cn(
                                "p-3 rounded-xl border text-left transition flex items-center gap-2",
                                scope === 'all'
                                    ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <Users className={cn("w-4 h-4", scope === 'all' ? "text-blue-600" : "text-slate-400")} />
                            <div>
                                <div className={cn("text-xs font-bold", scope === 'all' ? "text-blue-900" : "text-slate-700")}>
                                    Tất cả học sinh
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    Áp dụng toàn bộ ({students.length} HS lớp {className})
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setScope('subset')}
                            className={cn(
                                "p-3 rounded-xl border text-left transition flex items-center gap-2",
                                scope === 'subset'
                                    ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <User className={cn("w-4 h-4", scope === 'subset' ? "text-amber-600" : "text-slate-400")} />
                            <div>
                                <div className={cn("text-xs font-bold", scope === 'subset' ? "text-amber-900" : "text-slate-700")}>
                                    Nhóm chỉ định
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    {selectedStudentIds.length} / {students.length} học sinh
                                </div>
                            </div>
                        </button>
                    </div>

                    {scope === 'subset' && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <input
                                    type="text"
                                    value={studentSearch}
                                    onChange={e => setStudentSearch(e.target.value)}
                                    placeholder="Tìm học sinh theo tên hoặc mã..."
                                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                                <button
                                    type="button"
                                    onClick={toggleSelectAllStudents}
                                    className="text-[11px] text-blue-600 hover:underline font-bold whitespace-nowrap"
                                >
                                    {selectedStudentIds.length === students.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                                </button>
                            </div>
                            <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100">
                                {filteredStudents.map(stud => (
                                    <label
                                        key={stud.id}
                                        className="flex items-center gap-2 py-1 px-1 cursor-pointer hover:bg-slate-100 rounded text-xs text-slate-700"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStudentIds.includes(stud.id)}
                                            onChange={() => toggleStudent(stud.id)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="font-semibold">{stud.fullName}</span>
                                        {stud.code && <span className="text-[10px] text-slate-400">({stud.code})</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 6. Tùy chọn nâng cao: VietQR & Phụ huynh */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
                    {/* Toggle Phụ huynh */}
                    <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                        <div className="flex items-center gap-2.5">
                            {isSharedWithParents ? (
                                <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                                <EyeOff className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <div>
                                <div className="text-xs font-bold text-slate-800">Hiển thị trên Cổng Phụ Huynh</div>
                                <div className="text-[11px] text-slate-500">Phụ huynh có thể tra cứu trạng thái và mã QR đóng tiền</div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={isSharedWithParents}
                            onChange={e => setIsSharedWithParents(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                    </label>

                    {/* Toggle VietQR */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-2.5">
                                <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                                <div>
                                    <div className="text-xs font-bold text-slate-800">Bật Thu Tiền Qua VietQR</div>
                                    <div className="text-[11px] text-slate-500">Tự động sinh mã VietQR kèm số tiền khi tra cứu</div>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={paymentEnabled}
                                onChange={e => setPaymentEnabled(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                        </label>

                        {paymentEnabled && (
                            <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Tài khoản thụ hưởng
                                    </label>
                                    <select
                                        value={recipientType}
                                        onChange={e => setRecipientType(e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                                    >
                                        <option value="teacher">Giáo viên chủ nhiệm</option>
                                        <option value="school">Tài khoản nhà trường</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Số tiền mặc định (VNĐ)
                                    </label>
                                    <input
                                        type="number"
                                        value={defaultAmount || ''}
                                        onChange={e => setDefaultAmount(Number(e.target.value) || 0)}
                                        placeholder="VD: 50000"
                                        step={1000}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Đang lưu...</span>
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                <span>Tạo Sổ Ngay</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
