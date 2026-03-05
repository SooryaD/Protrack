
import dotenv from 'dotenv';
import User from './models/User.js';
import connectDB from './db.js';

dotenv.config();
connectDB();

const importData = async () => {
    try {
        await User.deleteMany(); // CAUTION: Clears Users

        const adminUser = {
            name: 'System Admin',
            email: 'admin@college.edu',
            password: 'admin', // Will be hashed by pre-save hook
            role: 'admin',
            isActive: true
        };

        await User.create(adminUser);

        console.log('Data Imported! Admin Created: admin@college.edu / admin');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

importData();
