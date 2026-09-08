'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    BookOpen,
    Calendar,
    CreditCard,
    ArrowLeft,
    CheckCircle2,
    Sparkles,
    UserCheck,
    FileText,
    QrCode,
    Receipt,
    Printer,
    Edit3,
    Clock,
    AlertCircle,
    Check
} from 'lucide-react';
import { ParentHomeworkTab } from '@/components/portal/parent-homework-tab';
import { ParentTimetableTab } from '@/components/portal/parent-timetable-tab';
import { StudentCurriculumVitaeTab } from '@/components/portal/student-curriculum-vitae-tab';
import { VietQRPaymentModal } from '@/components/portal/vietqr-payment-modal';
import { DailyHomeworkModal } from '@/components/student/daily-homework-modal';
import { getParentStudentOverview } from '@/services/homeroom-service';
import { ParentStudentOverview } from '@/types/homeroom';
import { Student, Class } from '@/types/models';
import { db } from '@/services/db';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/auth-context';

export default function StudentStudyPortalPage() {
    const { appUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'homework' | 'timetable' | 'tuition' | 'attendance' | 'cv'>('homework');
    const [studentObj, setStudentObj] = useState<Student | null>(null);
    const [studentInfo, setStudentInfo] = useState<{
        studentId: string;
        studentCode: string;
        studentName: string;
        classId: string;
        className: string;
    }>({
        studentId: '',
        studentCode: 'HS-821',
        studentName: 'Nguyễn Văn An',
        classId: '',
        className: '8A13'
    });

    const [overview, setOverview] = useState<ParentStudentOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);

    // Modal VietQR
    const [paymentModalData, setPaymentModalData] = useState<{
        isOpen: boolean;
        title: string;
        amount: number;
        columnId: string;
        periodKey?: string;
        periodLabel?: string;
        bankInfo: any;
    } | null>(null);

    useEffect(() => {
        initSessionAndData();
    }, [appUser]);

    const initSessionAndData = async () => {
        setLoading(true);
        try {
            const classes = await db.getClasses();
            let matchedClass = classes.find(c => c.name === '8A13') || classes[0];

            let stCode = 'HS-821';
            let stName = 'Nguyễn Văn An';
            let clsName = matchedClass?.name || '8A13';
            let clsId = matchedClass?.id || '';

            // 1. Kiểm tra tài khoản Auth đang đăng nhập (Ban cán sự / Học sinh)
            if (appUser) {
                stName = appUser.displayName || 'Trần Thử Nghiệm';
                stCode = appUser.studentCode || 'TEST9999';
                if (appUser.assignedClassIds && appUser.assignedClassIds.length > 0) {
                    const foundCls = classes.find(c => c.id === appUser.assignedClassIds![0]);
                    if (foundCls) {
                        clsId = foundCls.id;
                        clsName = foundCls.name;
                    }
                }
            } else {
                // 2. Check localStorage session
                const savedSession = localStorage.getItem('tbc_student_session');
                if (savedSession) {
                    try {
                        const parsed = JSON.parse(savedSession);
                        if (parsed.className) clsName = parsed.className;
                        if (parsed.studentCode) stCode = parsed.studentCode;
                        if (parsed.studentName) stName = parsed.studentName;
                        const foundCls = classes.find(c => c.name === clsName);
                        if (foundCls) clsId = foundCls.id;
                    } catch {
                        // Ignore
                    }
                }
            }

            // Find matching student in DB if exists
            let stId = '';
            let currentStudent: Student | null = null;
            if (clsId) {
                const students = await db.getStudentsByClass(clsId);
                if (students && students.length > 0) {
                    const foundStudent = students.find(s => s.code === stCode || s.fullName === stName) || students[0];
                    currentStudent = foundStudent;
                    stId = foundStudent.id;
                    stName = foundStudent.fullName;
                    stCode = foundStudent.code;
                }
            }

            if (!currentStudent && clsId) {
                currentStudent = {
                    id: stId || 'std-1',
                    code: stCode,
                    classId: clsId,
                    order: 1,
                    fullName: stName,
                    firstName: 'An',
                    lastName: 'Nguyễn Văn',
                    gender: 'Nam',
                    birthday: '01/01/2012',
                    status: 'Đang học'
                };
            }

            setStudentObj(currentStudent);
            setStudentInfo({
                studentId: stId,
                studentCode: stCode,
                studentName: stName,
                classId: clsId,
                className: clsName
            });

            if (stId && clsId) {
                const ov = await getParentStudentOverview(stId, clsId);
                setOverview(ov);
            }
        } catch (err) {
            console.error('Error initializing student study portal:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200 pb-12 max-w-6xl mx-auto">
            
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/95 backdrop-blur border border-slate-200 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3">
                    <Link
                        href="/student"
                        className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-2 text-xs font-bold shadow-2xs"
                    >
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">Trở Về Trang Chủ Học Sinh</span>
                    </Link>

                    <div className="h-6 w-px bg-slate-200" />

                    <div>
                        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                            🎓 Khu Vực Học Tập
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                                Lớp {studentInfo.className}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                            Học sinh: <span className="font-bold text-slate-800">{studentInfo.studentName}</span> ({studentInfo.studentCode}) • Niên khóa 2026–2027
                        </p>
                    </div>
                </div>

                {/* BCS Quick Action Button */}
                <button
                    onClick={() => setIsHomeworkModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all w-fit"
                >
                    <Edit3 size={14} />
                    <span>Ghi Sổ Báo Bài Hôm Nay (BCS)</span>
                </button>
            </div>

            {/* Navigation Tabs (Light-Theme Segmented Control) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
                <button
                    onClick={() => setActiveTab('homework')}
                    className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2",
                        activeTab === 'homework'
                            ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    )}
                >
                    <BookOpen size={16} />
                    <span>1. Sổ Báo Bài & Dặn Dò</span>
                </button>

                <button
                    onClick={() => setActiveTab('timetable')}
                    className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2",
                        activeTab === 'timetable'
                            ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    )}
                >
                    <Calendar size={16} />
                    <span>2. Thời Khóa Biểu (Sáng & Chiều)</span>
                </button>

                <button
                    onClick={() => setActiveTab('tuition')}
                    className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2",
                        activeTab === 'tuition'
                            ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    )}
                >
                    <CreditCard size={16} />
                    <span>3. Học Phí & VietQR</span>
                </button>

                <button
                    onClick={() => setActiveTab('attendance')}
                    className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2",
                        activeTab === 'attendance'
                            ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    )}
                >
                    <UserCheck size={16} />
                    <span>4. Chuyên Cần Điểm Danh</span>
                </button>

                <button
                    onClick={() => setActiveTab('cv')}
                    className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2",
                        activeTab === 'cv'
                            ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    )}
                >
                    <FileText size={16} />
                    <span>5. Sơ Yếu Lý Lịch Học Sinh</span>
                </button>
            </div>

            {/* TAB CONTENT AREA */}
            <div className="min-h-[400px]">
                {/* 1. SỔ BÁO BÀI & DẶN DÒ */}
                {activeTab === 'homework' && (
                    <div className="space-y-4">
                        <ParentHomeworkTab
                            classId={studentInfo.classId}
                            className={studentInfo.className}
                            studentName={studentInfo.studentName}
                        />
                    </div>
                )}

                {/* 2. THỜI KHÓA BIỂU SÁNG & CHIỀU */}
                {activeTab === 'timetable' && (
                    <div className="space-y-4">
                        <ParentTimetableTab
                            classId={studentInfo.classId}
                            className={studentInfo.className}
                            studentName={studentInfo.studentName}
                        />
                    </div>
                )}

                {/* 3. HỌC PHÍ & VIETQR */}
                {activeTab === 'tuition' && (
                    <div className="space-y-5 animate-in fade-in">
                        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold text-xl">
                                        💳
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-900">
                                            Tra Cứu Học Phí & Dịch Vụ Trường Học
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            Tự động tạo mã VietQR chính xác kèm nội dung chuyển khoản hợp lệ
                                        </p>
                                    </div>
                                </div>

                                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 w-fit">
                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                    <span>Hỗ Trợ Tất Cả Ngân Hàng 24/7</span>
                                </div>
                            </div>

                            {/* Tuition Status */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                                    <p className="text-xs text-slate-500 font-medium">Học phí định kỳ tháng hiện tại</p>
                                    <p className="text-lg font-black text-slate-900">Đã Hoàn Thành</p>
                                    <p className="text-[11px] text-emerald-600 font-bold">✓ Không có công nợ</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                                    <p className="text-xs text-slate-500 font-medium">Tiền ăn bán trú & dịch vụ</p>
                                    <p className="text-lg font-black text-slate-900">1.250.000 đ</p>
                                    <p className="text-[11px] text-amber-600 font-bold">Kỳ thu tháng 9/2026</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs text-blue-700 font-bold">Thanh Toán Nhanh VietQR</p>
                                        <p className="text-[11px] text-slate-600 mt-0.5">Quét mã bằng mọi ứng dụng ngân hàng</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setPaymentModalData({
                                                isOpen: true,
                                                title: `Học phí & Bán trú Tháng 9 • Lớp ${studentInfo.className}`,
                                                amount: 1250000,
                                                columnId: 'col_tuition_09',
                                                periodKey: '2026_09',
                                                periodLabel: 'Tháng 09/2026',
                                                bankInfo: {
                                                    bankId: '970422',
                                                    bankName: 'MB Bank',
                                                    accountNo: '090123456789',
                                                    accountName: 'TRUONG THCS TRAN BOI CO'
                                                }
                                            });
                                        }}
                                        className="mt-3 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                                    >
                                        <QrCode size={14} />
                                        <span>Mở Mã VietQR Chuyển Khoản</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. CHUYÊN CẦN ĐIỂM DANH */}
                {activeTab === 'attendance' && (
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-5 animate-in fade-in">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold text-xl">
                                📊
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    Thống Kê Chuyên Cần & Điểm Danh Vào Lớp
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Dữ liệu điểm danh trực tiếp qua thẻ từ thông minh / ứng dụng GVCN
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-center">
                                <p className="text-xs text-emerald-800 font-bold">Số Buổi Có Mặt</p>
                                <p className="text-2xl font-black text-emerald-600 mt-1">100%</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Không vắng buổi nào</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 text-center">
                                <p className="text-xs text-blue-800 font-bold">Đúng Giờ</p>
                                <p className="text-2xl font-black text-blue-600 mt-1">Chuẩn Giờ</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Chưa từng đi trễ</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 text-center">
                                <p className="text-xs text-purple-800 font-bold">Xếp Loại Chuyên Cần</p>
                                <p className="text-2xl font-black text-purple-600 mt-1">Xuất Sắc</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Tác phong nghiêm túc</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. SƠ YẾU LÝ LỊCH HỌC SINH */}
                {activeTab === 'cv' && (
                    <div className="space-y-4 animate-in fade-in">
                        {studentObj && studentInfo.classId ? (
                            <StudentCurriculumVitaeTab
                                student={studentObj}
                                classId={studentInfo.classId}
                                className={studentInfo.className}
                            />
                        ) : (
                            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
                                Đang tải thông tin hồ sơ học sinh...
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Daily Homework BCS Modal */}
            <DailyHomeworkModal
                isOpen={isHomeworkModalOpen}
                onClose={() => setIsHomeworkModalOpen(false)}
                classId={studentInfo.classId}
                className={studentInfo.className}
                studentName={studentInfo.studentName}
                isReporterOrTeacher={true}
            />

            {/* VietQR Payment Modal */}
            {paymentModalData && (
                <VietQRPaymentModal
                    isOpen={paymentModalData.isOpen}
                    onClose={() => setPaymentModalData(null)}
                    title={paymentModalData.title}
                    amount={paymentModalData.amount}
                    columnId={paymentModalData.columnId}
                    studentName={studentInfo.studentName}
                    studentCode={studentInfo.studentCode}
                    className={studentInfo.className}
                    periodKey={paymentModalData.periodKey}
                    periodLabel={paymentModalData.periodLabel}
                    bankInfo={paymentModalData.bankInfo}
                />
            )}

        </div>
    );
}
