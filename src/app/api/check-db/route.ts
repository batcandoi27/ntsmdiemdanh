import { NextResponse } from 'next/server';
import { db } from '@/services/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const classes = await db.getClasses();
        // Count students? No direct method in adapter to count all. 
        // Let's verify via checking one class if possible or just adapter implementation? 
        // We can't easily count ALL students without a new adapter method.
        // Let's add a quick hack to check students of the first class.
        let studentSampleCount = 0;
        let sampleClass = '';
        if (classes.length > 0) {
            const students = await db.getStudentsByClass(classes[0].id);
            studentSampleCount = students.length;
            sampleClass = classes[0].id;
        }

        return NextResponse.json({
            status: 'ok',
            backend: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Firebase Online' : 'Local Offline',
            classCount: classes.length,
            sample: {
                classId: sampleClass,
                studentCount: studentSampleCount
            },
            data: classes
        });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
