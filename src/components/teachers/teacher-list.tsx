'use client';

import React, { useState } from 'react';
import { 
  Search, UserPlus, Mail, Phone, MapPin, 
  Trash2, Edit, LayoutGrid, List, ChevronDown, ChevronRight, User, CreditCard, Briefcase, FileUp, School, Loader2, CheckSquare, X, Columns
} from 'lucide-react';
import { deleteTeacherAction, deleteMultipleTeachersAction, addMultipleTeachersToGroupAction, addTeacherToGroupAction, removeTeacherFromGroupAction } from '@/app/actions/teacher-actions';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import ImportTeacherModal from './import-teacher-modal';
import EditTeacherModal from './edit-teacher-modal';
import { Teacher, TeacherGroup } from '@/types/teacher';

interface TeacherListProps {
  teachers: Teacher[];
  groups?: TeacherGroup[];
}

export default function TeacherList({ teachers, groups = [] }: TeacherListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [selectedColumnGroups, setSelectedColumnGroups] = useState<string[]>([]);
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [selectedBulkGroupId, setSelectedBulkGroupId] = useState<string>('');

  const activeGroups = groups.filter(g => g.is_active !== false); // fallback if is_active is undefined it's true

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa giáo viên "${name}"?`)) return;
    
    setIsDeleting(id);
    try {
      const success = await deleteTeacherAction(id);
      if (success) {
        toast.success('Đã xóa giáo viên thành công');
      } else {
        toast.error('Lỗi khi xóa giáo viên');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedTeacherIds.length} giáo viên đã chọn?`)) return;
    
    setIsBulkDeleting(true);
    try {
      const success = await deleteMultipleTeachersAction(selectedTeacherIds);
      if (success) {
        toast.success(`Đã xóa ${selectedTeacherIds.length} giáo viên thành công`);
        setSelectedTeacherIds([]);
      } else {
        toast.error('Có lỗi xảy ra khi xóa một số giáo viên');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedBulkGroupId) {
      toast.error('Vui lòng chọn một nhóm để gán');
      return;
    }
    const groupName = groups.find(g => g.id === selectedBulkGroupId)?.name;
    if (!confirm(`Bạn có chắc chắn muốn gán ${selectedTeacherIds.length} giáo viên vào nhóm "${groupName}"?`)) return;
    
    setIsBulkAssigning(true);
    try {
      const success = await addMultipleTeachersToGroupAction(selectedTeacherIds, selectedBulkGroupId);
      if (success) {
        toast.success(`Đã gán ${selectedTeacherIds.length} giáo viên vào nhóm thành công`);
        setSelectedTeacherIds([]); // Có thể giữ lại hoặc bỏ chọn
      } else {
        toast.error('Có lỗi xảy ra khi gán một số giáo viên');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống');
    } finally {
      setIsBulkAssigning(false);
      setSelectedBulkGroupId('');
    }
  };

  const toggleColumnGroup = (groupId: string) => {
    setSelectedColumnGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId].slice(0, 5) // Giới hạn max 5 cột
    );
  };

  const toggleTeacherSelection = (id: string) => {
    setSelectedTeacherIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedTeacherIds.length === filteredTeachers.length) {
      setSelectedTeacherIds([]);
    } else {
      setSelectedTeacherIds(filteredTeachers.map(t => t.id));
    }
  };

  // Hàm lấy tên (chữ cuối) để sắp xếp theo chuẩn Việt Nam
  const getLastName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1] || '';
  };

  const filteredTeachers = teachers
    .filter(t => {
      // Lọc bỏ dòng rác (chữ ký, tiêu đề...)
      if (!t.full_name || t.full_name.length < 2 || t.full_name.includes('(') || t.full_name.includes(':')) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return t.full_name.toLowerCase().includes(q) ||
        t.cccd?.includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.phone?.includes(q);
    })
    .sort((a, b) => getLastName(a.full_name).localeCompare(getLastName(b.full_name), 'vi'));

  return (
    <div className="space-y-6">
      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Tìm theo tên, SĐT, CCCD..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-white p-1 rounded-xl border border-gray-100 flex shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-blue-600 text-white shadow-md" : "text-gray-400")}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-blue-600 text-white shadow-md" : "text-gray-400")}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Nút tùy chỉnh cột Nhóm */}
          {viewMode === 'table' && (
            <div className="relative">
              <button 
                onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold border text-sm transition-all",
                  selectedColumnGroups.length > 0 
                    ? "bg-blue-50 text-blue-700 border-blue-200" 
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                )}
              >
                <Columns className="w-4 h-4" />
                Cột hiển thị {selectedColumnGroups.length > 0 && `(${selectedColumnGroups.length})`}
              </button>

              {isColumnDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsColumnDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-30">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Chọn nhóm hiển thị (Max 5)</p>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {activeGroups.map(group => (
                        <label key={group.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={selectedColumnGroups.includes(group.id)}
                            onChange={() => toggleColumnGroup(group.id)}
                            disabled={!selectedColumnGroups.includes(group.id) && selectedColumnGroups.length >= 5}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="text-sm font-medium text-gray-700">{group.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-semibold border border-emerald-100 text-sm"
          >
            <FileUp className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <div 
              key={teacher.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
              
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                    <User className="w-8 h-8" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setSelectedTeacher(teacher); setIsEditModalOpen(true); }}
                      className="p-2 bg-white shadow-sm border border-gray-100 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(teacher.id, teacher.full_name)}
                      disabled={isDeleting === teacher.id}
                      className="p-2 bg-white shadow-sm border border-gray-100 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title="Xóa"
                    >
                      {isDeleting === teacher.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-black text-xl text-gray-800 leading-tight mb-1">{teacher.full_name}</h3>
                  <div className="flex items-center gap-1.5 text-blue-600 text-xs font-black uppercase tracking-widest">
                    <Briefcase className="w-3 h-3" />
                    {teacher.position || 'Giáo viên'}
                  </div>
                </div>

                <div className="space-y-2.5 mb-6">
                  <InfoItem icon={<CreditCard className="w-4 h-4" />} label="CCCD" value={teacher.cccd || '---'} />
                  <InfoItem icon={<Phone className="w-4 h-4" />} label="SĐT" value={teacher.phone || '---'} />
                  <InfoItem icon={<Mail className="w-4 h-4" />} label="Email" value={teacher.email || '---'} />
                </div>

                {/* Tags Nhóm */}
                <div className="flex flex-wrap gap-1.5 pt-4 border-t border-gray-50">
                  {teacher.groups?.map(g => (
                    <span 
                      key={g.id} 
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight border",
                        g.category === 'department' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-orange-50 text-orange-600 border-orange-100"
                      )}
                    >
                      {g.name}
                    </span>
                  ))}
                  {(!teacher.groups || teacher.groups.length === 0) && (
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Chưa phân nhóm</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <TeacherTableView 
          teachers={filteredTeachers} 
          groups={groups}
          selectedColumnGroups={selectedColumnGroups}
          onEdit={(t) => { setSelectedTeacher(t); setIsEditModalOpen(true); }}
          onDelete={(t) => handleDelete(t.id, t.full_name)}
          selectedIds={selectedTeacherIds}
          onToggleSelect={toggleTeacherSelection}
          onToggleSelectAll={toggleAllSelection}
        />
      )}

      {/* Floating Bulk Action Bar */}
      {selectedTeacherIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 md:gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black">
              {selectedTeacherIds.length}
            </div>
            <span className="font-medium text-sm hidden md:inline">giáo viên được chọn</span>
          </div>
          
          <div className="w-px h-6 bg-gray-700 shrink-0" />
          
          <div className="flex items-center gap-2">
            <select
              value={selectedBulkGroupId}
              onChange={(e) => setSelectedBulkGroupId(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px] md:max-w-xs"
            >
              <option value="">Chọn nhóm để gán...</option>
              {activeGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            
            <button 
              onClick={handleBulkAssign}
              disabled={isBulkAssigning || !selectedBulkGroupId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {isBulkAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              <span className="hidden md:inline">Gán nhóm</span>
            </button>
            <button 
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ml-2"
            >
              {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span className="hidden md:inline">Xóa</span>
            </button>
          </div>
          
          <button 
            onClick={() => setSelectedTeacherIds([])}
            className="ml-2 p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {filteredTeachers.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">Không tìm thấy giáo viên nào khớp với tìm kiếm.</p>
        </div>
      )}

      <ImportTeacherModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
      />

      <EditTeacherModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher}
      />
    </div>
  );
}

function TeacherTableView({ 
  teachers, groups, selectedColumnGroups, onEdit, onDelete, selectedIds, onToggleSelect, onToggleSelectAll 
}: { 
  teachers: Teacher[], 
  groups: TeacherGroup[],
  selectedColumnGroups: string[],
  onEdit: (t: Teacher) => void, 
  onDelete: (t: Teacher) => void,
  selectedIds: string[],
  onToggleSelect: (id: string) => void,
  onToggleSelectAll: () => void
}) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const isAllSelected = teachers.length > 0 && selectedIds.length === teachers.length;
  
  const columnGroupsToDisplay = groups.filter(g => selectedColumnGroups.includes(g.id));

  const handleToggleGroup = async (teacher: Teacher, groupId: string, isCurrentlyInGroup: boolean) => {
    setUpdatingGroupId(`${teacher.id}-${groupId}`);
    try {
      if (isCurrentlyInGroup) {
        await removeTeacherFromGroupAction(teacher.id, groupId);
        toast.success(`Đã xóa khỏi nhóm thành công`);
      } else {
        await addTeacherToGroupAction(teacher.id, groupId);
        toast.success(`Đã gán vào nhóm thành công`);
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật nhóm');
    } finally {
      setUpdatingGroupId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-4 py-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-2 py-4 w-10 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest"></th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Họ và tên</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">CCCD / SĐT</th>
              
              {/* Render Dynamic Columns Headers */}
              {columnGroupsToDisplay.map(g => (
                <th key={g.id} className="px-4 py-4 text-center text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/50 border-l border-white">
                  {g.name}
                </th>
              ))}

              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {teachers.map((teacher) => {
              const departments = teacher.groups?.filter(g => g.category === 'department') || [];
              const others = teacher.groups?.filter(g => g.category !== 'department') || [];
              const isExpanded = expandedRow === teacher.id;

              return (
                <React.Fragment key={teacher.id}>
                  <tr className={cn("hover:bg-blue-50/30 transition-colors group cursor-pointer", isExpanded && "bg-blue-50/30", selectedIds.includes(teacher.id) && "bg-blue-50/10")} onClick={() => toggleExpand(teacher.id)}>
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(teacher.id)}
                        onChange={() => onToggleSelect(teacher.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-4 text-center">
                      <button className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-white">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {teacher.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{teacher.full_name}</p>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{teacher.position || 'Giáo viên'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600">
                        <p>{teacher.cccd || '---'}</p>
                        <p className="text-gray-400">{teacher.phone || '---'}</p>
                      </div>
                    </td>

                    {/* Render Dynamic Columns Checkboxes */}
                    {columnGroupsToDisplay.map(g => {
                      const isCurrentlyInGroup = teacher.groups?.some(tg => tg.id === g.id) || false;
                      const isUpdating = updatingGroupId === `${teacher.id}-${g.id}`;
                      
                      return (
                        <td key={g.id} className="px-4 py-4 text-center bg-blue-50/10 border-l border-white/50" onClick={(e) => e.stopPropagation()}>
                          {isUpdating ? (
                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin mx-auto" />
                          ) : (
                            <input 
                              type="checkbox" 
                              checked={isCurrentlyInGroup}
                              onChange={() => handleToggleGroup(teacher, g.id, isCurrentlyInGroup)}
                              className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          )}
                        </td>
                      );
                    })}

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => onEdit(teacher)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(teacher)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Content */}
                  {isExpanded && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={4 + columnGroupsToDisplay.length} className="p-6 border-b border-gray-100">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Info Column */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <User className="w-4 h-4" /> Thông tin chi tiết
                            </h4>
                            <InfoItem icon={<CreditCard className="w-4 h-4" />} label="CCCD" value={teacher.cccd || '---'} />
                            <InfoItem icon={<Phone className="w-4 h-4" />} label="SĐT" value={teacher.phone || '---'} />
                            <InfoItem icon={<Mail className="w-4 h-4" />} label="Email" value={teacher.email || '---'} />
                            <InfoItem icon={<MapPin className="w-4 h-4" />} label="Địa chỉ" value={teacher.address || '---'} />
                            {teacher.extra_info?.don_vi_cong_tac && (
                              <InfoItem icon={<School className="w-4 h-4" />} label="Đơn vị" value={teacher.extra_info.don_vi_cong_tac} />
                            )}
                          </div>

                          {/* Groups Column */}
                          <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <Briefcase className="w-4 h-4" /> Các nhóm đã tham gia
                              </h4>
                              <button 
                                onClick={() => onEdit(teacher)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                              >
                                <Edit className="w-3.5 h-3.5" /> Chỉnh sửa nhóm
                              </button>
                            </div>

                            <div className="bg-white p-4 rounded-2xl border border-gray-200">
                              {(!teacher.groups || teacher.groups.length === 0) ? (
                                <p className="text-sm text-gray-400 italic">Chưa được phân vào nhóm nào.</p>
                              ) : (
                                <div className="space-y-4">
                                  {departments.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Tổ chuyên môn</p>
                                      <div className="flex flex-wrap gap-2">
                                        {departments.map(g => (
                                          <span key={g.id} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5">
                                            {g.name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {others.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Đoàn thể / Nhóm tùy chọn</p>
                                      <div className="flex flex-wrap gap-2">
                                        {others.map(g => (
                                          <span key={g.id} className="px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                            {g.name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-gray-400">{icon}</div>
      <span className="text-gray-400 w-14 shrink-0">{label}:</span>
      <span className="text-gray-700 font-medium truncate">{value}</span>
    </div>
  );
}
