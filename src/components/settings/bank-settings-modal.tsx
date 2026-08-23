'use client';

import React, { useState, useEffect } from 'react';
import { BankInfo } from '@/types/models';
import { VIETQR_BANKS, VietQRBank, buildVietQRImageUrl } from '@/lib/vietqr-banks';
import { getUserBankInfo, updateUserBankInfo, getSchoolBankInfo, saveSchoolBankInfo } from '@/services/user-service';
import { Modal } from '@/components/ui/modal';
import { Building2, CreditCard, User, Check, Loader2, Sparkles, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

interface BankSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  isSchoolAdmin?: boolean; // Nếu là admin thì có tùy chọn sửa STK Toàn trường
}

export function BankSettingsModal({ isOpen, onClose, userId, isSchoolAdmin }: BankSettingsModalProps) {
  const [targetType, setTargetType] = useState<'teacher' | 'school'>(isSchoolAdmin ? 'school' : 'teacher');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bankId, setBankId] = useState('MB');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankSearch, setBankSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    async function loadBankInfo() {
      setLoading(true);
      try {
        if (targetType === 'school') {
          const info = await getSchoolBankInfo();
          if (info) {
            setBankId(info.bankId || 'MB');
            setAccountNumber(info.accountNumber || '');
            setAccountName(info.accountName || '');
          } else {
            setAccountNumber('');
            setAccountName('');
          }
        } else if (userId) {
          const info = await getUserBankInfo(userId);
          if (info) {
            setBankId(info.bankId || 'MB');
            setAccountNumber(info.accountNumber || '');
            setAccountName(info.accountName || '');
          } else {
            setAccountNumber('');
            setAccountName('');
          }
        }
      } catch (err) {
        console.error('Error loading bank info:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBankInfo();
  }, [isOpen, targetType, userId]);

  const filteredBanks = VIETQR_BANKS.filter(
    b =>
      b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.shortName.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.code.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.id.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const selectedBank = VIETQR_BANKS.find(b => b.id === bankId) || VIETQR_BANKS[0];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim() || !accountName.trim()) {
      toast.error('Vui lòng nhập đầy đủ Số tài khoản và Tên chủ tài khoản!');
      return;
    }

    const payload: BankInfo = {
      bankId: selectedBank.id,
      bankName: selectedBank.shortName,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim().toUpperCase(),
      qrTemplate: 'compact2'
    };

    setSaving(true);
    try {
      if (targetType === 'school') {
        await saveSchoolBankInfo(payload);
        toast.success('Đã lưu cấu hình STK Chung Toàn Trường thành công!');
      } else if (userId) {
        await updateUserBankInfo(userId, payload);
        toast.success('Đã lưu cấu hình STK Cá Nhân / Quỹ Lớp thành công!');
      }
      onClose();
    } catch (err: any) {
      toast.error('Lỗi khi lưu STK: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const previewQR =
    accountNumber.trim() && accountName.trim()
      ? buildVietQRImageUrl({
          bankId: selectedBank.id,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          amount: 50000,
          orderInfo: 'TEST VIETQR'
        })
      : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài Đặt Tài Khoản Ngân Hàng (Mã VietQR)"
    >
      <div className="space-y-5">
        {/* Toggle Target Type (Nếu là Admin) */}
        {isSchoolAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setTargetType('school')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                targetType === 'school'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏫 STK Thu Tiền Toàn Trường (Admin)
            </button>
            <button
              type="button"
              onClick={() => setTargetType('teacher')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                targetType === 'teacher'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🧑‍🏫 STK Cá Nhân / Quỹ Lớp Của Tôi
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
            {/* 1. Chọn Ngân hàng */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>1. Chọn Ngân hàng thụ hưởng</span>
              </label>

              <input
                type="text"
                placeholder="🔍 Tìm nhanh tên ngân hàng (VD: MB, VCB, Techcombank, BIDV...)"
                value={bankSearch}
                onChange={e => setBankSearch(e.target.value)}
                className="w-full bg-surface-card border border-border-default rounded-xl px-3.5 py-2 text-xs mb-2 text-text-primary placeholder:text-text-disabled focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none shadow-xs"
              />

              <select
                value={bankId}
                onChange={e => setBankId(e.target.value)}
                className="w-full bg-surface-card border border-border-default rounded-xl px-3.5 py-2.5 font-bold text-text-primary focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none shadow-xs cursor-pointer text-sm"
              >
                {filteredBanks.map(b => (
                  <option key={b.id} value={b.id} className="text-text-primary bg-surface-card">
                    {b.shortName} ({b.code}) - {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Số tài khoản */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>2. Số tài khoản (STK)</span>
              </label>
              <input
                type="text"
                placeholder="VD: 0987654321, 0000123456789..."
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            {/* 3. Tên chủ tài khoản */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" />
                <span>3. Tên chủ tài khoản (Viết hoa không dấu)</span>
              </label>
              <input
                type="text"
                placeholder="VD: NGUYEN VAN AN hoặc TRUONG THCS TRAN BOI CO"
                value={accountName}
                onChange={e => setAccountName(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 uppercase focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            {/* Preview Card */}
            {previewQR && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-3">
                <div className="w-14 h-14 bg-white rounded-xl border border-indigo-200 p-1 shrink-0 flex items-center justify-center">
                  <img src={previewQR} alt="VietQR Preview" className="w-full h-full object-contain" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-indigo-950 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Mẫu VietQR hợp lệ</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    {selectedBank.shortName} • {accountNumber} • {accountName}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Lưu Cấu Hình STK</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
