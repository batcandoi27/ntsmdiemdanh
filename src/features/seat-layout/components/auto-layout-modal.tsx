// ============================================================================
// SEAT LAYOUT EDITOR - AUTO LAYOUT MODAL (WIZARD XẾP CHỖ TỰ ĐỘNG)
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  ClassroomLayout,
  EditorStudent,
  AutoSeatingOptions,
  AutoSeatingStrategy
} from '../domain/types';
import { autoAssignSeating } from '../domain/auto-seating';
import { Sparkles, X, Check, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AutoLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  layout: ClassroomLayout;
  students: EditorStudent[];
  onApply: (options: AutoSeatingOptions) => void;
}

export const AutoLayoutModal: React.FC<AutoLayoutModalProps> = ({
  isOpen,
  onClose,
  layout,
  students,
  onApply
}) => {
  const [strategy, setStrategy] = useState<AutoSeatingStrategy>('alphabetical');
  const [preserveLocked, setPreserveLocked] = useState(true);
  const [preserveSpecial, setPreserveSpecial] = useState(true);
  const [fillDirection, setFillDirection] = useState<'horizontal' | 'vertical' | 'snake'>('horizontal');
  const [isPreview, setIsPreview] = useState(false);

  // Đếm số ghế khóa hiện tại
  const lockedCount = useMemo(() => {
    let count = 0;
    for (const assign of Object.values(layout.assignments)) {
      if (assign.locked) count++;
    }
    return count;
  }, [layout.assignments]);

  // Sinh bản xem trước (Preview)
  const previewLayout = useMemo(() => {
    if (!isPreview) return null;
    return autoAssignSeating(layout, students, {
      strategy,
      preserveLocked,
      preserveSpecial,
      fillDirection
    });
  }, [isPreview, layout, students, strategy, preserveLocked, preserveSpecial, fillDirection]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onApply({
      strategy,
      preserveLocked,
      preserveSpecial,
      fillDirection
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                Trợ Lý Xếp Chỗ Tự Động Thông Minh
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Tự động phân bổ chỗ ngồi khoa học & an toàn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Wizard */}
        {!isPreview ? (
          <div className="space-y-4">
            {/* 1. Chọn chiến lược */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                1. Chọn tiêu chí sắp xếp:
              </label>
              <div className="space-y-2">
                {[
                  { id: 'alphabetical', title: '🔤 Theo thứ tự Alphabet (A - Z theo Tên tiếng Việt)', desc: 'Xếp lần lượt theo tên chính: An, Bình, Cường, Dũng...' },
                  { id: 'stt', title: '🔢 Theo số thứ tự (STT) trong Sổ điểm danh', desc: 'Xếp theo danh sách lớp từ 1 đến hết' },
                  { id: 'alternating_gender', title: '👦👧 Nam / Nữ xen kẽ', desc: 'Phân bổ học sinh nam và nữ ngồi đan xen theo từng bàn' },
                  { id: 'random', title: '🎲 Ngẫu nhiên (Bốc thăm ngẫu nhiên)', desc: 'Xáo trộn ngẫu nhiên toàn bộ học sinh để tạo sự mới mẻ' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer",
                      strategy === item.id
                        ? "bg-violet-50/70 border-violet-500 shadow-2xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === item.id}
                      onChange={() => setStrategy(item.id as any)}
                      className="mt-1 text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Ràng buộc bảo lưu */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                2. Ràng buộc an toàn:
              </label>
              
              <label className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-amber-50/60 border border-amber-200 cursor-pointer text-xs font-bold text-amber-950">
                <input
                  type="checkbox"
                  checked={preserveLocked}
                  onChange={(e) => setPreserveLocked(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Bảo lưu 100% các vị trí đã KHÓA ({lockedCount} ghế)</span>
                </div>
              </label>
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div className="space-y-3">
            <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Đã sinh bản xem trước thành công!</p>
                <p className="text-[11px] text-emerald-700">
                  {Object.keys(previewLayout?.assignments || {}).length} học sinh sẽ được xếp vào các bàn.
                </p>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl p-2 space-y-1 bg-slate-50 text-xs">
              {Object.values(previewLayout?.assignments || {}).map((assign) => (
                <div key={assign.seatId} className="flex items-center justify-between p-1.5 bg-white rounded-xl border border-slate-200/70">
                  <span className="font-bold text-slate-800">{assign.studentName}</span>
                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {assign.locked ? '🔒 Đã khóa' : '✨ Vị trí mới'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {!isPreview ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => setIsPreview(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/20 active:scale-95 transition-all"
              >
                <span>Xem Trước Kết Quả</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsPreview(false)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                ← Quay lại tùy chọn
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Áp Dụng</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
