import { getAllTeachers, getAllGroups } from '@/services/teacher-service';
import TeacherList from '@/components/teachers/teacher-list';
import TeacherManagementHeader from '@/components/teachers/header';
import { Suspense } from 'react';

export default async function TeachersPage() {
  const teachers = await getAllTeachers();
  const groups = await getAllGroups();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TeacherManagementHeader totalCount={teachers.length} />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-8">
        <Suspense fallback={<div className="text-center py-20 font-medium text-gray-500">Đang tải danh sách giáo viên...</div>}>
          <TeacherList teachers={teachers} groups={groups} />
        </Suspense>
      </div>
    </div>
  );
}
