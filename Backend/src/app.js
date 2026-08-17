import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'mongo-sanitize';
import xssClean from 'xss-clean';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { responseTimeLogger } from './middleware/responseTimeLogger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { healthCheck } from './config/health.js';
import { config } from './config/env.js';
import compression from 'compression';

import { setupStaticImageServing } from './config/staticStorage.js';

const app = express();

// Enable Trust Proxy per SOP (Allows Express to identify real client IP from Nginx X-Real-IP / X-Forwarded-For)
app.set('trust proxy', 1);

// Serve local /var/storage images under /images path (Static bypass)
setupStaticImageServing(app);

// 1. Compression
app.use(compression());

// 2. Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
    hsts: config.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// 3. CORS
app.use(cors());

// 4. Request Logging & Tracing
app.use(requestIdMiddleware);
app.use(morgan('dev'));

// 5. Body Parsers
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl && req.originalUrl.includes('/webhook/razorpay')) {
            req.rawBody = buf;
        }
    }
}));
app.use(express.urlencoded({ extended: true }));

// Sanitization
app.use((req, _res, next) => {
    req.body = mongoSanitize(req.body);
    req.query = mongoSanitize(req.query);
    req.params = mongoSanitize(req.params);
    next();
});
app.use(xssClean());

// Unrestricted Public Health Endpoints
app.get('/health', async (_req, res) => {
    try {
        const data = await healthCheck();
        res.status(200).json(data);
    } catch (err) {
        res.status(503).json({ status: 'DOWN', error: 'Health check failed' });
    }
});
app.get('/ready', (_req, res) => {
    res.status(200).json({ status: 'ready' });
});

// Response time logger
app.use('/api', responseTimeLogger);



// API Routes (Includes Auth -> Category A Auth Limiter, Public -> Category B Unrestricted, Private -> Category C User+IP Limiter)
app.use('/api', routes);

// Error Handling
app.use(errorHandler);

export default app;
