import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../src/config/env.js';
import { STORAGE_BASE_DIR, STORAGE_CATEGORIES, APP_BASE_URL, ensureStorageDirectories } from '../src/config/storage.config.js';

// Ensure VPS target storage folders exist
ensureStorageDirectories();

const UPLOADS_DIR = path.resolve('c:/Users/MAYAN/Appzeto Projects/Zapoo/Backend/uploads');
const METADATA_FILE = path.join(UPLOADS_DIR, 'cloudinary_metadata.json');

/**
 * Category router based on URL pattern or collection field name.
 */
function determineCategoryFromUrlOrField(url, fieldName = '') {
    const lowerUrl = String(url || '').toLowerCase();
    const lowerField = String(fieldName || '').toLowerCase();

    if (lowerUrl.includes('menu') || lowerField.includes('menu') || lowerField.includes('item')) {
        return STORAGE_CATEGORIES.MENU;
    }
    if (lowerUrl.includes('user') || lowerUrl.includes('avatar') || lowerField.includes('user') || lowerField.includes('profile')) {
        return STORAGE_CATEGORIES.USERS;
    }
    if (lowerUrl.includes('banner') || lowerField.includes('banner') || lowerUrl.includes('intro')) {
        return STORAGE_CATEGORIES.BANNERS;
    }
    if (lowerUrl.includes('logo') || lowerField.includes('logo')) {
        return STORAGE_CATEGORIES.LOGOS;
    }
    return STORAGE_CATEGORIES.RESTAURANTS;
}

/**
 * Process a downloaded local file, resize/convert to WebP, and write to VPS folder.
 */
async function convertAndMoveToVPSStorage(sourceFilePath, category) {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const destDir = path.join(STORAGE_BASE_DIR, category, year, month);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const uniqueId = uuidv4();
    const fileName = `${uniqueId}.webp`;
    const destFilePath = path.join(destDir, fileName);

    await sharp(sourceFilePath)
        .resize({ width: 1200, height: 800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(destFilePath);

    const relativeUrl = `/images/${category}/${year}/${month}/${fileName}`;
    const newUrl = `${APP_BASE_URL.replace(/\/$/, '')}${relativeUrl}`;
    return newUrl;
}

async function migrateDatabase() {
    console.log('🚀 Starting Cloudinary to VPS Image Database Migration Script...');
    console.log(`MongoDB URI: ${config.mongodbUri}`);

    await mongoose.connect(config.mongodbUri);
    console.log('✅ Connected to MongoDB.');

    // 1. Build lookup index for local downloaded files by Cloudinary public_id and secure_url
    let metadataList = [];
    if (fs.existsSync(METADATA_FILE)) {
        metadataList = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    }

    const urlToFileMap = new Map();
    metadataList.forEach((item) => {
        const publicId = item.public_id;
        const format = item.format ? `.${item.format}` : '';
        let relPath = publicId;
        if (format && !relPath.toLowerCase().endsWith(format.toLowerCase())) {
            relPath += format;
        }

        const localPath = path.join(UPLOADS_DIR, relPath);
        if (fs.existsSync(localPath)) {
            if (item.secure_url) urlToFileMap.set(item.secure_url, localPath);
            if (item.url) urlToFileMap.set(item.url, localPath);
        }
    });

    console.log(`Mapped ${urlToFileMap.size} Cloudinary URLs to local downloaded assets.`);

    const collections = await mongoose.connection.db.listCollections().toArray();
    let totalUpdatedDocs = 0;

    for (const colInfo of collections) {
        const collectionName = colInfo.name;
        if (collectionName.startsWith('system.')) continue;

        const collection = mongoose.connection.db.collection(collectionName);
        const docs = await collection.find({}).toArray();

        for (const doc of docs) {
            let docModified = false;

            const updateFields = {};

            const checkAndMigrateField = async (val, fieldPath) => {
                if (typeof val === 'string' && val.includes('res.cloudinary.com')) {
                    let sourcePath = urlToFileMap.get(val);

                    // Fallback search in downloads folder if exact URL match missing
                    if (!sourcePath) {
                        const parts = val.split('/');
                        const fileNameWithExt = parts[parts.length - 1];
                        // check matching files inside UPLOADS_DIR recursively
                        sourcePath = findFileRecursively(UPLOADS_DIR, fileNameWithExt);
                    }

                    if (sourcePath && fs.existsSync(sourcePath)) {
                        const category = determineCategoryFromUrlOrField(val, fieldPath);
                        const newVpsUrl = await convertAndMoveToVPSStorage(sourcePath, category);
                        updateFields[fieldPath] = newVpsUrl;
                        docModified = true;
                    }
                }
            };

            // Inspect document fields recursively
            for (const [key, val] of Object.entries(doc)) {
                if (key === '_id') continue;
                if (typeof val === 'string') {
                    await checkAndMigrateField(val, key);
                } else if (Array.isArray(val)) {
                    for (let i = 0; i < val.length; i++) {
                        if (typeof val[i] === 'string') {
                            await checkAndMigrateField(val[i], `${key}.${i}`);
                        } else if (typeof val[i] === 'object' && val[i] !== null) {
                            for (const [subKey, subVal] of Object.entries(val[i])) {
                                if (typeof subVal === 'string') {
                                    await checkAndMigrateField(subVal, `${key}.${i}.${subKey}`);
                                }
                            }
                        }
                    }
                } else if (typeof val === 'object' && val !== null) {
                    for (const [subKey, subVal] of Object.entries(val)) {
                        if (typeof subVal === 'string') {
                            await checkAndMigrateField(subVal, `${key}.${subKey}`);
                        }
                    }
                }
            }

            if (docModified) {
                await collection.updateOne({ _id: doc._id }, { $set: updateFields });
                totalUpdatedDocs++;
            }
        }
    }

    console.log(`\n🎉 Migration Complete! Total MongoDB documents updated to VPS URLs: ${totalUpdatedDocs}`);
    await mongoose.disconnect();
    process.exit(0);
}

function findFileRecursively(dir, fileName) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            const found = findFileRecursively(fullPath, fileName);
            if (found) return found;
        } else if (f.toLowerCase() === fileName.toLowerCase()) {
            return fullPath;
        }
    }
    return null;
}

migrateDatabase().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
