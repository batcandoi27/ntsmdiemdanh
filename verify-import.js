
const { processImportedAttendance } = require('./src/app/actions/import-attendance');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Giả lập dữ liệu import cho ngày hôm nay
const today = new Date().toISOString().split('T')[0];
const testRecords = [
    {
        date: today,
        session: 'morning',
        classId: '0641fbbe-68e8-420a-b3c1-20f368a03a53',
        studentsToUpdate: [
            {
                studentId: '6A1_15', // Mã học sinh thực tế trong DB
                studentName: 'Test Student',
                status: 'absent',
                note: 'Vắng có phép - Test Import'
            }
        ]
    }
];

async function verifyImport() {
    console.log(`Starting test import for date: ${today}`);
    const result = await processImportedAttendance(testRecords);
    console.log('Import Result:', result);
}

verifyImport();
