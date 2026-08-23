'use client';

import { useState, useEffect } from 'react';
import { Class } from '@/types/models';
import { Loader2 } from 'lucide-react';

interface ClassFormProps {
    initialData?: Class | null;
    onSubmit: (data: Class) => Promise<void>;
    onCancel: () => void;
}

export function ClassForm({ initialData, onSubmit, onCancel }: ClassFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Class>>({
        id: '',
        name: '',
        grade: 6,
        teacherName: '',
        classType: 'Normal',
        totalStudents: 0,
        femaleCount: 0,
        maleCount: 0
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'grade' || name === 'totalStudents' ? parseInt(value) || 0 : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.id || !formData.name) return;

        setIsLoading(true);
        try {
            await onSubmit(formData as Class);
        } catch (error) {
            console.error("Submit error", error);
            alert("Có lỗi xảy ra!");
        } finally {
            setIsLoading(false);
        }
    };

    const isEditMode = !!initialData;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Mã Lớp (ID) <span className="text-red-500">*</span></label>
                    <input
                        name="id"
                        value={formData.id}
                        onChange={handleChange}
                        disabled={isEditMode}
                        placeholder="VD: 6A1"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Tên Lớp <span className="text-red-500">*</span></label>
                    <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="VD: 6A1"
                        className="w-full px-3.5 py-2.5 bg-surface-card border border-border-default rounded-xl text-text-primary focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none shadow-xs font-semibold text-sm"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-text-primary">Khối</label>
                    <select
                        name="grade"
                        value={formData.grade}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-surface-card border border-border-default rounded-xl text-text-primary font-bold focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none shadow-xs cursor-pointer text-sm"
                    >
                        {[6, 7, 8, 9, 10, 11, 12].map(g => (
                            <option key={g} value={g} className="text-text-primary bg-surface-card font-bold">Khối {g}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-text-primary">GVCN</label>
                    <input
                        name="teacherName"
                        value={formData.teacherName}
                        onChange={handleChange}
                        placeholder="Nhập tên GVCN"
                        className="w-full px-3.5 py-2.5 bg-surface-card border border-border-default rounded-xl text-text-primary focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none shadow-xs font-semibold text-sm"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                    disabled={isLoading}
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold shadow-lg shadow-primary/30 flex items-center gap-2 disabled:opacity-70"
                    disabled={isLoading}
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isEditMode ? 'Cập Nhật' : 'Tạo Mới'}
                </button>
            </div>
        </form>
    );
}
