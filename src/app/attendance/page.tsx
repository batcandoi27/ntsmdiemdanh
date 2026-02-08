'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Student, AttendanceStatus, Class } from '@/types/models';
import { submitAttendance, getAttendanceData } from '@/app/actions/attendance';
import { getClassAndStudents } from '@/app/actions/common';
import { Loader2, Calendar, Save, ArrowLeft, CheckCircle, AlertCircle, Clock, Ban, HelpCircle, UserX, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

export default function AttendancePage() {
    const searchParams = useSearchParams();
    const classId = searchParams.get('classId');
    const router = useRouter();

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [cls, setCls] = useState<Class | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // State for Attendance
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [notes, setNotes] = useState<Record<string, string>>({}); // NEW: Violation Mapping

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
        if (!classId) {
            router.push('/classes');
            return;
        }

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
                    // Reset if no record
                    setAttendance({});
                    setNotes({});
                }
            } catch (e) {
                console.error(e);
                setMsg({ type: 'error', text: 'Lỗi tải dữ liệu. Vui lòng thử lại.' });
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [classId, date]);

    const handleStatusChange = (studentCode: string, status: AttendanceStatus) => {
        if (status === 'VP') {
            // Open Modal
            setViolationInput(notes[studentCode] || '');
            setViolationModal({ isOpen: true, studentCode });
        } else {
            setAttendance(prev => ({
                ...prev,
                [studentCode]: prev[studentCode] === status ? '' : status
            }));
            // Clear violations if switching away from VP
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
        if (!classId) return;

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
        C: students.length - Object.values(attendance).filter(s => s !== '' && s !== 'C').length, // Default is C
        P: Object.values(attendance).filter(s => s === 'P').length,
        K: Object.values(attendance).filter(s => s === 'K').length,
        V: Object.values(attendance).filter(s => s === 'V').length,
        T: Object.values(attendance).filter(s => s === 'T').length,
        VP: Object.values(attendance).filter(s => s === 'VP').length,
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
    }

    if (!cls || students.length === 0) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-gray-700">Không tìm thấy dữ liệu lớp học</h2>
                <Link href="/classes" className="text-primary hover:underline mt-4 block">Quay lại danh sách</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-48"> {/* Increased padding for larger footer */}
            {/* Header Fixed */}
            <div className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <div className="flex justify-between items-center mb-2">
                        <Link href="/classes" className="text-gray-500 hover:text-primary p-2 -ml-2 rounded-full hover:bg-gray-100">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-xl font-bold text-primary-dark uppercase flex flex-col items-center">
                            <span>Điểm Danh Lớp {cls.name}</span>
                            <span className="text-xs text-gray-500 font-normal normal-case">
                                Sĩ số: {students.length}
                            </span>
                        </h1>
                        <div className="w-8"></div>
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-2">
                        <div className="relative flex-1">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {msg && (
                <div className={cn(
                    "fixed top-32 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-4 border",
                    msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                )}>
                    {msg.type === 'success' ? <CheckCircle size={20} className="text-green-600" /> : <AlertCircle size={20} className="text-red-600" />}
                    <span className="font-medium">{msg.text}</span>
                </div>
            )}

            {/* List */}
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-center text-sm text-indigo-700 mb-4 font-medium flex items-center justify-center gap-2">
                    <CheckCircle size={16} />
                    Mặc định tất cả là: <span className="font-bold">CÓ MẶT (C)</span>
                </div>

                {students.map((hs) => {
                    const status = attendance[hs.code] || '';
                    const violationNote = notes[hs.code];

                    return (
                        <div key={hs.code} className={cn(
                            "bg-white rounded-2xl p-4 shadow-sm border transition-all",
                            status ? "border-transparent ring-2 ring-primary/20 shadow-md" : "border-gray-100"
                        )}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="font-bold text-gray-800 text-lg">{hs.fullName}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                            #{hs.order}
                                        </span>
                                        {status === '' || status === 'C' ? (
                                            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                                <CheckCircle size={12} /> Có mặt
                                            </span>
                                        ) : status === 'VP' ? (
                                            <span className="text-xs font-bold text-purple-600 flex items-center gap-1">
                                                <Ban size={12} /> Vi phạm: {violationNote || 'Chi tiết...'}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold text-gray-500">
                                                {status === 'P' ? 'Có phép' : status === 'K' ? 'Không phép' : status === 'V' ? 'Vắng (??)' : 'Đi trễ'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons Row */}
                            <div className="flex gap-2 justify-between">
                                {/* Left Group: Absences */}
                                <div className="flex gap-1.5">
                                    <StatusBtn label="P" sub="Phép" color="warning" active={status === 'P'} onClick={() => handleStatusChange(hs.code, 'P')} icon={<HelpCircle size={16} />} />
                                    <StatusBtn label="K" sub="Không" color="danger" active={status === 'K'} onClick={() => handleStatusChange(hs.code, 'K')} icon={<UserX size={16} />} />
                                    <StatusBtn label="V" sub="Vắng?" color="gray" active={status === 'V'} onClick={() => handleStatusChange(hs.code, 'V')} icon={<HelpCircle size={16} />} />
                                </div>

                                {/* Right Group: Discipline */}
                                <div className="flex gap-1.5 pl-2 border-l border-gray-100">
                                    <StatusBtn label="T" sub="Trễ" color="info" active={status === 'T'} onClick={() => handleStatusChange(hs.code, 'T')} icon={<Clock size={16} />} />
                                    <StatusBtn label="VP" sub="Vi Phạm" color="purple" active={status === 'VP'} onClick={() => handleStatusChange(hs.code, 'VP')} icon={<Ban size={16} />} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Sticky Footer Stats & Action */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                <div className="max-w-4xl mx-auto flex flex-col gap-3">
                    {/* Detailed Stats Table */}
                    <div className="overflow-x-auto pb-2">
                        <table className="w-full text-center text-xs border-collapse">
                            <thead>
                                <tr className="text-gray-400">
                                    <th className="py-1">Sĩ số</th>
                                    <th className="py-1">Hiện diện</th>
                                    <th className="py-1 text-yellow-600">P</th>
                                    <th className="py-1 text-red-600">K</th>
                                    <th className="py-1 text-gray-600">V</th>
                                    <th className="py-1 text-blue-600">T</th>
                                    <th className="py-1 text-purple-600">VP</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="font-bold text-base">
                                    <td>{students.length}</td>
                                    <td className="text-green-600">{stats.C}</td>
                                    <td className="text-yellow-600">{stats.P}</td>
                                    <td className="text-red-600">{stats.K}</td>
                                    <td className="text-gray-600">{stats.V}</td>
                                    <td className="text-blue-600">{stats.T}</td>
                                    <td className="text-purple-600">{stats.VP}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-95"
                    >
                        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                        LƯU ĐIỂM DANH
                    </button>
                </div>
            </div>

            {/* Violation Modal */}
            <Modal
                isOpen={violationModal.isOpen}
                onClose={() => setViolationModal({ isOpen: false, studentCode: null })}
                title="Ghi Nhận Vi Phạm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Chọn lỗi vi phạm hoặc nhập lý do khác:</p>

                    <div className="grid grid-cols-2 gap-2">
                        {COMMON_VIOLATIONS.map(v => (
                            <button
                                key={v}
                                onClick={() => setViolationInput(v)}
                                className={cn(
                                    "py-2 px-3 rounded-lg text-sm font-medium border transition-colors",
                                    violationInput === v
                                        ? "bg-purple-100 border-purple-300 text-purple-700"
                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    <div>
                        <input
                            type="text"
                            placeholder="Nhập lỗi vi phạm khác (Hiện chữ đỏ)..."
                            value={violationInput}
                            onChange={(e) => setViolationInput(e.target.value)}
                            className={cn(
                                "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold",
                                violationInput && !COMMON_VIOLATIONS.includes(violationInput) ? "text-red-600 border-red-300 bg-red-50" : "text-gray-800 border-gray-300"
                            )}
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => setViolationModal({ isOpen: false, studentCode: null })}
                            className="px-4 py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-lg"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={confirmViolation}
                            className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-600/20"
                        >
                            Xác Nhận
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// Helper Component for Buttons
function StatusBtn({ label, sub, color, active, onClick, icon }: any) {
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
                "flex-1 min-w-[3.5rem] h-14 rounded-xl flex flex-col items-center justify-center border-2 transition-all active:scale-95",
                mapColor[color as keyof typeof mapColor],
                active ? "shadow-md transform -translate-y-1" : "bg-white"
            )}
        >
            <span className="text-lg font-black leading-none mb-0.5">{label}</span>
            <span className="text-[9px] font-bold uppercase opacity-90">{sub}</span>
        </button>
    );
}
