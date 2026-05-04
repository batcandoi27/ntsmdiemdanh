'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2, UserPlus, RefreshCw } from 'lucide-react';
import { importTeachersAction, previewImportAction } from '@/app/actions/teacher-actions';
import { cn } from '@/lib/utils';

interface PreviewItem {
  rowIndex: number;
  full_name: string;
  cccd?: string;
  phone?: string;
  email?: string;
  position?: string;
  action: 'new' | 'update';
  selected: boolean;
}

interface ImportTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'upload' | 'preview' | 'result';

export default function ImportTeacherModal({ isOpen, onClose }: ImportTeacherModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [result, setResult] = useState<{ created: number; updated: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStep('upload');
      setPreviewItems([]);
      setResult(null);
    }
  };

  // Bước 1: Quét file và hiển thị Preview
  const handlePreview = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await previewImportAction(formData);
      if (res.error) {
        setResult({ created: 0, updated: 0, failed: 0, errors: [res.error] });
        setStep('result');
      } else {
        setPreviewItems(res.items);
        setStep('preview');
      }
    } catch (err: any) {
      setResult({ created: 0, updated: 0, failed: 0, errors: [err.message] });
      setStep('result');
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Import các mục đã chọn
  const handleConfirmImport = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await importTeachersAction(formData);
      setResult(res);
      setStep('result');
    } catch (err: any) {
      setResult({ created: 0, updated: 0, failed: 0, errors: [err.message] });
      setStep('result');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (idx: number) => {
    setPreviewItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  };

  const toggleAll = () => {
    const allSelected = previewItems.every(i => i.selected);
    setPreviewItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const newCount = previewItems.filter(i => i.action === 'new').length;
  const updateCount = previewItems.filter(i => i.action === 'update').length;
  const selectedCount = previewItems.filter(i => i.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-gray-800">Import Giáo Viên</h2>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                {step === 'upload' ? 'Bước 1: Chọn file' : step === 'preview' ? 'Bước 2: Xem trước' : 'Hoàn tất'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'upload' && (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer",
                  file ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                )}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", file ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400")}>
                  {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-700">{file ? file.name : "Kéo thả hoặc Click để chọn file"}</p>
                  <p className="text-sm text-gray-400 mt-1">Hỗ trợ: .xlsx, .xls</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 border border-gray-100">Hủy bỏ</button>
                <button 
                  onClick={handlePreview}
                  disabled={!file || isLoading}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-xl shadow-blue-200 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Quét & Xem trước
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-3">
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Thêm mới</p>
                  <p className="text-3xl font-black text-emerald-700">{newCount}</p>
                </div>
                <div className="flex-1 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Cập nhật</p>
                  <p className="text-3xl font-black text-blue-700">{updateCount}</p>
                </div>
                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Đã chọn</p>
                  <p className="text-3xl font-black text-gray-700">{selectedCount}</p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" checked={previewItems.every(i => i.selected)} onChange={toggleAll} className="rounded" />
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Họ và tên</th>
                      <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">CCCD</th>
                      <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Chức danh</th>
                      <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className={cn("transition-colors", item.selected ? "bg-white" : "bg-gray-50/50 opacity-50")}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={item.selected} onChange={() => toggleItem(idx)} className="rounded" />
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-800">{item.full_name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.cccd || '---'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{item.position || '---'}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                            item.action === 'new' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {item.action === 'new' ? 'Mới' : 'Cập nhật'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setStep('upload')} className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 border border-gray-100">
                  ← Quay lại
                </button>
                <button 
                  onClick={handleConfirmImport}
                  disabled={selectedCount === 0 || isLoading}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-xl shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Xác nhận Import ({selectedCount})
                </button>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-emerald-800 text-lg leading-tight">Hoàn tất xử lý</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <p className="text-xs font-medium">Mới: <span className="font-black text-emerald-700">{result.created}</span></p>
                    <p className="text-xs font-medium">Cập nhật: <span className="font-black text-blue-600">{result.updated}</span></p>
                    <p className="text-xs font-medium">Thất bại: <span className="font-black text-red-600">{result.failed}</span></p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto p-4 rounded-2xl bg-red-50 border border-red-100 space-y-2">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Chi tiết lỗi:</p>
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="text-xs text-red-600 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 shrink-0" />
                      {err}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={onClose} className="w-full py-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200">
                Đóng lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
