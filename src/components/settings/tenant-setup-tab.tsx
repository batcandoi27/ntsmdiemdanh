'use client';

import React, { useState, useEffect } from 'react';
import {
  School,
  Globe,
  Database,
  Bot,
  Copy,
  Check,
  Save,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Code2,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StudentCurriculumVitaeService, SchoolProfileData } from '@/services/student-cv-service';
import toast from 'react-hot-toast';

export function TenantSetupTab() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  // School Identity state
  const [profile, setProfile] = useState<SchoolProfileData>({
    school_code: 'TBC',
    school_name: 'TRƯỜNG THCS TRẦN BỘI CƠ',
    governing_body: 'ỦY BAN NHÂN DÂN QUẬN 5',
    district_name: 'Quận 5',
    province_name: 'TP. Hồ Chí Minh',
    school_year: '2026-2027',
    portal_url: 'https://thcstbc.kgvh.io.vn',
    hotline: '(028) 3855 0412',
    zalo_gateway_url: 'https://zalo.thaycoai.io.vn',
    zalo_bridge_token: 'sk-zalokeybatcandoi'
  });

  // Supabase Environment variables
  const [supabaseUrl, setSupabaseUrl] = useState(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lczrqxqohgskwewkcsur.supabase.co');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await StudentCurriculumVitaeService.getSchoolProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load school profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await StudentCurriculumVitaeService.saveSchoolProfile(profile);
      toast.success('Đã lưu cấu hình trường học & Zalo Bot thành công!');
    } catch (err: any) {
      toast.error('Lỗi khi lưu cấu hình: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    toast.success('Đã sao chép vào bộ nhớ đệm (Clipboard)!');
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const testSupabaseConnection = async () => {
    setTestingSupabase(true);
    setSupabaseStatus('idle');
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: supabaseAnonKey || 'test'
        }
      });
      if (res.ok || res.status === 200 || res.status === 401) {
        setSupabaseStatus('ok');
        toast.success('Kết nối Supabase REST API thành công!');
      } else {
        setSupabaseStatus('err');
        toast.error(`Kết nối phản hồi HTTP ${res.status}`);
      }
    } catch {
      setSupabaseStatus('err');
      toast.error('Không thể kết nối đến Supabase URL đã nhập');
    } finally {
      setTestingSupabase(false);
    }
  };

  // Generate 1-Click .env.local file content for new Vercel deployment
  const envLocalClip = `# ============================================================
# CẤU HÌNH BIẾN MÔI TRƯỜNG DÀNH CHO: ${profile.school_name.toUpperCase()} (${profile.school_code})
# Triển khai Vercel Domain: ${profile.portal_url}
# ============================================================

# 1. School Identity
NEXT_PUBLIC_SCHOOL_CODE=${profile.school_code}
NEXT_PUBLIC_APP_URL=${profile.portal_url}

# 2. Supabase Cloud Database (Database-Per-Tenant)
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey || 'YOUR_ANON_KEY'}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceRoleKey || 'YOUR_SERVICE_ROLE_KEY'}

# 3. Zalo Bot Gateway (Central Daemon Port 3871)
ZALO_GATEWAY_URL=${profile.zalo_gateway_url || 'https://zalo.thaycoai.io.vn'}
ZALO_GATEWAY_TOKEN=${profile.zalo_bridge_token || 'sk-zalokeybatcandoi'}
ZALO_BRIDGE_TOKEN=${profile.zalo_bridge_token || 'sk-zalokeybatcandoi'}
NEXT_PUBLIC_ZALO_GATEWAY_URL=${profile.zalo_gateway_url || 'https://zalo.thaycoai.io.vn'}
`;

  // Generate 1-Click Bot Registry JSON snippet for Central app-zalobot
  const cleanPortalUrl = profile.portal_url.endsWith('/') ? profile.portal_url.slice(0, -1) : profile.portal_url;
  const botRegistryClip = `"${profile.school_code}": {
  "code": "${profile.school_code}",
  "name": "${profile.school_name}",
  "webhook_url": "${cleanPortalUrl}/api/zalo/webhook",
  "bridge_token": "${profile.zalo_bridge_token || 'sk-zalokeybatcandoi'}",
  "portal_url": "${cleanPortalUrl}",
  "active": true
}`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-sky-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <School className="w-64 h-64" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              1-Click Multi-Tenant Deployment Hub
            </div>
            <h2 className="text-2xl font-bold">Cấu Hình Trường Học, Vercel & Zalo Bot Đa Điểm</h2>
            <p className="text-blue-100 text-sm mt-1 max-w-2xl">
              Quản lý danh tính trường, tên miền Vercel, cơ sở dữ liệu Supabase độc lập và cấu hình định tuyến cho Zalo Bot trung tâm chỉ trong một giao diện.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={loadProfile}
              disabled={loading}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition flex items-center gap-1.5 backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Tải lại
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm shadow-md transition flex items-center gap-1.5"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu Cấu Hình
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: School Identity */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">1. Danh Tính & Thông Tin Trường Học</h3>
                <p className="text-xs text-slate-500">Hiển thị trên toàn bộ cổng Web, Sổ báo bài và tin nhắn Zalo</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Tên Trường Học (In hoa chính thức) *
                </label>
                <input
                  type="text"
                  value={profile.school_name}
                  onChange={(e) => setProfile({ ...profile, school_name: e.target.value })}
                  placeholder="VD: TRƯỜNG THCS TRẦN BỘI CƠ"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Mã Định Danh Trường (School Code) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.school_code}
                    onChange={(e) => setProfile({ ...profile, school_code: e.target.value.toUpperCase() })}
                    placeholder="VD: TBC, CVA, LQD"
                    className="w-full uppercase font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-blue-600 dark:text-blue-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">Dùng cho /ketnoi</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Niên Khóa Học Tập *
                </label>
                <input
                  type="text"
                  value={profile.school_year}
                  onChange={(e) => setProfile({ ...profile, school_year: e.target.value })}
                  placeholder="VD: 2026-2027"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Cơ Quan Quản Lý Cấp Trên
                </label>
                <input
                  type="text"
                  value={profile.governing_body}
                  onChange={(e) => setProfile({ ...profile, governing_body: e.target.value })}
                  placeholder="VD: ỦY BAN NHÂN DÂN QUẬN 5 hoặc PHÒNG GD&ĐT QUẬN 5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Quận / Huyện
                </label>
                <input
                  type="text"
                  value={profile.district_name}
                  onChange={(e) => setProfile({ ...profile, district_name: e.target.value })}
                  placeholder="VD: Quận 5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Tỉnh / Thành Phố
                </label>
                <input
                  type="text"
                  value={profile.province_name}
                  onChange={(e) => setProfile({ ...profile, province_name: e.target.value })}
                  placeholder="VD: TP. Hồ Chí Minh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Hotline / Văn Phòng Trường
                </label>
                <input
                  type="text"
                  value={profile.hotline || ''}
                  onChange={(e) => setProfile({ ...profile, hotline: e.target.value })}
                  placeholder="VD: (028) 3855 0412"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Tên Miền Web Vercel (Domain) *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={profile.portal_url}
                    onChange={(e) => setProfile({ ...profile, portal_url: e.target.value })}
                    placeholder="https://thcstbc.kgvh.io.vn"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-indigo-600 dark:text-indigo-400 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <a
                    href={profile.portal_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-blue-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Database & Zalo Bot Cloud Gateway */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">2. Kết Nối Zalo Bot & Webhook Gateway</h3>
                <p className="text-xs text-slate-500">Định tuyến tin nhắn từ Bot Zalo trung tâm về Backend Vercel của trường</p>
              </div>
            </div>

            <div className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Zalo Bot Gateway URL (Port 3871 hoặc Domain HTTPS)
                </label>
                <input
                  type="text"
                  value={profile.zalo_gateway_url || ''}
                  onChange={(e) => setProfile({ ...profile, zalo_gateway_url: e.target.value })}
                  placeholder="https://zalo.thaycoai.io.vn hoặc http://127.0.0.1:3871"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Bridge Token Xác Thực (x-bridge-token)
                </label>
                <input
                  type="text"
                  value={profile.zalo_bridge_token || ''}
                  onChange={(e) => setProfile({ ...profile, zalo_bridge_token: e.target.value })}
                  placeholder="sk-zalokeybatcandoi"
                  className="w-full font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Webhook Endpoint của trường này:</span>
                  <div className="font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    {profile.portal_url.replace(/\/$/, '')}/api/zalo/webhook
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(`${profile.portal_url.replace(/\/$/, '')}/api/zalo/webhook`, 'webhook_url')}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 text-slate-600 dark:text-slate-200 flex items-center gap-1"
                >
                  {copiedSection === 'webhook_url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Sao chép
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 1-Click Code Snippets & Deploy Clip (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: 1-Click Clip for Vercel .env.local */}
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-5 shadow-sm relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm text-slate-200">1-Click .env.local Cho Vercel</h4>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(envLocalClip, 'env_clip')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                {copiedSection === 'env_clip' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy .env
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-2 mb-3">
              Sao chép toàn bộ biến môi trường này và dán trực tiếp vào mục <strong>Settings ➔ Environment Variables</strong> trên Vercel của trường mới.
            </p>

            <pre className="text-[11px] font-mono bg-slate-950 p-3.5 rounded-xl overflow-x-auto text-emerald-400/90 border border-slate-800/80 max-h-48">
              {envLocalClip}
            </pre>
          </div>

          {/* Card 4: 1-Click Registry Snippet for app-zalobot */}
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-5 shadow-sm relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <h4 className="font-bold text-sm text-slate-200">Snippet Đăng Ký Vào Bot Zalo</h4>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(botRegistryClip, 'bot_clip')}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                {copiedSection === 'bot_clip' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy JSON
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-2 mb-3">
              Dán đoạn JSON này vào file <code>schools_registry.json</code> của bot trung tâm để kích hoạt định tuyến tức thì.
            </p>

            <pre className="text-[11px] font-mono bg-slate-950 p-3.5 rounded-xl overflow-x-auto text-cyan-300 border border-slate-800/80">
              {botRegistryClip}
            </pre>
          </div>

          {/* Card 5: Parent Onboarding Quick Guide */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-300 dark:border-amber-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm mb-2">
              <Sparkles className="w-4 h-4" />
              Cú Pháp Nhận Diện Phụ Huynh Trường Này:
            </div>
            <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-center">
              <span className="text-xs text-slate-500">Phụ huynh gửi tin nhắn Zalo:</span>
              <div className="text-base font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                /ketnoi {profile.school_code}-[MÃ_HỌC_SINH]
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                (Ví dụ: <code>/ketnoi {profile.school_code}-6A5_22</code>)
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
