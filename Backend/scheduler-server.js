import { config } from './src/config/env.js';
import { validateConfig } from './src/config/validateEnv.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { connectRedis, closeRedis } from './src/config/redis.js';
import { logger } from './src/utils/logger.js';
import { loadEnvFromDb } from './src/config/envLoader.js';

// Scheduler Imports
import { expireExpiredOffers } from './src/modules/food/admin/services/admin.service.js';
import { syncExpiredFssaiNotifications } from './src/modules/food/restaurant/services/fssaiExpiry.service.js';
import { startEmergencyBroadcastScheduler } from './src/core/jobs/emergencyBroadcast.scheduler.js';
import { startLateDeliveryWarningScheduler } from './src/core/jobs/lateDeliveryWarning.scheduler.js';

const SHUTDOWN_TIMEOUT_MS = 10000;
let expireOffersInterval = null;
let fssaiExpiryInterval = null;

const gracefulShutdown = async (signal) => {
    logger.info(`Scheduler ${signal} received, starting graceful shutdown`);
    try {
        await disconnectDB();
        await closeRedis();
        if (expireOffersInterval) clearInterval(expireOffersInterval);
        if (fssaiExpiryInterval) clearInterval(fssaiExpiryInterval);
        logger.info('Scheduler Graceful shutdown complete');
        process.exit(0);
    } catch (err) {
        logger.error(`Scheduler Shutdown error: ${err.message}`);
        process.exit(1);
    }

    setTimeout(() => {
        logger.error('Scheduler Shutdown timeout, forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
};

const startSchedulerServer = async () => {
    try {
        validateConfig();
        
        // Connect to Database (MongoDB)
        await connectDB();

        // Load Environment Variables from Database overrides
        await loadEnvFromDb();

        if (config.redisEnabled) {
            await connectRedis();
        }

        logger.info(`Scheduler Server running in ${config.nodeEnv} mode`);

        // Initialize Schedulers
        const runExpire = async () => {
            try {
                await expireExpiredOffers();
            } catch (err) {
                logger.error(`Expire offers error: ${err.message}`);
            }
        };
        runExpire();
        expireOffersInterval = setInterval(runExpire, 5 * 60 * 1000);

        const runFssaiExpirySync = async () => {
            try {
                await syncExpiredFssaiNotifications();
            } catch (err) {
                logger.error(`FSSAI expiry sync error: ${err.message}`);
            }
        };
        runFssaiExpirySync();
        fssaiExpiryInterval = setInterval(runFssaiExpirySync, 60 * 60 * 1000);

        try {
            startEmergencyBroadcastScheduler();
            logger.info('Emergency Broadcast Scheduler started');
        } catch (err) {
            logger.error(`Emergency Broadcast Scheduler error: ${err.message}`);
        }

        try {
            startLateDeliveryWarningScheduler();
            logger.info('Late Delivery Warning Scheduler started');
        } catch (err) {
            logger.error(`Late Delivery Warning Scheduler error: ${err.message}`);
        }

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            logger.error(`Unhandled Rejection: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                process.exit(1);
            }
        });

        process.on('uncaughtException', (err) => {
            logger.error(`Uncaught Exception: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                process.exit(1);
            }
        });

    } catch (error) {
        logger.error(`Error starting scheduler server: ${error.message}`);
        process.exit(1);
    }
};

startSchedulerServer();
