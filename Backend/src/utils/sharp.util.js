import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { STORAGE_BASE_DIR, STORAGE_CATEGORIES, IMAGE_DIMENSIONS, getAppBaseUrl, ensureStorageDirectories } from '../config/storage.config.js';

/**
 * Process image buffer with Sharp: resize, compress, and convert to WebP.
 * Save file to: /var/storage/<category>/<YYYY>/<MM>/<uuid>.webp
 * 
 * @param {Buffer} buffer - Raw file buffer from Multer
 * @param {string} category - Category ('menu', 'restaurants', 'users', 'banners', 'logos')
 * @param {object} [req] - Express request object to resolve host dynamically
 * @returns {Promise<{ relativePath: string, fullUrl: string, fileName: string }>}
 */
export const processAndSaveImage = async (buffer, category = STORAGE_CATEGORIES.RESTAURANTS, req = null) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error('Valid image buffer is required');
    }

    const normalizedCategory = String(category || '').toLowerCase().trim();
    let targetCategory = STORAGE_CATEGORIES.RESTAURANTS;

    if (normalizedCategory.includes('menu') || normalizedCategory.includes('food') || normalizedCategory.includes('dish') || normalizedCategory.includes('item')) {
        targetCategory = STORAGE_CATEGORIES.MENU;
    } else if (normalizedCategory.includes('banner')) {
        targetCategory = STORAGE_CATEGORIES.BANNERS;
    } else if (normalizedCategory.includes('logo') || normalizedCategory.includes('icon')) {
        targetCategory = STORAGE_CATEGORIES.LOGOS;
    } else if (normalizedCategory.includes('user') || normalizedCategory.includes('avatar') || normalizedCategory.includes('profile')) {
        targetCategory = STORAGE_CATEGORIES.USERS;
    } else if (Object.values(STORAGE_CATEGORIES).includes(normalizedCategory)) {
        targetCategory = normalizedCategory;
    }

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Folder structure: /var/storage/<category>/YYYY/MM
    const directoryPath = path.join(STORAGE_BASE_DIR, targetCategory, year, month);
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }

    const uniqueId = uuidv4();
    const fileName = `${uniqueId}.webp`;
    const fullFilePath = path.join(directoryPath, fileName);

    // Dynamic sharp sizing according to category rules
    const dimensionConfig = IMAGE_DIMENSIONS[targetCategory] || IMAGE_DIMENSIONS[STORAGE_CATEGORIES.RESTAURANTS];

    await sharp(buffer)
        .resize({
            width: dimensionConfig.width,
            height: dimensionConfig.height,
            fit: dimensionConfig.fit || 'inside',
            withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toFile(fullFilePath);

    // Format: /images/menu/2026/06/filename.webp
    const relativeUrlPath = `/images/${targetCategory}/${year}/${month}/${fileName}`;
    const baseUrl = getAppBaseUrl(req);
    const fullUrl = `${baseUrl.replace(/\/$/, '')}${relativeUrlPath}`;

    return {
        relativePath: relativeUrlPath,
        fullUrl,
        fileName
    };
};

/**
 * Utility to delete local image file from VPS storage given relative path or full URL.
 * 
 * @param {string} imagePathOrUrl 
 * @returns {Promise<boolean>}
 */
export const deleteLocalImage = async (imagePathOrUrl) => {
    if (!imagePathOrUrl || typeof imagePathOrUrl !== 'string') return false;

    try {
        let relativePath = imagePathOrUrl;
        if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {
            const urlObj = new URL(imagePathOrUrl);
            relativePath = urlObj.pathname;
        }

        // Clean leading '/images'
        if (relativePath.startsWith('/images/')) {
            relativePath = relativePath.replace('/images/', '');
        }

        const absolutePath = path.join(STORAGE_BASE_DIR, relativePath);
        if (fs.existsSync(absolutePath)) {
            await fs.promises.unlink(absolutePath);
            return true;
        }
        return false;
    } catch (err) {
        console.error(`Failed to delete image (${imagePathOrUrl}):`, err.message);
        return false;
    }
};
