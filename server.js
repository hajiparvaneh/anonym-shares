const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const postRoutes = require('./routes/posts');
const seoRoutes = require('./routes/seo-routes');
const expressLayouts = require('express-ejs-layouts');
const createRateLimiter = require('./middleware/rateLimiter');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const generateMetaTags = require('./utils/seo');
const configureExpress = require('./config/express');

const app = express();

// Connect Database
connectDB();

// Configure Express (includes view engine setup and locals)
configureExpress(app);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
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
}));

// Logging configuration
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('[:date[iso]] ":method :url" :status :response-time ms - :res[content-length]'));
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
    level: 6
}));

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

    // Cache sitemap.xml
    if (req.path === '/sitemap.xml') {
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
        res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
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

// Create rate limiters
const apiLimiter = createRateLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 600000,
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 150
);

// Apply rate limiting to specific routes
app.use('/share', apiLimiter);
app.use('/api/search', apiLimiter);

// Routes
app.use('/', seoRoutes);  // SEO routes
app.use('/', postRoutes); // Post routes

app.locals.generateMetaTags = generateMetaTags;

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

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    
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

// Create HTTP server
const PORT = 3000;
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

module.exports = server;