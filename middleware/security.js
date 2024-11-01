// middleware/security.js
const helmet = require('helmet');
const hpp = require('hpp');
const { sanitize } = require('express-mongo-sanitize');
const xss = require('xss');
const rateLimit = require('express-rate-limit');

// Rate limiter configurations
const createRateLimiters = () => {
    const defaultConfig = {
        standardHeaders: true,
        legacyHeaders: false,
        skipFailedRequests: false
    };

    return {
        // General page views limiter
        views: rateLimit({
            ...defaultConfig,
            windowMs: 5 * 60 * 1000, // 5 minutes
            max: 300, // 300 requests per 5 minutes
            message: 'Too many page views. Please try again later.',
            handler: (req, res) => {
                if (req.accepts('html')) {
                    res.status(429).render('error', {
                        currentPage: 'error',
                        pageData: {
                            title: 'Too Many Requests',
                            description: 'You have exceeded the page view limit. Please try again in a few minutes.'
                        }
                    });
                } else {
                    res.status(429).json({
                        error: 'Too many requests. Please try again later.'
                    });
                }
            },
            skip: (req) => {
                // Skip static files and essential routes
                return req.path.match(/\.(css|js|jpg|png|gif|ico)$/) ||
                       req.path === '/health' ||
                       req.path === '/robots.txt' ||
                       req.path.startsWith('/sitemap');
            }
        }),

        // Post creation limiter
        post: rateLimit({
            ...defaultConfig,
            windowMs: 60 * 1000, // 1 minute
            max: 5, // 5 posts per minute
            message: 'Too many posts created. Please try again later.',
            handler: (req, res) => {
                res.status(429).json({
                    error: 'You are posting too frequently. Please try again in a minute.'
                });
            }
        }),

        // Search limiter
        search: rateLimit({
            ...defaultConfig,
            windowMs: 60 * 1000, // 1 minute
            max: 30, // 30 searches per minute
            message: 'Too many search requests. Please try again later.',
            handler: (req, res) => {
                if (req.accepts('html')) {
                    res.status(429).render('error', {
                        currentPage: 'error',
                        pageData: {
                            title: 'Search Limit Exceeded',
                            description: 'You have exceeded the search limit. Please try again in a minute.'
                        }
                    });
                } else {
                    res.status(429).json({
                        error: 'Too many search requests. Please try again later.'
                    });
                }
            }
        })
    };
};


// Content validation middleware
const validateContent = (req, res, next) => {
    try {
        if (!req.is('application/json')) {
            return res.status(415).json({ 
                error: 'Content must be application/json' 
            });
        }

        if (!req.body || !req.body.content) {
            return res.status(400).json({ 
                error: 'Content is required' 
            });
        }

        const content = req.body.content;

        // Basic validation
        if (typeof content !== 'string') {
            return res.status(400).json({ 
                error: 'Content must be a string' 
            });
        }

        if (content.length > 10000) {
            return res.status(400).json({ 
                error: 'Content too long (max 10000 characters)' 
            });
        }

        if (content.trim().length < 1) {
            return res.status(400).json({ 
                error: 'Content cannot be empty' 
            });
        }

        // Sanitize content
        req.body.content = xss(content);    // Prevent XSS
        req.body = sanitize(req.body);      // Prevent MongoDB injection

        next();
    } catch (error) {
        console.error('Content validation error:', error);
        res.status(400).json({ 
            error: 'Invalid content format' 
        });
    }
};

// Security headers configuration
const getHelmetConfig = () => ({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
            objectSrc: ["'none'"],
            mediaSrc: ["'none'"],
            frameSrc: ["'none'"],
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Main security middleware chain
const applySecurityMiddleware = (app) => {
    // Initialize rate limiters
    const rateLimiters = createRateLimiters();

    // Apply security headers
    app.use(helmet(getHelmetConfig()));
    
    // Prevent parameter pollution
    app.use(hpp());
    
    // MongoDB sanitization
    app.use(require('express-mongo-sanitize')());
    
    // Remove sensitive headers
    app.use((req, res, next) => {
        res.removeHeader('X-Powered-By');
        res.removeHeader('Server');
        next();
    });

    // Apply rate limiters to specific routes
    app.use('/', rateLimiters.views);           // All pages
    app.use('/share', rateLimiters.post);       // Post creation
    app.use('/search', rateLimiters.search);    // Search functionality
    app.use('/api/search', rateLimiters.search);// API search endpoints

    return app;
};

module.exports = {
    applySecurityMiddleware,
    validateContent
};