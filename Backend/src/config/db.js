import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';
import { AppConfig } from '../core/appConfig/appConfig.model.js';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongodbUri, {
            maxPoolSize: 100,       // Handle up to 100 concurrent DB operations (default is ~5-10)
            minPoolSize: 5,         // Keep 5 connections warm for instant response
            socketTimeoutMS: 45000, // Timeout idle sockets after 45s
        });
        logger.info(`MongoDB connected: ${conn.connection.host}`);

        // Seed default app configs if they do not exist
        const apps = ['user_app', 'delivery_app', 'restaurant_app', 'admin_app'];
        for (const appName of apps) {
            const exists = await AppConfig.exists({ appName });
            if (!exists) {
                await AppConfig.create({ appName });
                logger.info(`Seeded default app config for: ${appName}`);
            }
        }

        // Explicitly update user_app's color in the database
        await AppConfig.updateOne(
            { appName: 'user_app' },
            { $set: { primaryColor: '#FE593B' } }
        );
        logger.info(`Ensured user_app theme color is set to #FE593B`);

    } catch (error) {
        logger.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

/**
 * Close MongoDB connection (e.g. graceful shutdown).
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
};
