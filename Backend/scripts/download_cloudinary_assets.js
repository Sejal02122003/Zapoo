import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: "dlttlwzlm",
    api_key: "381417573627185",
    api_secret: "d44IgZkvbxfU9fZ_I2idx9_Kc7Y"
});

const BACKEND_ROOT = path.resolve('c:/Users/MAYAN/Appzeto Projects/Zapoo/Backend');
const UPLOADS_DIR = path.join(BACKEND_ROOT, 'uploads');
const METADATA_FILE = path.join(UPLOADS_DIR, 'cloudinary_metadata.json');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to download ${url}: Status code ${res.statusCode}`));
            }
            const fileStream = fs.createWriteStream(destPath);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close(resolve);
            });
            fileStream.on('error', (err) => {
                fs.unlink(destPath, () => reject(err));
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function fetchAllResources(resourceType) {
    let resources = [];
    let nextCursor = null;
    do {
        const options = {
            resource_type: resourceType,
            max_results: 500
        };
        if (nextCursor) {
            options.next_cursor = nextCursor;
        }
        const result = await cloudinary.api.resources(options);
        if (result.resources && result.resources.length > 0) {
            resources.push(...result.resources);
        }
        nextCursor = result.next_cursor;
    } while (nextCursor);

    return resources;
}

async function main() {
    console.log('Starting Cloudinary parallel download process...');

    let allResources = [];
    if (fs.existsSync(METADATA_FILE)) {
        console.log('Loading metadata from existing metadata file...');
        allResources = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    } else {
        const imageResources = await fetchAllResources('image');
        const videoResources = await fetchAllResources('video');
        const rawResources = await fetchAllResources('raw');

        allResources = [
            ...imageResources.map(r => ({ ...r, fetched_type: 'image' })),
            ...videoResources.map(r => ({ ...r, fetched_type: 'video' })),
            ...rawResources.map(r => ({ ...r, fetched_type: 'raw' }))
        ];
        fs.writeFileSync(METADATA_FILE, JSON.stringify(allResources, null, 2), 'utf-8');
    }

    console.log(`Total resources: ${allResources.length}`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    const CONCURRENCY = 20;

    async function processResource(res, index) {
        const publicId = res.public_id;
        const format = res.format ? `.${res.format}` : '';
        const secureUrl = res.secure_url;

        let relativeFilePath = publicId;
        if (format && !relativeFilePath.toLowerCase().endsWith(format.toLowerCase())) {
            relativeFilePath += format;
        }

        const localFilePath = path.join(UPLOADS_DIR, relativeFilePath);

        if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 0) {
            skipCount++;
            return;
        }

        try {
            await downloadFile(secureUrl, localFilePath);
            successCount++;
        } catch (err) {
            console.error(`ERROR downloading ${publicId}:`, err.message);
            failCount++;
        }
    }

    // Run pool of promises
    const pool = [];
    for (let i = 0; i < allResources.length; i++) {
        const p = processResource(allResources[i], i).then(() => {
            pool.splice(pool.indexOf(p), 1);
        });
        pool.push(p);
        if (pool.length >= CONCURRENCY) {
            await Promise.race(pool);
        }
        if ((i + 1) % 100 === 0 || i === allResources.length - 1) {
            console.log(`Progress: ${i + 1}/${allResources.length} processed (Downloaded: ${successCount}, Skipped: ${skipCount}, Failed: ${failCount})`);
        }
    }
    await Promise.all(pool);

    console.log('\n========================================');
    console.log(`Download completed!`);
    console.log(`Total: ${allResources.length}`);
    console.log(`Downloaded: ${successCount}`);
    console.log(`Skipped existing: ${skipCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Metadata exported to: ${METADATA_FILE}`);
    console.log('========================================');
}

main().catch(err => {
    console.error('Fatal error in script:', err);
    process.exit(1);
});
