import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load .env from the server directory, regardless of where the script is run from
dotenv.config({ path: path.join(__dirname, '.env') });


const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'protrack',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`MySQL Connected: ${connection.config.host}`);
        connection.release();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export { pool };
export default connectDB;
