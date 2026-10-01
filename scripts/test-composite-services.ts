import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { 
    createCompositeActivityWithChildren, 
    getCompositeActivitiesForClass, 
    addChildColumnToActivity,
    deleteColumn 
} from '../src/services/column-service';
import { 
    batchSaveMatrixRecords, 
    getRecordsForColumns 
} from '../src/services/record-service';
import { supabaseAdmin } from '../src/lib/supabase-admin';

async function run() {
    console.log('🧪 Starting Services End-to-End Test for Composite Activities...');
    const testClassId = 'TEST_CLS_' + Date.now();
    const testUserId = 'test_user_' + Date.now();
    const studentCode = 'HS_TEST_01';

    try {
        // 1. Create Composite Activity with 2 Sub-columns
        console.log('1. Testing createCompositeActivityWithChildren()...');
        const activity = await createCompositeActivityWithChildren(
            {
                classId: testClassId,
                userId: testUserId,
                name: 'Bảo hiểm tai nạn (Tự Nguyện)',
                scope: 'custom',
                frequency: 'one_time',
                allowFreeText: true,
                archived: false,
                order: 1,
                suggestions: [],
                applicableScope: 'all',
                activityConfig: {
                    type: 'composite',
                    activityCode: 'BHTN',
                    hasNotes: true,
                    allowDynamicChildren: true
                }
            },
            [
                {
                    name: 'Tham gia',
                    dataType: 'boolean',
                    inputMode: 'checkbox',
                    order: 1,
                    isNotesColumn: false
                },
                {
                    name: 'Ghi chú',
                    dataType: 'text',
                    inputMode: 'inline_text',
                    order: 2,
                    isNotesColumn: true
                }
            ]
        );

        console.log(`   ✅ Created Activity ID: ${activity.id}, Children count: ${activity.children?.length}`);
        if (!activity.children || activity.children.length !== 2) {
            throw new Error(`Expected 2 children, got ${activity.children?.length}`);
        }

        // 2. Fetch Composite Activities for Class
        console.log('2. Testing getCompositeActivitiesForClass()...');
        const activities = await getCompositeActivitiesForClass(testClassId);
        console.log(`   ✅ Fetched ${activities.length} activity tree(s) for class.`);
        if (activities.length !== 1 || activities[0].children?.length !== 2) {
            throw new Error('Activity tree fetch check failed');
        }

        // 3. Add dynamic child column
        console.log('3. Testing addChildColumnToActivity()...');
        const child3 = await addChildColumnToActivity(
            activity.id,
            {
                name: 'Đã nộp tiền',
                dataType: 'boolean',
                inputMode: 'checkbox',
                order: 3,
                isNotesColumn: false
            },
            testUserId
        );
        console.log(`   ✅ Added child column: ${child3.name} (ID: ${child3.id})`);

        // Check updated tree
        const updatedActivities = await getCompositeActivitiesForClass(testClassId);
        if (updatedActivities[0].children?.length !== 3) {
            throw new Error(`Expected 3 children after addition, got ${updatedActivities[0].children?.length}`);
        }
        console.log('   ✅ Tree now contains 3 children.');

        // 4. Batch Save Matrix Records
        console.log('4. Testing batchSaveMatrixRecords()...');
        const child1 = activity.children[0];
        const child2 = activity.children[1];

        const updates = [
            {
                columnId: child1.id,
                studentCode,
                classId: testClassId,
                value: true,
                session: 'morning' as const
            },
            {
                columnId: child2.id,
                studentCode,
                classId: testClassId,
                value: 'Đã chuyển khoản cô Lan 150k',
                session: 'morning' as const
            },
            {
                columnId: child3.id,
                studentCode,
                classId: testClassId,
                value: true,
                session: 'morning' as const
            }
        ];

        await batchSaveMatrixRecords(updates);
        console.log('   ✅ Batch saved 3 cell records.');

        // 5. Fetch Records for Columns
        console.log('5. Testing getRecordsForColumns()...');
        const allChildIds = updatedActivities[0].children!.map(c => c.id);
        const recordMap = await getRecordsForColumns(allChildIds);

        const studentRecs = recordMap[studentCode];
        if (!studentRecs) {
            throw new Error(`No records returned for student ${studentCode}`);
        }

        console.log(`   ✅ Retrieved records for student ${studentCode}:`);
        console.log(`     - child1 (${child1.name}):`, studentRecs[child1.id]?.value);
        console.log(`     - child2 (${child2.name}):`, studentRecs[child2.id]?.value);
        console.log(`     - child3 (${child3.name}):`, studentRecs[child3.id]?.value);

        if (studentRecs[child1.id]?.value !== true) {
            throw new Error('Child1 value mismatch');
        }
        if (studentRecs[child2.id]?.value !== 'Đã chuyển khoản cô Lan 150k') {
            throw new Error('Child2 value mismatch');
        }
        if (studentRecs[child3.id]?.value !== true) {
            throw new Error('Child3 value mismatch');
        }

        console.log('🎉 ALL SERVICE INTEGRATION CHECKS PASSED 100%!');
    } finally {
        // Cleanup
        console.log('🧹 Cleaning up test columns and records...');
        if (supabaseAdmin) {
            await supabaseAdmin.from('column_records').delete().eq('class_id', testClassId);
            await supabaseAdmin.from('columns').delete().eq('class_id', testClassId);
            console.log('✅ Cleanup finished successfully.');
        }
    }
}

run().catch(err => {
    console.error('❌ Service test failed:', err);
    process.exit(1);
});
