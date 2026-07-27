import express from 'express';
import { uploadMiddleware } from '../../../middleware/vpsUpload.middleware.js';
import { uploadImageController, deleteImageController } from '../controllers/vpsUpload.controller.js';
import { processAndSaveImage } from '../../../utils/sharp.util.js';

const router = express.Router();

// POST /api/v1/uploads/image - Upload single image (validated 5MB, sharp converted to webp)
router.post('/image', uploadMiddleware.single('file'), uploadImageController);

// DELETE /api/v1/uploads/image - Delete image from local VPS storage
router.delete('/image', deleteImageController);

export default router;
