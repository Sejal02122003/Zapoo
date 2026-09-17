import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config/env.js';

export const signAccessToken = (payload) => {
    return jwt.sign(
        { ...payload, jti: crypto.randomUUID() },
        config.jwtAccessSecret,
        {
            expiresIn: config.jwtAccessExpiresIn
        }
    );
};

export const signRefreshToken = (payload) => {
    return jwt.sign(
        { ...payload, jti: crypto.randomUUID() },
        config.jwtRefreshSecret,
        {
            expiresIn: config.jwtRefreshExpiresIn
        }
    );
};

export const verifyAccessToken = (token) => {
    return jwt.verify(token, config.jwtAccessSecret);
};

export const verifyRefreshToken = (token) => {
    return jwt.verify(token, config.jwtRefreshSecret);
};


