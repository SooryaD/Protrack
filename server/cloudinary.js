import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Upload a file buffer to Cloudinary or fallback to local disk.
 * @param {Buffer} buffer - file buffer from multer memoryStorage
 * @param {object} options - cloudinary upload options (folder, resource_type, etc.)
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const isCloudinaryConfigured = 
            process.env.CLOUDINARY_CLOUD_NAME && 
            process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
            process.env.CLOUDINARY_API_KEY && 
            process.env.CLOUDINARY_API_KEY !== 'your_api_key';

        if (isCloudinaryConfigured) {
            const defaultOptions = {
                folder: 'protrack/uploads',
                resource_type: 'auto',
                ...options,
            };

            const uploadStream = cloudinary.uploader.upload_stream(
                defaultOptions,
                (error, result) => {
                    if (error) return reject(error);
                    resolve({ url: result.secure_url, public_id: result.public_id });
                }
            );

            uploadStream.end(buffer);
        } else {
            console.log('⚠️  Cloudinary is not configured. Saving file locally instead.');
            try {
                const uploadsDir = path.join(__dirname, 'uploads');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }

                // Make sure to preserve extension if possible (default to .pdf for abstract/review/report, .zip for code)
                let ext = '.pdf';
                if (options.public_id?.includes('code') || options.resource_type === 'raw') {
                    ext = '.zip';
                }
                const filename = `${options.public_id || `file_${Date.now()}`}${ext}`;
                const filePath = path.join(uploadsDir, filename);

                fs.writeFileSync(filePath, buffer);
                console.log(`💾 Saved file to local path: ${filePath}`);

                const url = `uploads/${filename}`;
                resolve({ url, public_id: filename });
            } catch (err) {
                reject(err);
            }
        }
    });
};

/**
 * Delete a file from Cloudinary by its public_id.
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
    try {
        const isCloudinaryConfigured = 
            process.env.CLOUDINARY_CLOUD_NAME && 
            process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';
            
        if (isCloudinaryConfigured) {
            await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        } else {
            const uploadsDir = path.join(__dirname, 'uploads');
            const filePath = path.join(uploadsDir, publicId);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Deleted local file: ${filePath}`);
            }
        }
    } catch (err) {
        console.error('File delete error:', err.message);
    }
};

export default cloudinary;
