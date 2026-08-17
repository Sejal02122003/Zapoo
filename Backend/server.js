import http from 'http';
import { execSync } from 'child_process';
import app from './src/app.js';
import { config } from './src/config/env.js';
import { validateConfig } from './src/config/validateEnv.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { connectRedis, closeRedis } from './src/config/redis.js';
import { initSocket } from './src/config/socket.js';
import { initializeQueues, closeBullMQConnection } from './src/queues/index.js';


import { logger } from './src/utils/logger.js';
import { initializeFirebaseRealtime } from './src/config/firebase.js';
import { loadEnvFromDb } from './src/config/envLoader.js';

const SHUTDOWN_TIMEOUT_MS = 10000;
let server = null;


const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown`);
    if (!server) {
        process.exit(0);
        return;
    }
    server.close(async () => {
        try {
            await disconnectDB();
            await closeRedis();
            await closeBullMQConnection();

            logger.info('Graceful shutdown complete');
            process.exit(0);
        } catch (err) {
            logger.error(`Shutdown error: ${err.message}`);
            process.exit(1);
        }
    });
    setTimeout(() => {
        logger.error('Shutdown timeout, forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
};

const startServer = async () => {
    try {
        validateConfig();
        initializeFirebaseRealtime();

        // 1. Connect to Database (MongoDB)
        await connectDB();

        // 1.5 Load Environment Variables from Database overrides
        await loadEnvFromDb();

        // 1.75 Start background schedulers (after DB is fully connected)
        try {
            const { startCashbackExpiryScheduler } = await import('./src/core/jobs/cashbackExpiry.scheduler.js');
            const { startSurgeScheduler } = await import('./src/core/jobs/surgeScheduler.job.js');
            const { startRestaurantTimingScheduler } = await import('./src/core/jobs/restaurantTimingScheduler.job.js');
            startCashbackExpiryScheduler();
            startSurgeScheduler();
            startRestaurantTimingScheduler();
        } catch (schedErr) {
            logger.error(`Scheduler startup error: ${schedErr.message}`);
        }

        // 2. Create HTTP server from Express app
        const httpServer = http.createServer(app);

        // 3. Initialize Socket.IO with the HTTP server (Redis adapter when Redis enabled)
        await initSocket(httpServer);

        if (config.redisEnabled) {
            await connectRedis();
        }
        
        // 5a. Watchdog: Recover stuck orders from previous run
        try {
            const { recoverStuckOrders } = await import('./src/modules/food/orders/services/order.service.js');
            await recoverStuckOrders();
            setInterval(recoverStuckOrders, 5 * 60 * 1000); // Run watchdog every 5 minutes
        } catch (err) {
            logger.error(`Watchdog startup error: ${err.message}`);
        }

        // 5. Conditionally initialize BullMQ queues.
        // BullMQ requires Redis; skip queue bootstrap when Redis is disabled.
        if (config.bullmqEnabled && config.redisEnabled) {
            try {
                initializeQueues();
            } catch (err) {
                logger.error(`BullMQ initialization error (server continues): ${err.message}`);
            }
        } else if (config.bullmqEnabled && !config.redisEnabled) {
            logger.warn('BullMQ is enabled but Redis is disabled. Queue initialization skipped.');
        }

        // 6. Start the HTTP server
        server = httpServer.listen(config.port, config.host, () => {
            logger.info(`Server running in ${config.nodeEnv} mode on ${config.host}:${config.port}`);
            console.log(`🌐 [URL] http://localhost:${config.port}`);
        });



        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        // Handle server errors (like EADDRINUSE)
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.warn(`Port ${config.port} is already in use. Auto-killing existing process...`);
                try {
                    if (process.platform === 'win32') {
                        execSync(`powershell -Command "Get-NetTCPConnection -LocalPort ${config.port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`);
                    } else {
                        execSync(`fuser -k ${config.port}/tcp || true`);
                    }
                    logger.info(`Port ${config.port} freed. Retrying listen...`);
                    setTimeout(() => {
                        server.listen(config.port, config.host);
                    }, 1000);
                    return;
                } catch (killErr) {
                    logger.error(`Port ${config.port} is already in use and could not be freed automatically.`);
                }
            } else {
                logger.error(`Server Error: ${err.message}`);
            }
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            logger.error(`Unhandled Rejection: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                if (server) server.close(() => process.exit(1));
                else process.exit(1);
            }
        });

        process.on('uncaughtException', (err) => {
            logger.error(`Uncaught Exception: ${err?.message || err}`);
            if (config.nodeEnv === 'production') {
                process.exit(1);
            }
        });

    } catch (error) {
        logger.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
};

startServer();

