"use client";

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TeacherCustomField } from '@/types/student-cv';
import { StudentCurriculumVitaeService } from '@/services/student-cv-service';
import toast from 'react-hot-toast';

interface TeacherCustomFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className?: string;
  teacherId: string;
  onSaved?: () => void;
}

export function TeacherCustomFieldsModal({
  isOpen,
  onClose,
  classId,
  className,
  teacherId,
  onSaved
}: TeacherCustomFieldsModalProps) {
  const [fields, setFields] = useState<TeacherCustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New field state
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text' | 'select' | 'checkbox' | 'number'>('text');
  const [newOptionsText, setNewOptionsText] = useState('');
  const [newRequired, setNewRequired] = useState(false);

  const loadFields = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const list = await StudentCurriculumVitaeService.getTeacherCustomFields(classId);
      setFields(list);
    } catch (err) {
      console.error('Error loading fields:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadFields();
  }, [isOpen, classId]);

  if (!isOpen) return null;

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      toast.error('Vui lòng nhập tên trường');
      return;
    }

    const key = newKey.trim() || 'f_' + Math.random().toString(36).substring(2, 8);
    const options = newType === 'select'
      ? newOptionsText.split(/[,;\n]/).map(s => s.trim()).filter(Boolean)
      : undefined;

    setSaving(true);
    try {
      await StudentCurriculumVitaeService.upsertTeacherCustomField({
        class_id: classId,
        teacher_id: teacherId || '00000000-0000-0000-0000-000000000001',
        field_key: key,
        field_label: newLabel.trim(),
        field_type: newType,
        options,
        is_required: newRequired,
        sort_order: fields.length + 1
      });

      toast.success('Đã thêm trường tùy chỉnh cho lớp!');
      setNewKey('');
      setNewLabel('');
      setNewType('text');
      setNewOptionsText('');
      setNewRequired(false);
      loadFields();
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error('Lỗi khi thêm: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fieldId: string) => {
    try {
      await StudentCurriculumVitaeService.softDeleteTeacherCustomField(fieldId);
      toast.success('Đã xóa trường tùy chỉnh');
      loadFields();
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error('Lỗi xóa trường: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-5 bg-gradient-to-r from-blue-800 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-base">Cấu Hình Trường Tùy Chỉnh Lớp</h3>
              <p className="text-xs text-blue-200">Mở rộng câu hỏi hồ sơ cho lớp {className}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Form thêm trường mới */}
          <form onSubmit={handleAddField} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" /> Thêm trường thông tin mới
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên hiển thị câu hỏi *</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="VD: Phương tiện đi học, Cỡ đồng phục, Zalo cha..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại nhập liệu</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white"
                >
                  <option value="text">Văn bản ngắn (Text)</option>
                  <option value="select">Hộp lựa chọn (Dropdown Select)</option>
                  <option value="checkbox">Đánh dấu Đúng/Sai (Checkbox)</option>
                  <option value="number">Dữ liệu Số (Number)</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newRequired}
                    onChange={e => setNewRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  Bắt buộc phụ huynh điền
                </label>
              </div>

              {newType === 'select' && (
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Các lựa chọn (ngăn cách bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={newOptionsText}
                    onChange={e => setNewOptionsText(e.target.value)}
                    placeholder="VD: Xe đạp, Xe buýt, Cha mẹ đưa đón, Tự đi"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{saving ? 'Đang thêm...' : 'Thêm vào biểu mẫu'}</span>
              </button>
            </div>
          </form>

          {/* Danh sách trường hiện có */}
          <div className="space-y-2">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-600">
              Các trường tùy chỉnh hiện có của lớp ({fields.length})
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Đang tải...</div>
            ) : fields.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                Chưa có trường tùy chỉnh nào. Lớp sẽ dùng 100% biểu mẫu Sơ Yếu Lý Lịch tiêu chuẩn.
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map(f => (
                  <div key={f.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs">
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
                        <span>{f.field_label}</span>
                        {f.is_required && <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">Bắt buộc</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Kiểu: <span className="font-medium text-blue-700">{f.field_type}</span>
                        {f.options && ` • [${f.options.join(', ')}]`}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Xóa trường"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
