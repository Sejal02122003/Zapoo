import express from 'express';
import path from 'path';
import { STORAGE_BASE_DIR, ensureStorageDirectories } from './storage.config.js';

// Boot check to ensure /var/storage directories exist
ensureStorageDirectories();

/**
 * Configure Express static serving for /images route.
 * In development or non-Nginx setup, this allows Express to directly serve stored assets.
 */
export const setupStaticImageServing = (app) => {
    const staticOptions = {
        maxAge: '30d',
        etag: true,
        lastModified: true,
        setHeaders: (res) => {
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
    };

    app.use('/images', express.static(STORAGE_BASE_DIR, staticOptions));
    app.use('/uploads', express.static(STORAGE_BASE_DIR, staticOptions));
};
