import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * APPZETO SOP Standard Rate Limiting Implementation
 */

// Category A: Dedicated Auth Rate Limiter
// Applied directly to auth endpoints (Key: Client IP)
const authWindowMs = (config.authRateLimitWindowMinutes || 15) * 60 * 1000;

export const authRateLimiter = rateLimit({
    windowMs: authWindowMs,
    max: config.authRateLimitMax || 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.rateLimitEnabled === false,
    keyGenerator: (req) => {
        // Express trust proxy enables req.ip to accurately reflect X-Real-IP / X-Forwarded-For
        return req.ip;
    },
    handler: (req, res) => {
        const clientIp = req.ip;
        logger.warn({
            timestamp: new Date().toISOString(),
            ip: clientIp,
            route: req.originalUrl || req.url,
            method: req.method,
            userId: req.user?.userId || req.user?._id || null,
            userAgent: req.get('user-agent') || ''
        }, '[AUTH_RATE_LIMIT] Client exceeded authentication rate limit');

        return res.status(429).json({
            success: false,
            message: 'Too many authentication attempts. Please try again later.'
        });
    }
});

// Category C: Private APIs Rate Limiter
// Applied AFTER auth middleware (Key: User ID + Real Client IP)
const privateWindowMs = (config.rateLimitWindowMinutes || 15) * 60 * 1000;
const privateMax = config.nodeEnv === 'development' 
    ? (config.rateLimitDevMaxRequests || 2000)
    : (config.rateLimitMaxRequests || 3500);

export const privateRateLimiter = rateLimit({
    windowMs: privateWindowMs,
    max: privateMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.rateLimitEnabled === false,
    keyGenerator: (req) => {
        const userId = req.user?.userId || req.user?._id || req.user?.id || 'anonymous';
        const clientIp = req.ip;
        return `${userId}:${clientIp}`;
    },
    handler: (req, res) => {
        const clientIp = req.ip;
        const userId = req.user?.userId || req.user?._id || req.user?.id || 'anonymous';
        logger.warn({
            timestamp: new Date().toISOString(),
            ip: clientIp,
            route: req.originalUrl || req.url,
            method: req.method,
            userId: userId,
            userAgent: req.get('user-agent') || ''
        }, '[PRIVATE_RATE_LIMIT] User exceeded private API rate limit');

        return res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.'
        });
    }
});
