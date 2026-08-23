'use client';

import { useState, useEffect } from 'react';
import { Student } from '@/types/models';
import { Loader2 } from 'lucide-react';

interface StudentFormProps {
    classId: string;
    initialData?: Student | null;
    onSubmit: (data: Student) => Promise<void>;
    onCancel: () => void;
}

export function StudentForm({ classId, initialData, onSubmit, onCancel }: StudentFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Generate default STT/Code if creating new not trivial without knowing last STT.
    // User must input STT or we auto-generate? 
    // Let's require user input STT for simplicity, code auto-gen.

    const [formData, setFormData] = useState<Partial<Student>>({
        classId: classId,
        order: 0,
        code: '',
        fullName: '',
        firstName: '',
        lastName: '',
        gender: 'Nam',
        birthday: '',
        status: 'Đang học',
        statusDate: new Date().toISOString().slice(0, 10), // Mặc định ngày hôm nay
        ethnicity: 'Kinh',
        govId: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData(prev => ({ ...prev, classId: classId }));
        }
    }, [initialData, classId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        let newValue: any = value;
        if (name === 'order') newValue = parseInt(value) || 0;

        setFormData(prev => {
            const updated = { ...prev, [name]: newValue };

            // Auto-gen Code if not editing and STT changes
            if (!initialData && name === 'order') {
                updated.code = `${classId}_${newValue}`;
            }
            // Auto Update First Name
            if (name === 'fullName') {
                updated.firstName = value; // Simplistic
            }

            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.fullName) return;

        setIsLoading(true);
        try {
            await onSubmit(formData as Student);
        } catch (error) {
            console.error(error);
            alert('Lỗi!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">STT</label>
                    <input
                        type="number"
                        name="order"
                        value={formData.order}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Mã Học Sinh (Auto)</label>
                    <input
                        name="code"
                        value={formData.code}
                        readOnly
                        className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Họ và Tên</label>
                <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Ngày sinh</label>
                    <input
                        name="birthday"
                        value={formData.birthday}
                        onChange={handleChange}
                        placeholder="dd/mm/yyyy"
                        className="w-full px-3.5 py-2.5 bg-surface-card border border-border-default rounded-xl text-text-primary focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none shadow-xs font-medium text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-text-primary">Giới tính</label>
                    <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-surface-card border border-border-default rounded-xl text-text-primary font-bold focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none shadow-xs cursor-pointer text-sm"
                    >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-text-primary">Mã Định Danh</label>
                    <input
                        name="govId"
                        value={formData.govId}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-surface-card border border-border-default rounded-xl text-text-primary focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none shadow-xs font-medium text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-text-primary">Trạng thái</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-surface-card border border-border-default rounded-xl text-text-primary font-bold focus:ring-4 focus:ring-sky-500/15 focus:border-border-focus outline-none shadow-xs cursor-pointer text-sm"
                    >
                        <option value="Đang học">Đang học</option>
                        <option value="Nghỉ học">Nghỉ học</option>
                        <option value="Chuyển trường">Chuyển trường</option>
                    </select>
                </div>
            </div>

            {(formData.status === 'Nghỉ học' || formData.status === 'Chuyển trường') && (
                <div className="space-y-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                    <label className="text-xs sm:text-sm font-bold text-danger">Ngày bắt đầu nghỉ học <span className="text-danger">*</span></label>
                    <input
                        type="date"
                        name="statusDate"
                        value={formData.statusDate ? formData.statusDate.slice(0, 10) : ''}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 bg-surface-card border border-rose-300 rounded-xl text-danger font-bold focus:ring-4 focus:ring-rose-500/15 outline-none shadow-xs text-sm"
                        required
                    />
                    <p className="text-xs text-danger font-medium mt-1">Thông tin này rất quan trọng để hệ thống lọc báo cáo chính xác.</p>
                </div>
            )}

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
                    {initialData ? 'Cập Nhật' : 'Thêm Mới'}
                </button>
            </div>
        </form>
    );
}
