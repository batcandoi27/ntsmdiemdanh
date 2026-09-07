'use client';

import React, { useState, useEffect } from 'react';
import { Database, Download, Cloud, RefreshCw, Trash2, CheckCircle, AlertTriangle, ShieldCheck, Key, Copy, Check, ExternalLink, Calendar, Users, Layers, Clock } from 'lucide-react';
import { generateMockData, clearAttendance, getDriveBackupConfig, saveDriveBackupConfig, triggerDriveBackupNow } from '@/app/actions/settings';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export function DataBackupTab() {
    const { appUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // States cho Google Drive Config
    const [driveConfig, setDriveConfig] = useState({
        enabled: false,
        gas_webhook_url: '',
        secret_token: 'TBC_DRIVE_BACKUP_2026',
        backup_frequency: 'daily',
        last_backup_at: null as string | null,
        last_status: 'IDLE'
    });
    const [copiedScript, setCopiedScript] = useState(false);
    const [isTestingDrive, setIsTestingDrive] = useState(false);

    // States cho Xóa Dữ Liệu
    const [deleteStartDate, setDeleteStartDate] = useState('');
    const [deleteEndDate, setDeleteEndDate] = useState('');
    const [quickDeleteMode, setQuickDeleteMode] = useState<'this_week' | 'this_month' | 'all' | 'custom'>('this_month');
    const [isClearing, setIsClearing] = useState(false);
    const [isGeneratingMock, setIsGeneratingMock] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await getDriveBackupConfig();
            if (res.success && res.config) {
                setDriveConfig(prev => ({ ...prev, ...res.config }));
            }
        } catch (e) {
            console.error('Error loading drive backup config:', e);
        }
    };

    const handleSaveDriveConfig = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await saveDriveBackupConfig(driveConfig, appUser?.role);
            if (res.success) {
                setMessage({ type: 'success', text: res.message });
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Lỗi khi lưu cấu hình.' });
        } finally {
            setLoading(false);
        }
    };

    const handleTestDriveBackup = async () => {
        if (!driveConfig.gas_webhook_url) {
            setMessage({ type: 'error', text: 'Vui lòng nhập Google Apps Script Webhook URL trước khi thử nghiệm.' });
            return;
        }
        setIsTestingDrive(true);
        setMessage(null);
        try {
            const res = await triggerDriveBackupNow(driveConfig.gas_webhook_url, driveConfig.secret_token);
            if (res.success) {
                setMessage({ type: 'success', text: res.message });
                loadConfig();
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Lỗi kết nối sao lưu Google Drive.' });
        } finally {
            setIsTestingDrive(false);
        }
    };

    const handleDownloadZip = () => {
        window.open('/api/admin/backup-zip', '_blank');
    };

    const handleQuickSelect = (mode: 'this_week' | 'this_month' | 'all') => {
        setQuickDeleteMode(mode);
        const today = new Date();
        if (mode === 'this_week') {
            const monday = new Date(today);
            monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
            setDeleteStartDate(monday.toISOString().split('T')[0]);
            setDeleteEndDate(today.toISOString().split('T')[0]);
        } else if (mode === 'this_month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            setDeleteStartDate(firstDay.toISOString().split('T')[0]);
            setDeleteEndDate(today.toISOString().split('T')[0]);
        } else {
            setDeleteStartDate('');
            setDeleteEndDate('');
        }
    };

    const handleClearAttendance = async () => {
        const confirmMsg = quickDeleteMode === 'all'
            ? '⚠️ CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu điểm danh của tất cả các lớp không? (Hãy đảm bảo đã tải bản sao lưu .ZIP trước khi xóa)'
            : `Bạn có chắc chắn muốn xóa dữ liệu điểm danh từ ${deleteStartDate || 'đầu'} đến ${deleteEndDate || 'nay'} không?`;

        if (!confirm(confirmMsg)) return;

        setIsClearing(true);
        setMessage(null);
        try {
            const res = await clearAttendance(
                quickDeleteMode === 'all' ? undefined : deleteStartDate,
                quickDeleteMode === 'all' ? undefined : deleteEndDate
            );
            if (res.success) {
                setMessage({ type: 'success', text: res.message });
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Lỗi khi xóa dữ liệu.' });
        } finally {
            setIsClearing(false);
        }
    };

    const handleGenerateMock = async () => {
        setIsGeneratingMock(true);
        setMessage(null);
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await generateMockData(today, today, []);
            if (res.success) {
                setMessage({ type: 'success', text: res.message });
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Lỗi khi tạo dữ liệu mẫu.' });
        } finally {
            setIsGeneratingMock(false);
        }
    };

    const gasCodeSnippet = `// ============================================================
// GOOGLE APPS SCRIPT: TỰ ĐỘNG LƯU TRỮ BACKUP DATABASE VÀO GOOGLE DRIVE
// ============================================================
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var SECRET = "${driveConfig.secret_token || 'TBC_DRIVE_BACKUP_2026'}";
    
    if (payload.secret_token !== SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Unauthorized" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Tạo hoặc tìm thư mục sao lưu trên Google Drive
    var folderName = "THCS_TRAN_BOI_CO_DATABASE_BACKUPS";
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    // Đặt tên file theo ngày giờ
    var fileName = "Backup_DB_" + (payload.school_name || "School") + "_" + Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd_HH-mm") + ".json";
    var file = targetFolder.createFile(fileName, JSON.stringify(payload, null, 2), MimeType.PLAIN_TEXT);
    
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      file_id: file.getId(),
      file_url: file.getUrl(),
      saved_at: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

    const copyScriptToClipboard = () => {
        navigator.clipboard.writeText(gasCodeSnippet);
        setCopiedScript(true);
        setTimeout(() => setCopiedScript(false), 2500);
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Notification Message */}
            {message && (
                <div className={cn(
                    "p-4 rounded-2xl border flex items-center gap-3 text-sm font-bold shadow-xs",
                    message.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
                )}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* KHỐI 1: SAO LƯU THỦ CÔNG TOÀN BỘ CƠ SỞ DỮ LIỆU */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 tracking-tight">
                                💾 Sao Lưu Toàn Bộ Cơ Sở Dữ Liệu (1-Click Full DB Backup)
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Xuất toàn bộ 100% dữ liệu (Học sinh, Lớp học, Điểm danh, Zalo Bot, Cài đặt) thành file sao lưu độc lập.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDownloadZip}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        <span>Tải Bản Sao Lưu .ZIP / JSON Toàn Trường</span>
                    </button>
                </div>

                {/* Quick DB Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 font-bold block uppercase">Học Sinh</span>
                            <span className="text-sm font-black text-slate-800 font-mono">2,281 HS</span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                            <Layers className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 font-bold block uppercase">Lớp Học</span>
                            <span className="text-sm font-black text-slate-800 font-mono">54 Lớp</span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 font-bold block uppercase">Điểm Danh</span>
                            <span className="text-sm font-black text-slate-800 font-mono">3,462 Bản Ghi</span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 font-bold block uppercase">Trạng Thái</span>
                            <span className="text-xs font-bold text-emerald-700">Sẵn sàng sao lưu</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KHỐI 2: TỰ ĐỘNG SAO LƯU LÊN GOOGLE DRIVE (GOOGLE APPS SCRIPT) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                            <Cloud className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                ☁️ Tự Động Sao Lưu Lên Google Drive (Google Apps Script)
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Kết nối Google Drive của trường/admin để hệ thống tự động đẩy file sao lưu định kỳ hàng ngày hoàn toàn miễn phí.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "px-3 py-1 rounded-full text-[11px] font-bold border",
                            driveConfig.enabled ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-500"
                        )}>
                            {driveConfig.enabled ? '● Tự động BẬT' : '○ Đang TẮT'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            <span>Google Apps Script Webhook URL:</span>
                        </label>
                        <input
                            type="url"
                            value={driveConfig.gas_webhook_url}
                            onChange={e => setDriveConfig(prev => ({ ...prev, gas_webhook_url: e.target.value }))}
                            placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-slate-400" />
                            <span>Khóa Bảo Mật Webhook (Secret Token):</span>
                        </label>
                        <input
                            type="text"
                            value={driveConfig.secret_token}
                            onChange={e => setDriveConfig(prev => ({ ...prev, secret_token: e.target.value }))}
                            placeholder="TBC_DRIVE_BACKUP_2026"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                    </div>
                </div>

                {/* Actions & Last backup status */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                            Lần sao lưu gần nhất: <strong>{driveConfig.last_backup_at ? new Date(driveConfig.last_backup_at).toLocaleString('vi-VN') : 'Chưa có'}</strong>
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            disabled={isTestingDrive}
                            onClick={handleTestDriveBackup}
                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5"
                        >
                            {isTestingDrive ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                            <span>Thử Sao Lưu Lên Drive Ngay</span>
                        </button>

                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleSaveDriveConfig}
                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5"
                        >
                            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Lưu Cấu Hình Drive</span>
                        </button>
                    </div>
                </div>

                {/* Script snippet accordian */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs space-y-2.5 font-mono">
                    <div className="flex items-center justify-between">
                        <span className="text-amber-400 font-bold flex items-center gap-1.5">
                            📋 Mã Google Apps Script (Copy dán vào script.google.com):
                        </span>
                        <button
                            type="button"
                            onClick={copyScriptToClipboard}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans font-bold flex items-center gap-1 transition"
                        >
                            {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedScript ? 'Đã sao chép' : 'Sao chép mã'}</span>
                        </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-950 text-[11px] text-slate-300 overflow-x-auto max-h-36 leading-relaxed">
                        {gasCodeSnippet}
                    </pre>
                </div>
            </div>

            {/* KHỐI 3: XOÁ DỮ LIỆU ĐIỂM DANH */}
            <div className="bg-white rounded-3xl p-6 border border-rose-200/80 shadow-sm space-y-5">
                <div className="flex items-center gap-3.5 pb-4 border-b border-rose-100">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-rose-900 tracking-tight">
                            🗑️ Xoá Dữ Liệu Điểm Danh
                        </h3>
                        <p className="text-xs text-rose-700/80 font-medium">
                            Dọn dẹp nhật ký điểm danh định kỳ theo ngày/tuần/tháng hoặc làm sạch để chuẩn bị năm học mới.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Từ ngày:</label>
                            <input
                                type="date"
                                value={deleteStartDate}
                                onChange={e => {
                                    setDeleteStartDate(e.target.value);
                                    setQuickDeleteMode('custom');
                                }}
                                className="w-full text-xs font-bold border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-rose-200 bg-slate-50"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Đến ngày:</label>
                            <input
                                type="date"
                                value={deleteEndDate}
                                onChange={e => {
                                    setDeleteEndDate(e.target.value);
                                    setQuickDeleteMode('custom');
                                }}
                                className="w-full text-xs font-bold border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-rose-200 bg-slate-50"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full">
                        <button
                            type="button"
                            onClick={() => handleQuickSelect('this_week')}
                            className={cn(
                                "flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all text-center",
                                quickDeleteMode === 'this_week' ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            Tuần này
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickSelect('this_month')}
                            className={cn(
                                "flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all text-center",
                                quickDeleteMode === 'this_month' ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            Tháng này
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickSelect('all')}
                            className={cn(
                                "flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all text-center",
                                quickDeleteMode === 'all' ? "bg-rose-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            Tất cả
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleGenerateMock}
                            disabled={isGeneratingMock}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-xl border border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
                        >
                            {isGeneratingMock ? <RefreshCw className="animate-spin w-4 h-4" /> : <Database className="w-4 h-4" />}
                            <span>Tạo Dữ Liệu Giả Lập (Hôm nay)</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleClearAttendance}
                            disabled={isClearing}
                            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-black py-3 px-4 rounded-xl border border-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs shadow-2xs"
                        >
                            {isClearing ? <RefreshCw className="animate-spin w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                            <span>{quickDeleteMode === 'all' ? 'XÓA TOÀN BỘ ĐIỂM DANH' : 'Xóa Dữ Liệu Điểm Danh Đã Chọn'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
