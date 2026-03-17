import { db } from '@/services/db';
import { ClassList } from '@/components/class-list';

export const dynamic = 'force-dynamic'; // Ensure no caching for latest data

export default async function ClassesPage() {
    const classes = await db.getClasses();

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <ClassList initialClasses={classes} />
            </div>
        </div>
    );
}
