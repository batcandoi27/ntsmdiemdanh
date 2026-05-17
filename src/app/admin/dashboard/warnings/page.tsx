"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, UserX, UserMinus, Bell, Eye } from 'lucide-react';
import { GlobalDataFilter } from '@/components/dashboard/GlobalDataFilter';
import { format, startOfMonth, endOfMonth, parseISO, addMonths, subMonths } from 'date-fns';

export default function WarningsPage() {
    const [loading, setLoading] = useState(true);
    const [riskStudents, setRiskStudents] = useState<any[]>([]);
    
    const now = new Date();
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd')
    });
    const [filterMode, setFilterMode] = useState<'WEEK' | 'MONTH' | 'CUSTOM'>('MONTH');
    const [selectedGrade, setSelectedGrade] = useState<string>('');

    useEffect(() => {
        fetchRiskStudents();
    }, [selectedGrade, dateRange]);

    const fetchRiskStudents = async () => {
        setLoading(true);
        try {
            // Gọi RPC thực tế từ Database
            const { data, error } = await supabase.rpc('get_student_risk_scores', {
                target_class_id: null
            });
            
            if (error) {
                console.error("Lỗi khi gọi RPC get_student_risk_scores:", error);
                return;
            }

            if (data && data.length > 0) {
                const studentIds = data.map((r: any) => r.student_id);
                
                // Lấy thông tin học sinh
                const { data: students } = await supabase
                    .from('students')
                    .select('id, full_name, class_id')
                    .in('id', studentIds);
                    
                // Lấy thông tin lớp
                const { data: classes } = await supabase
                    .from('classes')
                    .select('id, name');

                const mappedData = data.map((r: any) => {
                    const student = students?.find(s => s.id === r.student_id);
                    const cls = classes?.find(c => c.id === student?.class_id);
                    return {
                        ...r,
                        name: student?.full_name || 'Không rõ tên',
                        class: cls?.name || 'N/A'
                    };
                });

                // Nếu có chọn khối, lọc thêm theo tên lớp (ví dụ: '6A1' startsWith '6')
                let filteredData = mappedData;
                if (selectedGrade) {
                    filteredData = mappedData.filter((r: any) => r.class.startsWith(selectedGrade));
                }

                setRiskStudents(filteredData);
            } else {
                setRiskStudents([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Cảnh báo sớm Học sinh</h2>
                    <p className="text-slate-500">Danh sách học sinh có nguy cơ giảm sút chuyên cần cao.</p>
                </div>
            </div>

            <GlobalDataFilter 
                dateRange={dateRange}
                setDateRange={setDateRange}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                gradeOptions={[
                    { value: '6', label: 'Khối 6' },
                    { value: '7', label: 'Khối 7' },
                    { value: '8', label: 'Khối 8' },
                    { value: '9', label: 'Khối 9' },
                ]}
                selectedGrade={selectedGrade}
                setSelectedGrade={setSelectedGrade}
            />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                                <th className="p-4 font-semibold">Học sinh</th>
                                <th className="p-4 font-semibold">Lớp</th>
                                <th className="p-4 font-semibold text-center">Vắng (Không phép)</th>
                                <th className="p-4 font-semibold text-center">Đi trễ</th>
                                <th className="p-4 font-semibold text-center">Vi phạm</th>
                                <th className="p-4 font-semibold text-center">Trạng thái</th>
                                <th className="p-4 font-semibold text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Đang tải...</td></tr>
                            ) : riskStudents.map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{s.name || 'Không rõ tên'}</td>
                                    <td className="p-4 text-slate-600">{s.class || 'N/A'}</td>
                                    <td className="p-4 text-center text-rose-600 font-medium">{s.absent_k_count}</td>
                                    <td className="p-4 text-center text-amber-600 font-medium">{s.late_count}</td>
                                    <td className="p-4 text-center text-purple-600 font-medium">{s.violation_count}</td>
                                    <td className="p-4 text-center">
                                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                                            {s.total_score}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {s.total_score >= 20 ? (
                                            <span className="flex items-center justify-center space-x-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-md text-sm font-semibold">
                                                <UserX className="w-4 h-4"/> <span>Nguy cơ cao</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center space-x-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-sm font-semibold">
                                                <UserMinus className="w-4 h-4"/> <span>Cần theo dõi</span>
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger" title="Xem chi tiết">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors tooltip-trigger" title="Nhắc GVCN">
                                                <Bell className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {riskStudents.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="text-4xl">🎉</div>
                                            <h3 className="text-lg font-bold text-emerald-600">Tuyệt vời!</h3>
                                            <p className="text-slate-500">Không có học sinh nguy cơ cao trong tuần này.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
