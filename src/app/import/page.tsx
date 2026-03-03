'use client';

import { useState } from 'react';
import Link from 'next/link';
import { importSchoolData, clearAllYearData } from '@/app/actions/import';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Play, Terminal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useFeatureFlags } from '@/context/feature-flags-context';

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState<{ classes: number, students: number } | null>(null);
    const { appUser } = useAuth();
    const { flags, loading: flagsLoading } = useFeatureFlags();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setLogs([]); // Reset logs
            setStats(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsProcessing(true);
        setLogs(['🚀 Bắt đầu phân tích file...']);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await importSchoolData(formData);

            if (res.success && res.logs) {
                setLogs(res.logs);
                if (res.stats) setStats(res.stats);
            } else {
                setLogs(prev => [...prev, `❌ Lỗi: ${res.message}`]);
            }

        } catch (error) {
            setLogs(prev => [...prev, '❌ Lỗi kết nối server']);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = async () => {
        const confirmed = window.confirm(
            '⚠️ CẢNH BÁO NGUY HIỂM!\n\nBạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu của năm học này không?\n\n- Tất cả Lớp học sẽ bị xóa.\n- Tất cả Học sinh sẽ bị xóa.\n- KHÔNG THỂ KHÔI PHỤC LẠI.\n\nNhấn OK để đồng ý XÓA.'
        );

        if (!confirmed) return;

        setIsProcessing(true);
        setLogs(prev => [...prev, '🔥 Đang tiến hành xóa dữ liệu cũ...', '⏳ Vui lòng đợi...']);

        try {
            const res = await clearAllYearData();
            if (res.success) {
                setLogs(prev => [...prev, `✅ THÀNH CÔNG: ${res.message}`]);
                setStats(null);
            } else {
                setLogs(prev => [...prev, `❌ Lỗi xóa: ${res.message}`]);
            }
        } catch (error) {
            setLogs(prev => [...prev, '❌ Lỗi kết nối server khi xóa dữ liệu']);
        } finally {
            setIsProcessing(false);
        }
    };

    if (flagsLoading) {
        return <div className="p-8 text-center text-gray-500 flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin mr-2" /> Đang tải...</div>;
    }

    if (!flags.import) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4 ring-8 ring-amber-50/50">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Tính năng đang được phát triển</h2>
                <p className="text-gray-500 max-w-md">Chức năng Import Dữ Liệu hiện đang được nâng cấp hệ thống. Vui lòng quay lại sau.</p>
            </div>
        );
    }

    if (appUser?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Truy cập bị từ chối</h2>
                    <p className="text-gray-500">Chỉ có Quản trị viên (Admin) mới có quyền truy cập trang này để Import dữ liệu.</p>
                    <Link href="/" className="mt-6 inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                        Về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Input */}
                <div className="bg-white rounded-2xl shadow-lg p-8 h-fit">
                    <h1 className="text-2xl font-bold text-primary-dark mb-6 flex items-center gap-2">
                        <Upload className="w-6 h-6" />
                        Smart Import
                    </h1>

                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-colors bg-gray-50 mb-6 flex flex-col items-center">
                        <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 mb-2">
                            Chọn file Excel <strong>.xlsx</strong>
                        </p>
                        <button
                            type="button"
                            onClick={async () => {
                                const { exportSampleClassTemplate } = await import('@/lib/export-utils');
                                await exportSampleClassTemplate();
                            }}
                            className="text-primary text-sm font-bold underline mb-4 hover:text-primary-dark flex items-center gap-1 transition-all"
                        >
                            ⬇️ Tải file Excel Mẫu chuẩn (5 Học Sinh)
                        </button>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            disabled={isProcessing}
                            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        {file && (
                            <button
                                onClick={handleUpload}
                                disabled={isProcessing}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-95"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                                {isProcessing ? 'Đang Xử Lý...' : 'Bắt Đầu Import'}
                            </button>
                        )}

                        <button
                            onClick={handleReset}
                            disabled={isProcessing}
                            className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all mt-2"
                        >
                            {isProcessing ? <Loader2 className="animate-spin text-red-600" /> : <Trash2 size={18} />}
                            Xóa Dữ Liệu Cũ
                        </button>
                    </div>
                </div>

                {/* Right: Console Log */}
                <div className="bg-slate-900 rounded-2xl shadow-lg p-6 text-white font-mono text-sm h-[500px] overflow-hidden flex flex-col">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                        <Terminal size={18} className="text-green-400" />
                        <span className="font-bold text-gray-300">System Logs</span>
                        <div className="ml-auto flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                        {logs.length === 0 && (
                            <div className="text-slate-500 italic">Sẵn sàng chờ lệnh...</div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className={cn(
                                "border-l-2 pl-2",
                                log.includes('❌') ? "border-red-500 text-red-300" :
                                    log.includes('✅') ? "border-green-500 text-green-300" :
                                        log.includes('📊') ? "text-yellow-300" :
                                            log.includes('🔥') ? "text-orange-400 border-orange-500" :
                                                "border-blue-500 text-slate-300"
                            )}>
                                <span className="text-slate-500 text-xs mr-2">[{new Date().toLocaleTimeString()}]</span>
                                {log}
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="animate-pulse text-blue-400">_ Processing...</div>
                        )}
                    </div>

                    {stats && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-slate-800 p-3 rounded text-center">
                                    <div className="text-2xl font-bold text-white">{stats.classes}</div>
                                    <div className="text-xs text-gray-400 uppercase">Lớp Học</div>
                                </div>
                                <div className="bg-slate-800 p-3 rounded text-center">
                                    <div className="text-2xl font-bold text-white">{stats.students}</div>
                                    <div className="text-xs text-gray-400 uppercase">Học Sinh</div>
                                </div>
                            </div>
                            <Link
                                href="/classes"
                                className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors"
                            >
                                ✅ Tới Quản Lý Lớp Học Ngay
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
