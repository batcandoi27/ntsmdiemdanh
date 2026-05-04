'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, CheckCircle, RefreshCw, X, ShieldAlert, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeacherGroup } from '@/types/teacher';
import { createGroupAction, updateGroupAction, deleteGroupAction } from '@/app/actions/teacher-actions';
import { toast } from 'react-hot-toast';
import { getAllGroups } from '@/services/teacher-service'; // Lấy dữ liệu client-side hoặc pass qua props

export function TeacherGroupsTab({ initialGroups }: { initialGroups: TeacherGroup[] }) {
  const [groups, setGroups] = useState<TeacherGroup[]>(initialGroups || []);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupLevel, setNewGroupLevel] = useState<'tieu_hoc' | 'thcs' | 'thpt' | 'all'>('thcs');
  const [isAdding, setIsAdding] = useState(false);

  const handleUpdate = async (id: string, updates: Partial<TeacherGroup>) => {
    setLoading(true);
    try {
      const res = await updateGroupAction(id, updates);
      if (res) {
        setGroups(groups.map(g => g.id === id ? { ...g, ...updates } : g));
        toast.success('Cập nhật thành công');
      } else {
        toast.error('Có lỗi xảy ra');
      }
    } catch (e) {
      toast.error('Lỗi hệ thống');
    } finally {
      setLoading(false);
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhóm này? Các giáo viên trong nhóm sẽ bị gỡ khỏi nhóm.')) return;
    setLoading(true);
    try {
      const res = await deleteGroupAction(id);
      if (res) {
        setGroups(groups.filter(g => g.id !== id));
        toast.success('Xóa nhóm thành công');
      } else {
        toast.error('Có lỗi xảy ra hoặc nhóm hệ thống không thể xóa');
      }
    } catch (e) {
      toast.error('Lỗi hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newGroupName.trim()) return;
    setLoading(true);
    try {
      const res = await createGroupAction(newGroupName, 'custom', newGroupLevel, 'department');
      if (res) {
        setGroups([...groups, res]);
        setNewGroupName('');
        setIsAdding(false);
        toast.success('Thêm nhóm thành công');
      } else {
        toast.error('Có lỗi xảy ra');
      }
    } catch (e) {
      toast.error('Lỗi hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const GroupItem = ({ group }: { group: TeacherGroup }) => {
    const isEditing = editingId === group.id;

    return (
      <div className={cn(
        "flex items-center justify-between p-3 rounded-xl border mb-2 transition-all",
        group.is_active ? "bg-white border-gray-100 hover:border-blue-200" : "bg-gray-50 border-gray-200 opacity-60"
      )}>
        <div className="flex-1 flex items-center gap-3">
          {group.is_system && (
            <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0" title="Nhóm hệ thống">
              <ShieldAlert className="w-3 h-3 text-blue-500" />
            </div>
          )}
          {!group.is_system && (
            <div className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center shrink-0" title="Nhóm tùy chỉnh">
              <Users className="w-3 h-3 text-orange-500" />
            </div>
          )}
          
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdate(group.id, { name: editName });
                if (e.key === 'Escape') setEditingId(null);
              }}
            />
          ) : (
            <span className={cn("text-sm font-bold", group.is_active ? "text-gray-700" : "text-gray-400 line-through")}>
              {group.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <button onClick={() => handleUpdate(group.id, { name: editName })} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="w-4 h-4" /></button>
              <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { setEditName(group.name); setEditingId(group.id); }} 
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                title="Đổi tên"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleUpdate(group.id, { is_active: !group.is_active })} 
                className={cn("p-1.5 rounded", group.is_active ? "text-orange-500 hover:bg-orange-50" : "text-green-600 hover:bg-green-50")}
                title={group.is_active ? "Tạm ngưng" : "Kích hoạt lại"}
              >
                <Power className="w-4 h-4" />
              </button>
              {!group.is_system && (
                <button 
                  onClick={() => handleDelete(group.id)} 
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  title="Xóa nhóm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderGroupColumn = (level: string, title: string, colorClass: string, bgClass: string) => {
    const columnGroups = groups.filter(g => g.level === level);
    
    return (
      <div className={cn("rounded-2xl border p-4", bgClass, colorClass)}>
        <h3 className="font-black text-[11px] uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>{title} ({columnGroups.length})</span>
          <button 
            onClick={() => { setIsAdding(true); setNewGroupLevel(level as any); }}
            className="p-1 hover:bg-white/50 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </h3>
        
        {isAdding && newGroupLevel === level && (
          <div className="flex items-center gap-2 mb-3 bg-white p-2 rounded-xl border border-blue-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nhập tên nhóm..."
              className="flex-1 px-2 py-1 border-none focus:ring-0 text-sm font-bold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
            <button onClick={handleAdd} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="w-4 h-4" /></button>
            <button onClick={() => setIsAdding(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {columnGroups.map(group => (
            <div key={group.id} className="group">
              <GroupItem group={group} />
            </div>
          ))}
          {columnGroups.length === 0 && !isAdding && (
            <div className="text-center py-8 text-xs font-medium opacity-50">Chưa có nhóm nào</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-blue-600" size={24} />
          Cấu hình Nhóm Giáo viên
        </h2>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Thiết lập các nhóm hệ thống (cố định) và nhóm tự chọn. Nhóm hệ thống không thể xóa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Cột Dùng chung chiếm full width phía trên nếu muốn, hoặc nằm cột đầu */}
        <div className="md:col-span-4">
          {renderGroupColumn('all', 'Dùng chung (Toàn trường)', 'text-blue-900 border-blue-100', 'bg-blue-50/30')}
        </div>
        
        {/* 3 Cột cấp học */}
        <div className="md:col-span-1 md:col-start-1 md:col-end-2">
          {renderGroupColumn('tieu_hoc', 'Tiểu Học', 'text-indigo-900 border-indigo-100', 'bg-indigo-50/30')}
        </div>
        
        <div className="md:col-span-1 md:col-start-2 md:col-end-3">
          {renderGroupColumn('thcs', 'Trung Học Cơ Sở', 'text-emerald-900 border-emerald-100', 'bg-emerald-50/30')}
        </div>
        
        <div className="md:col-span-2 md:col-start-3 md:col-end-5">
          {renderGroupColumn('thpt', 'Trung Học Phổ Thông', 'text-purple-900 border-purple-100', 'bg-purple-50/30')}
        </div>
      </div>
    </div>
  );
}
