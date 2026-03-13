import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function patchTemplates() {
    try {
        console.log('Connecting to database...');
        
        // Ensure templates directory exists
        const templatesDir = path.join(__dirname, 'uploads', 'templates');
        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir, { recursive: true });
            console.log('Created uploads/templates directory.');
        }
        
        // Create templates table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                file_path VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await pool.query(createTableQuery);
        console.log('✅ Created templates table successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error patching database:', err.message);
        process.exit(1);
    }
}

patchTemplates();
