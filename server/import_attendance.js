/**
 * import_attendance.js
 * 
 * Reads students from the Excel file (Student_RollNo_Name_List.xlsx)
 * and populates the MySQL student_registry table.
 * 
 * This REPLACES all existing student_registry entries with the real student list.
 * Phone check is removed — roll number alone is used for verification.
 * 
 * Usage: node import_attendance.js
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB, { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await connectDB();

try {
    // ── 1. Read Excel file ─────────────────────────────────────────
    const XLSX = await import('xlsx');
    const excelPath = path.join(__dirname, '../Student_RollNo_Name_List.xlsx');
    const wb = XLSX.read(readFileSync(excelPath));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Skip header row, extract Roll No and Name
    const students = rows
        .slice(1)  // skip the header row ["S.No", "Roll Number", "Student Name"]
        .filter(row => row[1] && row[2])  // must have both Roll No and Name
        .map(row => ({
            rollNo: String(row[1]).trim().toUpperCase(),
            name:   String(row[2]).trim(),
        }));

    console.log(`📋 Found ${students.length} students in the Excel file.`);

    // ── 2. Clear existing student_registry (dummy data) ────────────
    // Also clear any student user accounts that were dummy
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE student_registry');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🗑️  Cleared existing student_registry table.');

    // ── 3. Insert real students ─────────────────────────────────────
    let inserted = 0;
    for (const s of students) {
        await pool.query(
            'INSERT INTO student_registry (roll_no, name, registered) VALUES (?, ?, ?)',
            [s.rollNo, s.name, false]
        );
        inserted++;
    }

    console.log(`✅ Successfully inserted ${inserted} students into student_registry.`);
    console.log('\n📌 Students can now register at /signup using their Roll Number only.');
    console.log('   Example: Roll No = 2435MCA0049 (ABINASHA A)');
    console.log('\n🎉 Import complete!');

    process.exit(0);
} catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
}
