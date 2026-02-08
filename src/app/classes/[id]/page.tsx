import { db } from '@/services/db';
import { StudentList } from '@/components/student-list';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: {
        id: string;
    }
}

export default async function ClassDetailPage({ params }: PageProps) {
    const classInfo = await db.getClass(params.id);
    if (!classInfo) {
        return notFound();
    }

    const students = await db.getStudentsByClass(params.id);

    return <StudentList classInfo={classInfo} initialStudents={students} />;
}
