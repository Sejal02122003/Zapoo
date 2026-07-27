import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

const windowMs = config.rateLimitWindowMinutes * 60 * 1000;

export const apiRateLimiter = rateLimit({
    windowMs,
    max: config.nodeEnv === 'development' ? Math.max(config.rateLimitMaxRequests, 5000) : Math.max(config.rateLimitMaxRequests, 1000),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path?.includes('/app-config/'),
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

const authWindowMs = config.authRateLimitWindowMinutes * 60 * 1000;

/** Stricter rate limit for auth routes (OTP, login, refresh, logout). Applied in addition to global limiter. */
export const authRateLimiter = rateLimit({
    windowMs: authWindowMs,
    max: config.nodeEnv === 'development' ? Math.max(config.authRateLimitMax, 500) : Math.max(config.authRateLimitMax, 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again later.'
    }
});

