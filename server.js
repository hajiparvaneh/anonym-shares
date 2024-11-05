// server.js
const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const postRoutes = require('./routes/posts');
const seoRoutes = require('./routes/seo-routes');
const expressLayouts = require('express-ejs-layouts');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const generateMetaTags = require('./utils/seo');
const configureExpress = require('./config/express');
const wwwRedirect = require('./middleware/wwwRedirect');
const { applySecurityMiddleware, validateContent } = require('./middleware/security');

const app = express();

// Connect Database
connectDB();

// Configure Express (includes view engine setup and locals)
configureExpress(app);

// Add www redirect before other middleware
app.use(wwwRedirect());

// Apply comprehensive security middleware (includes helmet, rate limiting, etc.)
applySecurityMiddleware(app);

// Logging configuration
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('[:date[iso]] ":method :url" :status :response-time ms - :res[content-length]', {
        skip: (req) => req.path === '/health'
    }));
} else {
    app.use(morgan('dev'));
}

// View engine setup
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');

// Compression middleware
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024 // only compress responses above 1KB
}));

// Body parser middleware with limits
app.use(bodyParser.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));

// Cache control middleware
const cacheControl = (req, res, next) => {
    // Don't cache API responses
    if (req.path.startsWith('/api/')) {
        res.set('Cache-Control', 'no-store');
        return next();
    }

    // Cache static assets aggressively
    if (req.url.match(/\.(css|js|jpg|png|gif|ico)$/)) {
        res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
        return next();
    }

    // Cache sitemap index and individual sitemaps
    if (req.path === '/sitemap_index.xml' || req.path.startsWith('/sitemap-')) {
        res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
        return next();
    }

    // Cache robots.txt
    if (req.path === '/robots.txt') {
        res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
        return next();
    }

    // Default cache for dynamic pages
    if (req.method === 'GET') {
        res.set('Cache-Control', 'public, max-age=5'); // 5 seconds
    } else {
        res.set('Cache-Control', 'no-store');
    }

    next();
};

app.use(cacheControl);

// Static files middleware
app.use(express.static('public', {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true
}));

// Content validation for post submissions
app.use('/share', validateContent);

// Routes
app.use('/', seoRoutes);  // SEO routes
app.use('/', postRoutes); // Post routes

// Health check endpoint
app.get('/health', (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV
    };
    res.json(health);
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', {
        currentPage: '404',
        pageData: {
            title: 'Page Not Found',
            description: 'The page you are looking for could not be found.'
        }
    });
});

// Error handler with privacy focus
app.use((err, req, res, next) => {
    // Log error without sensitive data
    console.error('[Error]', {
        message: err.message,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    res.status(500).render('error', {
        currentPage: 'error',
        pageData: {
            title: 'Error Occurred',
            description: process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred.'
                : err.message
        },
        error: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred.'
            : err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// Create HTTP server with enhanced security
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Server address: ${server.address().address}:${server.address().port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Starting graceful shutdown...');
    server.close(() => {
        console.log('Server closed. Exiting process.');
        process.exit(0);
    });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Give time for pending requests to complete
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Give time for pending requests to complete
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

module.exports = server;