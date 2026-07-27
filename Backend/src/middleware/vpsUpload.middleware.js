import multer from 'multer';

// Keep uploaded files in memory buffer for Sharp processing
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
];

const fileFilter = (_req, file, cb) => {
    const mimeType = String(file.mimetype || '').toLowerCase();
    const originalName = String(file.originalname || '').toLowerCase();

    const isValidExtension = /\.(jpg|jpeg|png|webp)$/i.test(originalName);
    const isValidMime = ALLOWED_MIME_TYPES.includes(mimeType);

    if (isValidMime || isValidExtension) {
        cb(null, true);
    } else {
        const error = new Error('Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed.');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

export const uploadMiddleware = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter
});
