const XLSX = require('xlsx');
const fs = require('fs');

const filePath = process.argv[2];

if (!filePath || !fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
}

const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('--- EXCEL ANALYSIS ---');
console.log('Sheets:', wb.SheetNames);

const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log(`Sheet: "${sheetName}" | Total Rows: ${raw.length}`);
console.log('--- First 3 Rows ---');
raw.slice(0, 3).forEach((row, i) => {
    console.log(`Row ${i}:`, JSON.stringify(row));
});
