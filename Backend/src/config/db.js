import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';
import { AppConfig } from '../core/appConfig/appConfig.model.js';

// Increase buffer timeout to 30s to prevent premature buffer timeouts during cold connections
mongoose.set('bufferTimeoutMS', 30000);

export const connectDB = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    try {
        const conn = await mongoose.connect(config.mongodbUri, {
            maxPoolSize: 100,       // Handle up to 100 concurrent DB operations (default is ~5-10)
            minPoolSize: 5,         // Keep 5 connections warm for instant response
            socketTimeoutMS: 45000, // Timeout idle sockets after 45s
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            heartbeatFrequencyMS: 10000,
        });
        logger.info(`MongoDB connected: ${conn.connection.host}`);

        // Seed default app configs if they do not exist
        try {
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
        } catch (seedErr) {
            logger.warn(`AppConfig seeding warning (non-fatal): ${seedErr.message}`);
        }

    } catch (error) {
        logger.error(`MongoDB connection error (attempt ${retryCount + 1}/${MAX_RETRIES}): ${error.message}`);
        if (retryCount < MAX_RETRIES - 1) {
            logger.info(`Retrying MongoDB connection in 3 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return connectDB(retryCount + 1);
        }
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
