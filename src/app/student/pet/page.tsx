'use client';

import React, { useState } from 'react';
import { SvgPet } from '@/components/student/svg-pet';
import { EggCustomizationModal } from '@/components/student/egg-customization-modal';
import { ClassroomWorldGrid } from '@/components/student/classroom-world-grid';
import { VirtualShopModal } from '@/components/student/virtual-shop-modal';
import { PetEvolutionBranch, StudentPet } from '@/types/student-portal';
import { soundscape } from '@/domain/sound/web-audio-soundscape';
import { purchaseShopItemAction } from '@/app/actions/student-actions';
import { Palette, Sparkles, RefreshCw, Lock, Edit3, ShieldAlert, Check, Volume2, VolumeX, Home, Globe, ShoppingBag } from 'lucide-react';

export default function StudentPetPage() {
  const [activeTab, setActiveTab] = useState<'pet' | 'village'>('pet');
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [eggColor, setEggColor] = useState('#9d4edd');
  const [isMuted, setIsMuted] = useState(soundscape.isMuted());
  
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
    soundscape.playSoftChime();
    setPet(prev => ({ ...prev, evolution_branch: branch }));
    setEvolutionChangesLeft(prev => prev - 1);
  };

  const handleSaveNickname = () => {
    if (nicknameChangesLeft <= 0) {
      alert('🔒 Bạn chỉ được đổi bí danh 1 lần duy nhất ban đầu!');
      return;
    }
    if (!nicknameInput.trim()) return;
    soundscape.playSoftChime();
    setPet(prev => ({ ...prev, anonymous_name: nicknameInput.trim() }));
    setNicknameChangesLeft(0);
    setIsEditingNickname(false);
  };

  const handleUseRebirthToken = () => {
    if (rebirthTokens <= 0) {
      alert('Bạn chưa có Phiếu Tẩy Tủy nào! Hãy hoàn thành nhiệm vụ và lọt Top tháng để nhận thưởng.');
      return;
    }
    soundscape.playMilestoneFanfare();
    setRebirthTokens(prev => prev - 1);
    setEvolutionChangesLeft(3);
    setNicknameChangesLeft(1);
    setEggColorChangesMonth(1);
    alert('🔮 Đã Tẩy Tủy thành công! Bạn nhận lại 3 lượt đổi nhánh, 1 lượt đổi tên và 1 lượt đổi màu trứng.');
  };

  const toggleSound = () => {
    const newState = soundscape.toggleMute();
    setIsMuted(newState);
  };

  const xpRequired = Math.round(100 * Math.pow(1.5, Math.max(0, pet.level)));

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white border border-slate-200 rounded-3xl shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            🥚 Không Gian Nuôi Dưỡng Thú Cưng SVG
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Khởi tạo Level 1 Baseline • Quản lý hạn ngạch tùy biến & Âm thanh tương tác sống động
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute / Unmute Soundscape */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition ${
              isMuted
                ? 'bg-slate-100 border-slate-200 text-slate-500'
                : 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
            }`}
            title={isMuted ? 'Bật âm thanh tương tác' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-500" />}
            <span className="hidden sm:inline">{isMuted ? 'Tắt Âm' : 'Âm Thanh Bật'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (eggColorChangesMonth <= 0) {
                alert('🔒 Bạn đã dùng hết lượt đổi màu trứng tháng này!');
                return;
              }
              setIsColorModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Palette className="w-4 h-4 text-amber-300" />
            <span>Đổi Màu Trứng ({eggColorChangesMonth}/1 tháng)</span>
          </button>
        </div>
      </div>

      {/* Quota & Rebirth Token Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-white border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 block">
              Hạn Ngạch Tùy Biến: Còn {evolutionChangesLeft}/3 Lần Đổi Nhánh • {nicknameChangesLeft}/1 Lần Đổi Tên
            </span>
            <span className="text-[11px] text-purple-700 font-medium">
              Khi hết lượt, bạn cần đạt Top Nhiệm vụ / Thi đua tháng để nhận <strong>Phiếu Tẩy Tủy</strong>.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-800 font-mono font-bold shadow-2xs">
            🔮 {rebirthTokens} Phiếu Tẩy Tủy
          </span>
          {rebirthTokens > 0 && (
            <button
              onClick={handleUseRebirthToken}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition active:scale-95 shadow-sm"
            >
              Tẩy Tủy Ngay
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit border border-slate-300/80 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('pet')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
            activeTab === 'pet'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Home className="w-4 h-4 text-indigo-600" />
          <span>Nuôi Dưỡng Thú Cưng (Phòng Riêng)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('village')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
            activeTab === 'village'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-600" />
          <span>Làng Lớp Học Metaverse 2D (Cả Lớp Đi Dạo)</span>
        </button>
      </div>

      {/* TAB 1: NUÔI DƯỠNG THÚ CƯNG RIÊNG */}
      {activeTab === 'pet' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Main Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Visual Showcase Card */}
            <div
              onClick={() => soundscape.playPetInteractSound(pet.evolution_branch)}
              className="md:col-span-2 rounded-3xl border-2 border-indigo-200 bg-white p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-sm cursor-pointer group select-none hover:border-indigo-400 transition-all"
              title="Nhấn vào để tương tác cùng thú cưng!"
            >
              <div className="absolute top-4 right-4 z-10">
                <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                  ✨ Chạm vào để chơi cùng bạn ấy!
                </span>
              </div>

              {/* Pet SVG with Animations */}
              <div className="py-8 transform transition-transform group-hover:scale-105 duration-300">
                <SvgPet
                  branch={pet.evolution_branch}
                  level={pet.level}
                  vitality={pet.vitality_percent}
                  isHibernating={pet.is_hibernating}
                  customColor={eggColor}
                  gender="female"
                  size={190}
                />
              </div>

              {/* Identity & Baseline Level Info */}
              <div className="w-full mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    {isEditingNickname ? (
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={nicknameInput}
                          onChange={e => setNicknameInput(e.target.value)}
                          maxLength={30}
                          className="px-2.5 py-1 text-xs font-bold border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          placeholder="Nhập bí danh mới..."
                        />
                        <button
                          onClick={handleSaveNickname}
                          className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">
                          {pet.anonymous_name}
                        </h3>
                        {nicknameChangesLeft > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditingNickname(true);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition"
                            title="Đổi bí danh (1 lần duy nhất)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-indigo-700 font-bold mt-0.5">
                    Level {pet.level} • Khởi đầu Hành trình • Lớp {pet.class_id}
                  </p>
                </div>

                {/* Vitality & Streak */}
                <div className="flex items-center gap-4">
                  <div className="text-center sm:text-right">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Sinh Lực</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">{pet.vitality_percent}% Khỏe Mạnh</span>
                  </div>
                  <div className="text-center sm:text-right">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Chuỗi Chăm Chỉ</span>
                    <span className="text-xs font-mono font-bold text-amber-700">🔥 {pet.streak_days} Ngày</span>
                  </div>
                </div>
              </div>

              {/* Baseline XP Progress Bar */}
              <div className="w-full mt-3">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                  <span>Tiến trình Level {pet.level}</span>
                  <span>{pet.current_xp} / {xpRequired} XP</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${Math.min(100, Math.round((pet.current_xp / xpRequired) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Evolution Branches & Info */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    🧬 Chọn Nhánh Tiến Hóa
                  </h4>
                  <span className="text-[11px] font-mono text-purple-700 font-bold">
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
                          ? 'border-indigo-400 bg-indigo-50/80 shadow-xs'
                          : evolutionChangesLeft <= 0
                          ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{b.icon}</span>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{b.name}</h5>
                          <p className="text-[10px] text-slate-600 mt-0.5 font-medium">{b.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <h4 className="text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
                  📈 Mốc Cấp Độ Tiếp Theo
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-700 py-1.5 border-b border-slate-100 font-medium">
                  <span>XP Hiện tại:</span>
                  <span className="font-bold text-indigo-700 font-mono">{pet.current_xp} XP</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-700 py-1.5 border-b border-slate-100 font-medium">
                  <span>Mục tiêu Level {pet.level + 1}:</span>
                  <span className="font-bold text-amber-700 font-mono">{xpRequired} XP</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-700 py-1.5 font-medium">
                  <span>Cần thêm:</span>
                  <span className="font-bold text-rose-600 font-mono">{Math.max(0, xpRequired - pet.current_xp)} XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LÀNG LỚP HỌC METAVERSE 2D */}
      {activeTab === 'village' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-2xs">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                🏡 Làng Lớp Học 2D (Classroom Metaverse)
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Không gian cộng đồng 64 ô đất của lớp • Thú cưng cả lớp cùng đi dạo và ghé thăm căn cứ của nhau
              </p>
            </div>

            <button
              onClick={() => setIsShopOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-md shadow-amber-500/20 active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cửa Hàng Vật Phẩm</span>
            </button>
          </div>

          {/* Metaverse Grid với 100% Học Sinh Lớp 8A13 */}
          <ClassroomWorldGrid
            classCode={pet.class_id || '8A13'}
            currentUserLevel={pet.level}
            currentPetId="std-8A13-01"
            myEggColor={eggColor}
          />

          {/* Modal Shop */}
          <VirtualShopModal
            isOpen={isShopOpen}
            onClose={() => setIsShopOpen(false)}
            userCoins={pet.total_coins}
            userLevel={pet.level}
            onPurchase={async (itemCode) => {
              const res = await purchaseShopItemAction(pet.id, itemCode);
              if (res.success) {
                setPet(prev => ({ ...prev, total_coins: Math.max(0, prev.total_coins - 20) }));
              }
              return res;
            }}
          />
        </div>
      )}

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
