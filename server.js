const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const postRoutes = require('./routes/posts');
const expressLayouts = require('express-ejs-layouts');
const createRateLimiter = require('./middleware/rateLimiter');

const app = express();

// Connect Database
connectDB();

// View engine setup
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Create rate limiters
const apiLimiter = createRateLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 600000,
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 150
);

// Apply rate limiting to specific routes
app.use('/share', apiLimiter); // Limit post creation
app.use('/api/search', apiLimiter); // Limit API searches

// Basic error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Routes
app.use('/', postRoutes);

// Create HTTP server
const PORT = 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Server address: ${server.address().address}:${server.address().port}`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.syscall !== 'listen') {
        throw error;
    }

    switch (error.code) {
        case 'EACCES':
            console.error(`Port ${PORT} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`Port ${PORT} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});