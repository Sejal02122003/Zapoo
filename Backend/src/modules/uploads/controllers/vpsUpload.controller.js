import { processAndSaveImage, deleteLocalImage } from '../../../utils/sharp.util.js';
import { STORAGE_CATEGORIES } from '../../../config/storage.config.js';

/**
 * Controller to handle single image upload to VPS storage.
 * Request Body parameter 'category' can specify destination folder ('menu', 'restaurants', 'users', 'banners', 'logos').
 */
export const uploadImageController = async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const category = req.body?.category || req.query?.category || req.body?.folder || req.query?.folder || STORAGE_CATEGORIES.RESTAURANTS;
        const result = await processAndSaveImage(req.file.buffer, category, req);

        return res.status(200).json({
            success: true,
            message: 'Image processed and saved to VPS storage successfully',
            data: {
                url: result.fullUrl,
                relativePath: result.relativePath,
                fileName: result.fileName
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Controller to delete image from VPS storage.
 */
export const deleteImageController = async (req, res, next) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'Image URL is required'
            });
        }

        const deleted = await deleteLocalImage(url);
        return res.status(200).json({
            success: deleted,
            message: deleted ? 'Image deleted successfully' : 'Image not found or already deleted'
        });
    } catch (error) {
        next(error);
    }
};
