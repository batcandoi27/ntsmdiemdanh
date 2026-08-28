'use client';

import React, { useState } from 'react';
import { VirtualShopItem } from '@/types/student-portal';
import { Coins, Sparkles, X, Check, Lock, ShoppingBag } from 'lucide-react';

interface VirtualShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoins: number;
  userLevel: number;
  onPurchase: (itemCode: string) => Promise<{ success: boolean; message: string }>;
}

const EXPANDED_SHOP_ITEMS: VirtualShopItem[] = [
  // 1. Nội Thất Nhà Riêng (Furniture)
  {
    id: 'item-f1',
    item_code: 'cosmic_bed',
    item_name: 'Giường Ngủ Phi Thuyền',
    category: 'furniture',
    price_coins: 25,
    svg_asset_data: '🛏️',
    required_level: 1,
    is_available: true
  },
  {
    id: 'item-f2',
    item_code: 'study_desk',
    item_name: 'Bàn Học Thông Thái',
    category: 'furniture',
    price_coins: 30,
    svg_asset_data: '🪑',
    required_level: 1,
    is_available: true
  },
  {
    id: 'item-f3',
    item_code: 'magic_bookshelf',
    item_name: 'Tủ Sách Thần Kỳ',
    category: 'furniture',
    price_coins: 45,
    svg_asset_data: '📚',
    required_level: 2,
    is_available: true
  },
  {
    id: 'item-f4',
    item_code: 'gaming_sofa',
    item_name: 'Ghế Gaming Siêu Cấp',
    category: 'furniture',
    price_coins: 60,
    svg_asset_data: '🛋️',
    required_level: 3,
    is_available: true
  },

  // 2. Trang Trí & Đèn Neon (Decor)
  {
    id: 'item-d1',
    item_code: 'magic_carpet',
    item_name: 'Thảm Lông Thần Thoại',
    category: 'decoration',
    price_coins: 20,
    svg_asset_data: '🧶',
    required_level: 1,
    is_available: true
  },
  {
    id: 'item-d2',
    item_code: 'neon_lamp',
    item_name: 'Đèn Neon Ma Thuật',
    category: 'decoration',
    price_coins: 35,
    svg_asset_data: '🏮',
    required_level: 2,
    is_available: true
  },
  {
    id: 'item-d3',
    item_code: 'galaxy_frame',
    item_name: 'Tranh Treo Tường Ngân Hà',
    category: 'decoration',
    price_coins: 40,
    svg_asset_data: '🖼️',
    required_level: 2,
    is_available: true
  },
  {
    id: 'item-d4',
    item_code: 'magic_tree',
    item_name: 'Cây Tri Thức Phát Sáng',
    category: 'decoration',
    price_coins: 50,
    svg_asset_data: '🌳',
    required_level: 3,
    is_available: true
  },

  // 3. Trang Sức & Phụ Kiện (Jewelry)
  {
    id: 'item-j1',
    item_code: 'star_crown',
    item_name: 'Vương Miện Tinh Tú',
    category: 'jewelry',
    price_coins: 75,
    svg_asset_data: '👑',
    required_level: 4,
    is_available: true
  },
  {
    id: 'item-j2',
    item_code: 'dragon_wings',
    item_name: 'Cánh Rồng Ánh Sáng',
    category: 'jewelry',
    price_coins: 90,
    svg_asset_data: '🪽',
    required_level: 5,
    is_available: true
  },
  {
    id: 'item-j3',
    item_code: 'cyber_glasses',
    item_name: 'Kính Râm Cyberpunk',
    category: 'jewelry',
    price_coins: 35,
    svg_asset_data: '🕶️',
    required_level: 2,
    is_available: true
  },
  {
    id: 'item-j4',
    item_code: 'lucky_charm',
    item_name: 'Vòng Tay May Mắn',
    category: 'jewelry',
    price_coins: 25,
    svg_asset_data: '📿',
    required_level: 1,
    is_available: true
  },

  // 4. Kiến Trúc Căn Cứ (Building)
  {
    id: 'item-b1',
    item_code: 'cozy_cabin',
    item_name: 'Nhà Gỗ Nhỏ Ấm Áp',
    category: 'building',
    price_coins: 0,
    svg_asset_data: '🏠',
    required_level: 1,
    is_available: true
  },
  {
    id: 'item-b2',
    item_code: 'space_pod',
    item_name: 'Trạm Không Gian Alpha',
    category: 'building',
    price_coins: 80,
    svg_asset_data: '🚀',
    required_level: 5,
    is_available: true
  },
  {
    id: 'item-b3',
    item_code: 'crystal_castle',
    item_name: 'Lâu Đài Pha Lê Vĩnh Cửu',
    category: 'building',
    price_coins: 150,
    svg_asset_data: '🏰',
    required_level: 10,
    is_available: true
  }
];

