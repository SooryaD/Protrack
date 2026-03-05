import JsonModel from './JsonModel.js';
import bcrypt from 'bcryptjs';

class User extends JsonModel {
    static collectionName = 'users';

    constructor(data) {
        super(data);
    }

    // Instance method for password matching
    async matchPassword(enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password);
    }

    // Override save to handle password hashing
    async save() {
        // If password exists and is not already hashed (bcrypt hashes start with $2a$ or $2b$)
        if (this.password && !this.password.startsWith('$2')) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
        return super.save();
    }
}

// Fields added (optional — stored in db.json as-is):
//   rollNo      — Student roll number (unique per student)
//   mobile      — Student mobile number
//   department  — Staff department
//   otpHash     — SHA-256 of 6-digit OTP for password reset
//   otpExpires  — ISO timestamp for OTP expiry (10 min)

export default User;
