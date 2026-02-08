
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'c:\\AI APP\\app-diemdanh\\In So Diem Ca Nhan_T9_2025-2026.xlsx';

function analyze() {
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    console.log('Reading file...');
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });

    console.log('Sheets:', wb.SheetNames);

    if (wb.SheetNames.includes('CSDL')) {
        const sheet = wb.Sheets['CSDL'];
        // Convert to JSON with NO header assumption first to see raw data
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`Sheet 'CSDL' total rows: ${raw.length}`);

        // Print first 5 rows to identify Header row
        console.log('--- First 5 Rows ---');
        raw.slice(0, 5).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });

        // Test logic current: range 1 (Row index 1 = Row 2 in Excel)
        const currentLogicData = XLSX.utils.sheet_to_json(sheet, { range: 1 });
        console.log(`Parsed with current logic (range: 1): ${currentLogicData.length} records`);
        if (currentLogicData.length > 0) {
            console.log('Sample Record keys:', Object.keys(currentLogicData[0]));
        }
    } else {
        console.error('Sheet CSDL missing!');
    }

    if (wb.SheetNames.includes('Thong ke')) {
        const sheet = wb.Sheets['Thong ke'];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`Sheet 'Thong ke' total rows: ${raw.length}`);
        console.log('--- First 5 Rows ---');
        raw.slice(0, 5).forEach((row, i) => console.log(`Row ${i}:`, JSON.stringify(row)));
    }
}

analyze();