export const VirtualShopModal: React.FC<VirtualShopModalProps> = ({
  isOpen,
  onClose,
  userCoins,
  userLevel,
  onPurchase
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'furniture' | 'decoration' | 'jewelry' | 'building'>('all');
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ code: string; message: string; success: boolean } | null>(null);

  if (!isOpen) return null;

  const filteredItems = selectedCategory === 'all'
    ? EXPANDED_SHOP_ITEMS
    : EXPANDED_SHOP_ITEMS.filter(item => item.category === selectedCategory);

  const handleBuy = async (item: VirtualShopItem) => {
    if (userCoins < item.price_coins || userLevel < item.required_level) return;
    setLoadingCode(item.item_code);
    setFeedback(null);
    try {
      const res = await onPurchase(item.item_code);
      setFeedback({ code: item.item_code, message: res.message, success: res.success });
    } catch {
      setFeedback({ code: item.item_code, message: 'Lỗi giao dịch!', success: false });
    } finally {
      setLoadingCode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900 via-indigo-950/60 to-slate-950 rounded-3xl border border-amber-500/40 shadow-2xl p-6 space-y-5 text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-900/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white tracking-tight flex items-center gap-2">
                Cửa Hàng Vật Phẩm & Nội Thất
              </h3>
              <p className="text-xs text-indigo-300">Trang hoàng căn cứ & sắm sửa trang sức độc quyền</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 font-mono font-bold text-sm shadow-inner">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{userCoins} Xu</span>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'Tất Cả', icon: '✨' },
            { id: 'furniture', label: 'Nội Thất', icon: '🛏️' },
            { id: 'decoration', label: 'Trang Trí', icon: '🏮' },
            { id: 'jewelry', label: 'Trang Sức', icon: '👑' },
            { id: 'building', label: 'Căn Cứ', icon: '🏰' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 custom-scrollbar">
          {filteredItems.map(item => {
            const canAfford = userCoins >= item.price_coins;
            const levelUnlocked = userLevel >= item.required_level;
            const canBuy = canAfford && levelUnlocked;
            const isLoading = loadingCode === item.item_code;
            const isSuccess = feedback?.code === item.item_code && feedback.success;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  !levelUnlocked
                    ? 'bg-slate-950/60 border-slate-800/60 opacity-60'
                    : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner shrink-0">
                    {item.svg_asset_data}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white leading-snug">{item.item_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-black text-amber-400 font-mono flex items-center gap-0.5">
                        <Coins className="w-3 h-3" />
                        {item.price_coins === 0 ? 'Miễn phí' : `${item.price_coins} Xu`}
                      </span>
                      {!levelUnlocked && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Lv.{item.required_level}+
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canBuy || isLoading}
                  onClick={() => handleBuy(item)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition active:scale-95 flex items-center gap-1 ${
                    isSuccess
                      ? 'bg-emerald-600 text-white'
                      : canBuy
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  ) : isSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã Mua</span>
                    </>
                  ) : item.price_coins === 0 ? (
                    <span>Nhận</span>
                  ) : (
                    <span>Mua</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-indigo-900/40 text-center">
          <p className="text-[11px] text-slate-400">
            💡 Mua vật phẩm sẽ tự động lưu vào Kho đồ và trang trí cho Căn cứ của bạn trong Metaverse!
          </p>
        </div>

      </div>
    </div>
  );
};
