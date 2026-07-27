import fs from 'fs';
import path from 'path';

// Base directory configuration (supports VPS /var/storage as well as local fallback)
export const STORAGE_BASE_DIR = process.env.VPS_STORAGE_PATH || (
    process.platform === 'win32' 
        ? path.resolve('c:/var/storage') 
        : '/var/storage'
);

export const APP_BASE_URL = process.env.APP_BASE_URL || 'https://api.domain.com';

// Subfolder categorization mapping
export const STORAGE_CATEGORIES = {
    MENU: 'menu',
    RESTAURANTS: 'restaurants',
    USERS: 'users',
    BANNERS: 'banners',
    LOGOS: 'logos'
};

// Resizing dimensions per category
export const IMAGE_DIMENSIONS = {
    [STORAGE_CATEGORIES.MENU]: { width: 800, height: 800, fit: 'inside' },
    [STORAGE_CATEGORIES.RESTAURANTS]: { width: 1200, height: 800, fit: 'inside' },
    [STORAGE_CATEGORIES.USERS]: { width: 400, height: 400, fit: 'cover' },
    [STORAGE_CATEGORIES.BANNERS]: { width: 1920, height: 600, fit: 'cover' },
    [STORAGE_CATEGORIES.LOGOS]: { width: 400, height: 400, fit: 'contain' }
};

/**
 * Ensures all required VPS storage folders exist recursively on boot / request.
 */
export const ensureStorageDirectories = () => {
    Object.values(STORAGE_CATEGORIES).forEach((category) => {
        const categoryPath = path.join(STORAGE_BASE_DIR, category);
        if (!fs.existsSync(categoryPath)) {
            fs.mkdirSync(categoryPath, { recursive: true });
        }
    });
};
