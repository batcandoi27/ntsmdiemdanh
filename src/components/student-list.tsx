'use client';

import { useState } from 'react';
import { Student, Class } from '@/types/models';
import { Modal } from '@/components/ui/modal';
import { StudentForm } from '@/components/student-form';
import { createStudent, updateStudent, deleteStudent } from '@/app/actions/student';
import { Plus, Pencil, Trash2, ArrowLeft, Search, User, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { useViewMode } from '@/context/view-mode-context';

interface StudentListProps {
    classInfo: Class;
    initialStudents: Student[];
}

export function StudentList({ classInfo, initialStudents }: StudentListProps) {
    const router = useRouter();
    const { viewDevice } = useViewMode();
    const [students, setStudents] = useState<Student[]>(initialStudents);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    // Filter logic
    const filteredStudents = initialStudents.filter(s =>
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = async (data: Student) => {
        const res = await createStudent(data);
        if (res.success) {
            setIsModalOpen(false);
            router.refresh();
        } else {
            alert(res.message);
        }
    };

    const handleUpdate = async (data: Student) => {
        const res = await updateStudent(data);
        if (res.success) {
            setIsModalOpen(false);
            setEditingStudent(null);
            router.refresh();
        } else {
            alert(res.message);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Xóa học sinh ${name}?`)) return;
        const res = await deleteStudent(id, classInfo.id);
        if (res.success) {
            router.refresh();
        } else {
            alert(res.message);
        }
    };

    const openCreateModal = () => {
        setEditingStudent(null);
        setIsModalOpen(true);
    };

    const openEditModal = (s: Student) => {
        setEditingStudent(s);
        setIsModalOpen(true);
    };



    // ... inside StudentList component ...

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <Breadcrumbs
                    items={[
                        { label: 'Quản Lý Lớp', href: '/classes' },
                        { label: `Lớp ${classInfo.name}`, href: `/classes/${classInfo.id}` },
                        { label: 'Danh Sách Học Sinh' }
                    ]}
                    className="mb-6"
                />

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/classes" className="p-2 bg-white rounded-lg shadow hover:bg-gray-100 text-gray-600">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Lớp {classInfo.name}</h1>
                        <p className="text-gray-500">GVCN: {classInfo.teacherName} • {filteredStudents.length} Học sinh</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm tên hoặc mã học sinh..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="w-full md:w-auto bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all"
                    >
                        <Plus size={20} />
                        Thêm Học Sinh
                    </button>
                </div>

                {/* Content: Mobile List vs Desktop Table */}
                {viewDevice === 'mobile' ? (
                    <div className="space-y-4">
                        {filteredStudents.map((s) => (
                            <div key={s.code} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{s.fullName}</h3>
                                        <div className="text-blue-600 font-mono text-sm font-medium">{s.code}</div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${s.gender === 'Nam' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                        {s.gender}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-3">
                                    <div>
                                        <span className="text-xs uppercase text-gray-400 block mb-0.5">Ngày sinh</span>
                                        {s.birthday}
                                    </div>
                                    <div>
                                        <span className="text-xs uppercase text-gray-400 block mb-0.5">Trạng thái</span>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold
                                            ${s.status === 'Đang học' ? 'bg-green-100 text-green-700' :
                                                s.status === 'Nghỉ học' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {s.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-3 border-t border-gray-50">
                                    <button
                                        onClick={() => openEditModal(s)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Pencil size={16} /> Sửa
                                    </button>
                                    <button
                                        onClick={() => handleDelete(s.code, s.fullName)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Trash2 size={16} /> Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredStudents.length === 0 && (
                            <div className="text-center py-12 text-gray-400 italic bg-white rounded-xl shadow-sm">
                                Không tìm thấy học sinh nào.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                                    <tr>
                                        <th className="px-6 py-4 w-20">STT</th>
                                        <th className="px-6 py-4">Mã HS</th>
                                        <th className="px-6 py-4">Họ và Tên</th>
                                        <th className="px-6 py-4">Ngày Sinh</th>
                                        <th className="px-6 py-4">Giới tính</th>
                                        <th className="px-6 py-4 text-center">Trạng thái</th>
                                        <th className="px-6 py-4 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.map((s) => (
                                        <tr key={s.code} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-500">{s.order}</td>
                                            <td className="px-6 py-4 text-blue-600 font-mono text-xs">{s.code}</td>
                                            <td className="px-6 py-4 font-semibold text-gray-800">{s.fullName}</td>
                                            <td className="px-6 py-4 text-gray-600">{s.birthday}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${s.gender === 'Nam' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                                    {s.gender}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                                                    ${s.status === 'Đang học' ? 'bg-green-100 text-green-700' :
                                                        s.status === 'Nghỉ học' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(s)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(s.code, s.fullName)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-gray-400 italic">
                                                Không tìm thấy học sinh nào.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingStudent ? `Cập Nhật TT Học Sinh` : `Thêm Học Sinh Mới vào ${classInfo.name}`}
            >
                <StudentForm
                    classId={classInfo.id}
                    initialData={editingStudent}
                    onSubmit={editingStudent ? handleUpdate : handleCreate}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
        </div>
    );
}
