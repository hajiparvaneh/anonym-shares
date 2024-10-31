// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs = 10 * 60 * 1000, max = 150) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'Too many requests, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Store config
        skipFailedRequests: false,
        skipSuccessfulRequests: false,
        // Customize rate limit key generation
        keyGenerator: (req) => {
            // Use IP address as default key
            return req.ip;
        },
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many requests, please try again later.',
                retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000)
            });
        }
    });
};

module.exports = createRateLimiter;