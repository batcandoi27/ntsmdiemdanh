'use client';

import React, { useState } from 'react';
import { SvgPet } from '@/components/student/svg-pet';
import { EggCustomizationModal } from '@/components/student/egg-customization-modal';
import { PetEvolutionBranch, StudentPet } from '@/types/student-portal';
import { Palette, Sparkles, RefreshCw, Lock, Edit3, ShieldAlert, Check } from 'lucide-react';

export default function StudentPetPage() {
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [eggColor, setEggColor] = useState('#9d4edd');
  
  // Quota & Customization States
  const [nicknameChangesLeft, setNicknameChangesLeft] = useState(1);
  const [evolutionChangesLeft, setEvolutionChangesLeft] = useState(3);
  const [eggColorChangesMonth, setEggColorChangesMonth] = useState(1);
  const [rebirthTokens, setRebirthTokens] = useState(0);

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('Phượng Hoàng Băng #821');

  const [pet, setPet] = useState<StudentPet>({
    id: 'mock-pet',
    student_id: 'std-1',
    class_id: '8A13',
    anonymous_name: 'Phượng Hoàng Băng #821',
    anonymous_avatar_code: 'cosmic_egg',
    evolution_branch: 'cosmic',
    level: 1, // Baseline Level 1
    current_xp: 45,
    vitality_percent: 100,
    streak_days: 14,
    is_hibernating: false,
    total_coins: 35,
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const branches: { code: PetEvolutionBranch; name: string; icon: string; desc: string }[] = [
    { code: 'cosmic', name: 'Nhánh Ngân Hà (Cosmic)', icon: '🌌', desc: 'Tím huyền bí, năng lượng vũ trụ & ánh sáng neon' },
    { code: 'nature', name: 'Nhánh Tự Nhiên (Nature)', icon: '🌿', desc: 'Xanh lục bảo & vàng kim, dây leo thần thoại' },
    { code: 'cyber', name: 'Nhánh Cơ Giáp (Cyber)', icon: '⚡', desc: 'Cam lửa & xanh điện, vi mạch phát sáng' }
  ];

  const handleBranchSelect = (branch: PetEvolutionBranch) => {
    if (branch === pet.evolution_branch) return;
    if (evolutionChangesLeft <= 0) {
      alert('🔒 Bạn đã hết 3 lượt đổi nhánh tiến hóa! Hãy lọt Top thi đua tháng để nhận Phiếu Tẩy Tủy.');
      return;
    }
    setPet(prev => ({ ...prev, evolution_branch: branch }));
    setEvolutionChangesLeft(prev => prev - 1);
  };

  const handleSaveNickname = () => {
    if (nicknameChangesLeft <= 0) {
      alert('🔒 Bạn chỉ được đổi bí danh 1 lần duy nhất ban đầu!');
      return;
    }
    if (!nicknameInput.trim()) return;
    setPet(prev => ({ ...prev, anonymous_name: nicknameInput.trim() }));
    setNicknameChangesLeft(0);
    setIsEditingNickname(false);
  };

  const handleUseRebirthToken = () => {
    if (rebirthTokens <= 0) {
      alert('Bạn chưa có Phiếu Tẩy Tủy nào! Hãy hoàn thành nhiệm vụ và lọt Top tháng để nhận thưởng.');
      return;
    }
    setRebirthTokens(prev => prev - 1);
    setEvolutionChangesLeft(3);
    setNicknameChangesLeft(1);
    setEggColorChangesMonth(1);
    alert('🔮 Đã Tẩy Tủy thành công! Bạn nhận lại 3 lượt đổi nhánh, 1 lượt đổi tên và 1 lượt đổi màu trứng.');
  };

  const xpRequired = Math.round(100 * Math.pow(1.5, Math.max(0, pet.level)));

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            🥚 Không Gian Nuôi Dưỡng Thú Cưng SVG
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Khởi tạo Level 1 Baseline • Quản lý hạn ngạch tùy biến & Cơ chế Tẩy Tủy hàng tháng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (eggColorChangesMonth <= 0) {
                alert('🔒 Bạn đã dùng hết lượt đổi màu trứng tháng này!');
                return;
              }
              setIsColorModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Palette className="w-4 h-4 text-amber-300" />
            <span>Đổi Màu Trứng ({eggColorChangesMonth}/1 tháng)</span>
          </button>
        </div>
      </div>

      {/* Quota & Rebirth Token Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-white block">
              Hạn Ngạch Tùy Biến: Còn {evolutionChangesLeft}/3 Lần Đổi Nhánh • {nicknameChangesLeft}/1 Lần Đổi Tên
            </span>
            <span className="text-[11px] text-indigo-300">
              Khi hết lượt, bạn cần đạt Top Nhiệm vụ / Thi đua tháng để nhận <strong>Phiếu Tẩy Tủy</strong>.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-800 text-indigo-200 font-mono font-bold">
            🔮 {rebirthTokens} Phiếu Tẩy Tủy
          </span>
          {rebirthTokens > 0 && (
            <button
              onClick={handleUseRebirthToken}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95"
            >
              Tẩy Tủy Ngay
            </button>
          )}
        </div>
      </div>

      {/* Main Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Visual Showcase Card */}
        <div className="md:col-span-2 rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
          
          <SvgPet
            branch={pet.evolution_branch}
            level={pet.level}
            vitality={pet.vitality_percent}
            isHibernating={pet.is_hibernating}
            customColor={eggColor}
            gender="female"
            size={160}
            className="my-4"
          />

          <div className="text-center mt-2 z-10">
            {isEditingNickname ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500 text-white text-sm font-bold focus:outline-none"
                />
                <button
                  onClick={handleSaveNickname}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Lưu
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-2xl font-black text-slate-100">{pet.anonymous_name}</h3>
                {nicknameChangesLeft > 0 && (
                  <button
                    onClick={() => setIsEditingNickname(true)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Đổi bí danh (còn 1 lần)"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs px-3 py-1 rounded-full bg-indigo-900 text-indigo-200 border border-indigo-700 font-bold">
                Level {pet.level} • Khởi Đầu Khám Phá
              </span>
            </div>
          </div>

          {/* Vitality & Health Bar */}
          <div className="w-full max-w-md mt-6 space-y-2 z-10 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300 flex items-center gap-1.5">
                🍖 Sinh Lực Tamagotchi
              </span>
              <span className={pet.vitality_percent < 60 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                {pet.vitality_percent}% ({pet.vitality_percent < 60 ? 'Đói & Cần làm bài' : 'Khỏe mạnh'})
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  pet.vitality_percent < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${pet.vitality_percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Evolution Branches & Info */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                🧬 Chọn Nhánh Tiến Hóa
              </h4>
              <span className="text-[11px] font-mono text-indigo-400 font-bold">
                Còn {evolutionChangesLeft}/3 lần
              </span>
            </div>

            <div className="space-y-2.5">
              {branches.map(b => (
                <button
                  key={b.code}
                  disabled={evolutionChangesLeft <= 0 && pet.evolution_branch !== b.code}
                  onClick={() => handleBranchSelect(b.code)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                    pet.evolution_branch === b.code
                      ? 'border-indigo-500 bg-indigo-950/60 shadow-lg shadow-indigo-950'
                      : evolutionChangesLeft <= 0
                      ? 'border-slate-800/40 bg-slate-950/40 opacity-50 cursor-not-allowed'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{b.icon}</span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-200">{b.name}</h5>
                      <p className="text-[10px] text-slate-400 mt-0.5">{b.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              📈 Mốc Cấp Độ Tiếp Theo
            </h4>
            <div className="flex items-center justify-between text-xs text-slate-300 py-1 border-b border-slate-800">
              <span>XP Hiện tại:</span>
              <span className="font-bold text-indigo-400">{pet.current_xp} XP</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300 py-1 border-b border-slate-800">
              <span>Mục tiêu Level {pet.level + 1}:</span>
              <span className="font-bold text-amber-400">{xpRequired} XP</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300 py-1">
              <span>Cần thêm:</span>
              <span className="font-bold text-rose-400">{Math.max(0, xpRequired - pet.current_xp)} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Egg Customization Modal */}
      <EggCustomizationModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        currentColor={eggColor}
        branch={pet.evolution_branch}
        onSaveColor={(color) => {
          setEggColor(color);
          setEggColorChangesMonth(0);
        }}
      />
    </div>
  );
}
