import http from 'http';
import express from 'express';
import { config } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { loadEnvFromDb } from './src/config/envLoader.js';
import { initializeFirebaseRealtime } from './src/config/firebase.js';
import { initSocket } from './src/config/socket.js';
import { logger } from './src/utils/logger.js';
import { connectRedis } from './src/config/redis.js';

/**
 * Dedicated entry point for the Socket.IO server.
 * This runs on a separate port (e.g. 5001) to allow NGINX to route socket traffic 
 * independently of the main API cluster, preventing sticky-session polling issues.
 */
const startSocketServer = async () => {
    try {
        logger.info('Starting standalone Socket.IO Server...');
        
        initializeFirebaseRealtime();
        
        // Connect to Database
        await connectDB();
        
        // Load Environment Variables from Database overrides
        await loadEnvFromDb();

        // Connect to Redis for horizontal scaling and API-to-Socket communication
        if (config.redisEnabled) {
            await connectRedis();
        } else {
            logger.warn('REDIS IS DISABLED! Main API will NOT be able to emit events to this socket server unless Redis is enabled.');
        }

        // Create a minimal HTTP server
        const app = express();
        app.get('/health', (req, res) => res.status(200).send('Socket Server OK'));
        const httpServer = http.createServer(app);

        // Initialize Socket.IO
        await initSocket(httpServer);

        // Port is either injected by PM2 or falls back to 5001
        const socketPort = process.env.SOCKET_PORT || 5001;

        httpServer.listen(socketPort, config.host, () => {
            logger.info(`Standalone Socket.IO Server running in ${config.nodeEnv} mode on ${config.host}:${socketPort}`);
            console.log(`🔌 [SOCKET URL] http://localhost:${socketPort}`);
        });

    } catch (error) {
        logger.error(`Error starting standalone socket server: ${error.message}`);
        process.exit(1);
    }
};

startSocketServer();
