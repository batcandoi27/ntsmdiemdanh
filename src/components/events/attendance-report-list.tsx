'use client';

import { useState } from 'react';
import { TeacherAttendance, TeacherAttendanceStatus } from '@/types/teacher';
import { User, CheckCircle2, XCircle, Clock, Plane, CalendarOff, AlertCircle, Search, Share2 } from 'lucide-react';
import { markAttendanceAction } from '@/app/actions/event-actions';
import { useAuth } from '@/context/auth-context';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { TeacherAttendanceReportModal } from './teacher-report-modal';

interface AttendanceReportListProps {
  initialData: TeacherAttendance[];
  eventId: string;
  date: string;
  event: {
    title: string;
    start_time: string;
  };
  manageableTeacherIds?: string[]; // Danh sách ID giáo viên mà người dùng hiện tại có quyền duyệt
}

const STATUS_CONFIG: Record<TeacherAttendanceStatus, { label: string; icon: any; color: string; bgColor: string }> = {
  present: { label: 'Có mặt', icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  absent: { label: 'Vắng', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  on_duty: { label: 'Công tác', icon: Plane, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  substitute: { label: 'Họp thay', icon: Clock, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  leave: { label: 'Nghỉ chế độ', icon: CalendarOff, color: 'text-amber-600', bgColor: 'bg-amber-50' },
};

export default function AttendanceReportList({ 
  initialData, 
  eventId, 
  date, 
  event,
  manageableTeacherIds = [] 
}: AttendanceReportListProps) {
  const { appUser } = useAuth();
  const [data, setData] = useState(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const filteredData = data.filter(item => 
    item.teacher?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = async (teacherId: string, newStatus: TeacherAttendanceStatus) => {
    if (!appUser?.uid) {
      toast.error('Vui lòng đăng nhập để thực hiện thao tác này.');
      return;
    }

    setUpdatingId(teacherId);
    try {
      const success = await markAttendanceAction(appUser.uid, teacherId, eventId, newStatus);
      if (success) {
        setData(prev => prev.map(item => 
          item.teacher_id === teacherId ? { ...item, status: newStatus } : item
        ));
        toast.success(`Đã cập nhật trạng thái: ${STATUS_CONFIG[newStatus].label}`);
      } else {
        toast.error('Không thể cập nhật trạng thái.');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống khi cập nhật.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Search Bar & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Tìm tên giáo viên..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => setIsReportModalOpen(true)}
          className="w-full md:w-auto px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          BÁO CÁO NHANH
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredData.map((item) => {
          const config = STATUS_CONFIG[item.status];
          const Icon = config.icon;
          const isUpdating = updatingId === item.teacher_id;
          const isUnverified = item.status === 'present' && !item.is_verified;
          
          // Kiểm tra quyền duyệt cho từng dòng
          const canManageThisTeacher = manageableTeacherIds.length === 0 || manageableTeacherIds.includes(item.teacher_id);

          return (
            <div 
              key={item.teacher_id}
              className={cn(
                "bg-white rounded-3xl p-5 border-2 transition-all flex flex-col justify-between group",
                isUnverified ? "border-amber-300 bg-amber-50/20" : 
                item.status === 'present' ? "border-emerald-100" : "border-transparent shadow-sm hover:border-gray-200"
              )}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                  isUnverified ? "bg-amber-500 text-white" : config.bgColor, config.color
                )}>
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-800 truncate">{item.teacher?.full_name}</h4>
                    {isUnverified && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded-md animate-pulse">Chờ duyệt</span>
                    )}
                  </div>
                  <div className={cn("flex items-center gap-1 text-[10px] font-black uppercase tracking-widest mt-0.5", isUnverified ? "text-amber-600" : config.color)}>
                    <Icon className="w-3 h-3" />
                    {isUnverified ? "Yêu cầu xác nhận" : config.label}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(STATUS_CONFIG) as TeacherAttendanceStatus[]).map((status) => {
                  const sBtnConfig = STATUS_CONFIG[status];
                  const SIcon = sBtnConfig.icon;
                  const isActive = item.status === status && !isUnverified;
                  const isPendingStatus = isUnverified && status === 'present';

                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(item.teacher_id, status)}
                      disabled={isUpdating || !canManageThisTeacher}
                      title={sBtnConfig.label}
                      className={cn(
                        "h-10 rounded-xl flex items-center justify-center transition-all border-2",
                        !canManageThisTeacher ? "opacity-20 cursor-not-allowed grayscale" : "",
                        isActive 
                          ? `${sBtnConfig.bgColor} ${sBtnConfig.color} border-current shadow-sm` 
                          : isPendingStatus
                          ? "bg-amber-100 text-amber-600 border-amber-300 animate-pulse"
                          : "bg-surface-section text-text-tertiary border-border-subtle hover:bg-surface-hover hover:text-text-primary"
                      )}
                    >
                      <SIcon className={cn("w-5 h-5", isUpdating && "animate-pulse")} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-20 bg-surface-section rounded-[32px] border-2 border-dashed border-border-default">
           <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
           <p className="text-text-secondary font-bold">Không tìm thấy giáo viên nào.</p>
        </div>
      )}

      <TeacherAttendanceReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        event={event}
        attendance={data}
      />
    </div>
  );
}
