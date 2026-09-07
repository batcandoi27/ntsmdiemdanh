'use client';

import React, { useState } from 'react';
import { X, Sparkles, Check, Palette } from 'lucide-react';
import { SvgPet } from './svg-pet';
import { DEFAULT_EGG_COLORS } from '@/domain/classroom-world/constants';
import { PetEvolutionBranch } from '@/types/student-portal';
import toast from 'react-hot-toast';

interface EggCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor?: string;
  branch?: PetEvolutionBranch;
  onSaveColor: (colorHex: string) => void;
}

export const EggCustomizationModal: React.FC<EggCustomizationModalProps> = ({
  isOpen,
  onClose,
  currentColor = '#9d4edd',
  branch = 'cosmic',
  onSaveColor
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(currentColor);
  const [customHex, setCustomHex] = useState<string>(currentColor);

  if (!isOpen) return null;

  const handleSelectPreset = (hex: string) => {
    setSelectedColor(hex);
    setCustomHex(hex);
  };

  const handleCustomHexChange = (val: string) => {
    setCustomHex(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      setSelectedColor(val);
    }
  };

  const handleSave = () => {
    onSaveColor(selectedColor);
    toast.success('🎨 Đã lưu màu sắc quả trứng cá nhân hóa!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-150 text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-2xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                Tùy Biến Màu Sắc Quả Trứng
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Tạo dấu ấn phong cách riêng biệt cho linh vật</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Egg Preview */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
          <div
            className="absolute w-40 h-40 rounded-full blur-2xl opacity-40 transition-colors duration-500"
            style={{ backgroundColor: selectedColor }}
          />
          <SvgPet
            branch={branch}
            level={0}
            customColor={selectedColor}
            size={110}
            className="z-10 cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-700 mt-2 z-10 font-mono">
            {selectedColor.toUpperCase()}
          </span>
        </div>

        {/* Preset Palettes */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Bảng màu thần thoại khuyên dùng:
          </label>
          <div className="grid grid-cols-4 gap-2.5">
            {DEFAULT_EGG_COLORS.map((col) => {
              const isSelected = selectedColor.toLowerCase() === col.hex.toLowerCase();
              return (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => handleSelectPreset(col.hex)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-400/30 shadow-xs scale-105'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full border border-slate-300 shadow-2xs flex items-center justify-center"
                    style={{ backgroundColor: col.hex }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                  <span className="text-[10px] text-slate-600 font-bold truncate w-full">
                    {col.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom HEX Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Hoặc nhập mã màu HEX tùy ý:
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={customHex}
              maxLength={7}
              placeholder="#FF5733"
              onChange={(e) => handleCustomHexChange(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs font-bold uppercase focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-2 active:scale-95 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Lưu Màu Trứng</span>
          </button>
        </div>

      </div>
    </div>
  );
};
