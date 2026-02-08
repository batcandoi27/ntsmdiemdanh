const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'In So Diem Ca Nhan_T9_2025-2026.xlsx');
const wb = XLSX.readFile(filePath);

console.log('=== SHEETS ===');
console.log(wb.SheetNames.join(', '));

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const ref = ws['!ref'] || 'A1';
  const range = XLSX.utils.decode_range(ref);
  console.log('\n=== Sheet: ' + name + ' (rows: ' + (range.e.r + 1) + ') ===');
  
  const data = XLSX.utils.sheet_to_json(ws, {header: 1});
  data.slice(0, 20).forEach((row, i) => {
    if (row.length > 0) {
      console.log((i+1) + ': ' + JSON.stringify(row.slice(0, 10)));
    }
  });
});
