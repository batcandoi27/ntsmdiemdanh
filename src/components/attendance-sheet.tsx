'use client';

import { useState, useEffect, useTransition } from 'react';
import { Student, AttendanceStatus, Class } from '@/types/models';
import { submitAttendance, getAttendanceData } from '@/app/actions/attendance';
import { getClassAndStudents } from '@/app/actions/common';
import { Loader2, Calendar, Save, CheckCircle, AlertCircle, Clock, Ban, HelpCircle, UserX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

interface AttendanceSheetProps {
    classId: string;
    onClose?: () => void; // Optional close handler if needed
}

export function AttendanceSheet({ classId, onClose }: AttendanceSheetProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [cls, setCls] = useState<Class | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // State for Attendance
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});

    const [loading, setLoading] = useState(true);
    const [isSaving, startTransition] = useTransition();
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modal for Violation
    const [violationModal, setViolationModal] = useState<{ isOpen: boolean, studentCode: string | null }>({ isOpen: false, studentCode: null });
    const [violationInput, setViolationInput] = useState('');

    const COMMON_VIOLATIONS = [
        "Đồng phục", "Điện thoại", "Chạy giỡn", "Ăn quà vặt", "Nói chuyện riêng", "Không thuộc bài"
    ];

    // Load Data
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // 1. Get Class & Students
                const { cls: c, students: s } = await getClassAndStudents(classId);
                setCls(c);
                setStudents(s);

                // 2. Get Existing Attendance
                const record = await getAttendanceData(classId, date);
                if (record) {
                    setAttendance(record.absences);
                    setNotes(record.notes || {});
                } else {
                    setAttendance({});
                    setNotes({});
                }
            } catch (e) {
                console.error(e);
                setMsg({ type: 'error', text: 'Lỗi tải dữ liệu.' });
            } finally {
                setLoading(false);
            }
        };

        if (classId) init();
    }, [classId, date]);

    const handleStatusChange = (studentCode: string, status: AttendanceStatus) => {
        if (status === 'VP') {
            setViolationInput(notes[studentCode] || '');
            setViolationModal({ isOpen: true, studentCode });
        } else {
            setAttendance(prev => ({
                ...prev,
                [studentCode]: prev[studentCode] === status ? '' : status
            }));
            if (attendance[studentCode] === 'VP' && status !== 'VP') {
                const newNotes = { ...notes };
                delete newNotes[studentCode];
                setNotes(newNotes);
            }
        }
    };

    const confirmViolation = () => {
        if (violationModal.studentCode) {
            setAttendance(prev => ({
                ...prev,
                [violationModal.studentCode!]: 'VP'
            }));
            if (violationInput.trim()) {
                setNotes(prev => ({
                    ...prev,
                    [violationModal.studentCode!]: violationInput.trim()
                }));
            }
        }
        setViolationModal({ isOpen: false, studentCode: null });
    };

    const handleSave = () => {
        startTransition(async () => {
            const res = await submitAttendance(classId, date, attendance, notes);
            if (res.success) {
                setMsg({ type: 'success', text: 'Đã lưu điểm danh thành công!' });
                setTimeout(() => setMsg(null), 3000);
            } else {
                setMsg({ type: 'error', text: res.message });
            }
        });
    };

    // Stats
    const stats = {
        P: Object.values(attendance).filter(s => s === 'P').length,
        K: Object.values(attendance).filter(s => s === 'K').length,
        V: Object.values(attendance).filter(s => s === 'V').length,
        T: Object.values(attendance).filter(s => s === 'T').length,
        VP: Object.values(attendance).filter(s => s === 'VP').length,
    };
    // Calculate Present (C)
    // Updated Logic: Present include T (Late) and VP (Violation), unless they are explicitly marked as Absent (P, K, V).
    // So Present = Students - (P + K + V)
    const countPresent = students.length - (stats.P + stats.K + stats.V);


    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (!cls) return <div>Không tìm thấy lớp</div>;

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden animate-in slide-in-from-top-4 duration-300">
            {/* Header */}
            <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-blue-900">
                        ĐIỂM DANH LỚP {cls.name}
                    </h3>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                        Sĩ số: {students.length}
                    </span>
                </div>

                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="pl-9 pr-3 py-2 border border-blue-200 rounded-lg text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {msg && (
                <div className={cn(
                    "mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 text-sm font-medium",
                    msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}>
                    {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {msg.text}
                </div>
            )}

            {/* Student List */}
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-center text-xs text-indigo-700 mb-2 font-medium flex items-center justify-center gap-2">
                    <CheckCircle size={14} />
                    Mặc định: <span className="font-bold">CÓ MẶT (C)</span>
                </div>

                {students.map((hs) => {
                    const status = attendance[hs.code] || '';
                    const violationNote = notes[hs.code];

                    return (
                        <div key={hs.code} className={cn(
                            "bg-white rounded-xl p-3 border transition-all hover:shadow-md",
                            status ? "border-blue-200 ring-1 ring-blue-100 shadow-sm" : "border-gray-100"
                        )}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                <div className="min-w-[180px]">
                                    <div className="font-bold text-gray-800">{hs.fullName}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">#{hs.order}</span>
                                        {status === '' || status === 'C' ? (
                                            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle size={10} /> Có mặt</span>
                                        ) : status === 'VP' ? (
                                            <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1"><Ban size={10} /> {violationNote || 'Vi phạm'}</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-500">
                                                {status === 'P' ? 'Có phép' : status === 'K' ? 'Không phép' : status === 'V' ? 'Vắng?' : 'Đi trễ'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-1 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                    <div className="flex gap-1 pr-2 border-r border-gray-100">
                                        <StatusBtn label="P" sub="Phép" color="warning" active={status === 'P'} onClick={() => handleStatusChange(hs.code, 'P')} compact />
                                        <StatusBtn label="K" sub="Không" color="danger" active={status === 'K'} onClick={() => handleStatusChange(hs.code, 'K')} compact />
                                        <StatusBtn label="V" sub="Vắng?" color="gray" active={status === 'V'} onClick={() => handleStatusChange(hs.code, 'V')} compact />
                                    </div>
                                    <div className="flex gap-1 pl-2">
                                        <StatusBtn label="T" sub="Trễ" color="info" active={status === 'T'} onClick={() => handleStatusChange(hs.code, 'T')} compact />
                                        <StatusBtn label="VP" sub="Vi Phạm" color="purple" active={status === 'VP'} onClick={() => handleStatusChange(hs.code, 'VP')} compact />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Stats & Save */}
            <div className="bg-gray-50 border-t border-gray-200 p-4">
                <div className="flex flex-wrap justify-center gap-4 text-xs font-bold text-gray-500 mb-4 uppercase">
                    <div className="flex flex-col items-center"><span className="text-xl text-green-600 leading-none">{countPresent}</span>Hiện diện</div>
                    <div className="w-px bg-gray-300 h-8"></div>
                    <div className="flex flex-col items-center"><span className="text-xl text-yellow-500 leading-none">{stats.P}</span>Phép</div>
                    <div className="flex flex-col items-center"><span className="text-xl text-red-500 leading-none">{stats.K}</span>Không</div>
                    <div className="flex flex-col items-center"><span className="text-xl text-gray-400 leading-none">{stats.V}</span>Vắng?</div>
                    <div className="w-px bg-gray-300 h-8"></div>
                    <div className="flex flex-col items-center"><span className="text-xl text-blue-500 leading-none">{stats.T}</span>Trễ</div>
                    <div className="flex flex-col items-center"><span className="text-xl text-purple-500 leading-none">{stats.VP}</span>Vi phạm</div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-95"
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    LƯU ĐIỂM DANH
                </button>
            </div>

            {/* Violation Modal */}
            <Modal
                isOpen={violationModal.isOpen}
                onClose={() => setViolationModal({ isOpen: false, studentCode: null })}
                title="Ghi Nhận Vi Phạm"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        {COMMON_VIOLATIONS.map(v => (
                            <button
                                key={v}
                                onClick={() => setViolationInput(v)}
                                className={cn(
                                    "py-2 px-3 rounded-lg text-sm font-medium border transition-colors",
                                    violationInput === v ? "bg-purple-100 border-purple-300 text-purple-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Nhập lỗi khác..."
                            value={violationInput}
                            onChange={(e) => setViolationInput(e.target.value)}
                            className={cn(
                                "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold",
                                violationInput && !COMMON_VIOLATIONS.includes(violationInput) ? "text-red-600 border-red-300 bg-red-50" : "text-gray-800 border-gray-300"
                            )}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setViolationModal({ isOpen: false, studentCode: null })} className="px-3 py-1.5 text-gray-500 text-sm hover:bg-gray-100 rounded">Hủy</button>
                        <button onClick={confirmViolation} className="px-3 py-1.5 bg-purple-600 text-white font-bold text-sm rounded shadow-sm">Xác Nhận</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// Compact Button for Sheet
function StatusBtn({ label, sub, color, active, onClick, compact }: any) {
    const mapColor = {
        warning: active ? "bg-yellow-500 text-white border-yellow-600" : "text-yellow-600 hover:bg-yellow-50 border-gray-200",
        danger: active ? "bg-red-500 text-white border-red-600" : "text-red-600 hover:bg-red-50 border-gray-200",
        gray: active ? "bg-gray-500 text-white border-gray-600" : "text-gray-500 hover:bg-gray-50 border-gray-200",
        info: active ? "bg-blue-500 text-white border-blue-600" : "text-blue-500 hover:bg-blue-50 border-gray-200",
        purple: active ? "bg-purple-500 text-white border-purple-600" : "text-purple-600 hover:bg-purple-50 border-gray-200",
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "rounded-lg flex flex-col items-center justify-center border transition-all active:scale-95",
                compact ? "w-10 h-10" : "w-12 h-14",
                mapColor[color as keyof typeof mapColor],
                active ? "shadow-md transform -translate-y-0.5" : "bg-white"
            )}
        >
            <span className={cn("font-black leading-none", compact ? "text-sm" : "text-lg")}>{label}</span>
            {!compact && <span className="text-[9px] font-bold uppercase opacity-90">{sub}</span>}
        </button>
    );
}
