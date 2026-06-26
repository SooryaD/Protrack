import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const XLSX = await import('xlsx');
const wb = XLSX.read(readFileSync(path.join(__dirname, '../Student_RollNo_Name_List.xlsx')));
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log(JSON.stringify(data, null, 2));
