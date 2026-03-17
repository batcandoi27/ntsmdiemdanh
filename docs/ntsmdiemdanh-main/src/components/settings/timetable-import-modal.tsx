'use client';

import { useState } from 'react';
import { X, Upload, FileType2, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/auth-context';
import { importTimetablesFromRows } from '@/services/timetable-service';
import { Class } from '@/types/models';
import { TimetableImportResult } from '@/types/timetable';

interface TimetableImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classes: Class[];
}

export function TimetableImportModal({ isOpen, onClose, onSuccess, classes }: TimetableImportModalProps) {
    const { appUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TimetableImportResult | null>(null);
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
    const [effectiveTo, setEffectiveTo] = useState('2026-05-31');

    if (!isOpen) return null;

    const classIdMap = classes.reduce((acc, c) => {
        acc[c.name] = c.id;
        return acc;
    }, {} as Record<string, string>);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !appUser) return;

        setLoading(true);
        setResult(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                // Assuming first sheet is the flat list
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, string>[];

                const res = await importTimetablesFromRows(
                    appUser,
                    rows,
                    effectiveFrom,
                    effectiveTo,
                    classIdMap
                );

                setResult(res);
                if (res.success) {
                    setTimeout(() => onSuccess(), 2000); // Close after 2 seconds on success
                }
            } catch (err: any) {
                console.error(err);
                alert('Lỗi xử lý file Excel: ' + err.message);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Nhập Thời Khoá Biểu từ Excel</h2>
                        <p className="text-sm text-gray-500">Hỗ trợ format Flat List (Chung khối)</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {!result ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Áp dụng từ ngày</label>
                                    <input
                                        type="date"
                                        value={effectiveFrom}
                                        onChange={e => setEffectiveFrom(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Đến ngày</label>
                                    <input
                                        type="date"
                                        value={effectiveTo}
                                        onChange={e => setEffectiveTo(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-emerald-50/50 hover:border-emerald-400 transition-colors bg-gray-50">
                                <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full text-center">
                                    {loading ? (
                                        <div className="space-y-4">
                                            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                            <p className="font-bold text-emerald-700">Đang xử lý dữ liệu...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                                <FileType2 size={32} />
                                            </div>
                                            <span className="font-bold text-gray-700 text-lg">Click để chọn file Excel (.xlsx)</span>
                                            <span className="text-gray-500 text-sm mt-1">Hoặc kéo thả file vào đây</span>
                                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                                        </>
                                    )}
                                </label>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {result.success ? (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex gap-3 text-sm">
                                    <CheckCircle className="text-emerald-500 shrink-0" size={24} />
                                    <div>
                                        <p className="font-bold text-base mb-1">Nhập thành công!</p>
                                        <p>Đã tạo thành công TKB cho <span className="font-bold">{result.stats.classesProcessed}</span> lớp với tổng cộng <span className="font-bold">{result.stats.totalPeriods}</span> tiết.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex gap-3 text-sm">
                                    <AlertCircle className="text-rose-500 shrink-0" size={24} />
                                    <div>
                                        <p className="font-bold text-base mb-1">Lỗi nhập dữ liệu</p>
                                        <p>Đã tìm thấy <span className="font-bold">{result.errors.length}</span> lỗi. Xem chi tiết bên dưới.</p>
                                    </div>
                                </div>
                            )}

                            {result.conflicts.length > 0 && (
                                <div className="border border-orange-200 rounded-xl overflow-hidden text-sm">
                                    <div className="bg-orange-50 px-4 py-2 font-bold text-orange-800 border-b border-orange-200 flex justify-between">
                                        <span>Cảnh báo xung đột TKB ({result.conflicts.length})</span>
                                    </div>
                                    <ul className="max-h-40 overflow-y-auto divide-y divide-gray-100 bg-white">
                                        {result.conflicts.map((c, i) => (
                                            <li key={i} className={`p-3 ${c.severity === 'error' ? 'text-rose-700' : 'text-orange-700'}`}>
                                                {c.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.errors.length > 0 && (
                                <div className="border border-rose-200 rounded-xl overflow-hidden text-sm">
                                    <div className="bg-rose-50 px-4 py-2 font-bold text-rose-800 border-b border-rose-200">
                                        Lỗi cấu trúc file ({result.errors.length})
                                    </div>
                                    <ul className="max-h-40 overflow-y-auto divide-y divide-gray-100 bg-white">
                                        {result.errors.map((e, i) => (
                                            <li key={i} className="p-3 text-rose-700">
                                                Dòng {e.row}: {e.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {!result.success && (
                                <button
                                    onClick={() => setResult(null)}
                                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors mt-4"
                                >
                                    Thử tải lên file khác
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
