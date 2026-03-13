import { pool } from './db.js';

async function patchOTP() {
    try {
        console.log('Connecting to database...');
        
        // Add OTP columns to users table
        await pool.query('ALTER TABLE users ADD COLUMN reset_otp VARCHAR(10) DEFAULT NULL');
        await pool.query('ALTER TABLE users ADD COLUMN reset_otp_expires DATETIME DEFAULT NULL');
        
        // Also update phone column in student_registry if needed, but phone is already VARCHAR(20) likely
        
        console.log('✅ Added reset_otp and reset_otp_expires columns to users table successfully.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ Columns already exist. Skipping.');
            process.exit(0);
        } else {
            console.error('❌ Error patching database:', err.message);
            process.exit(1);
        }
    }
}

patchOTP();
