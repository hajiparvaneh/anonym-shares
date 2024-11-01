// middleware/wwwRedirect.js
const wwwRedirect = () => {
    return (req, res, next) => {
        // Skip for health checks and local development
        if (req.hostname === 'localhost' || 
            req.hostname === '127.0.0.1' ||
            req.path === '/health') {
            return next();
        }

        const isProduction = process.env.NODE_ENV === 'production';
        const protocol = isProduction ? 'https' : req.protocol;
        
        // Check if it's a staging domain
        if (req.hostname.includes('stage') || 
            req.hostname.includes('dev') || 
            req.hostname.includes('test')) {
            // Don't redirect staging domains
            return next();
        }

        // Only apply www redirect in production for the main domain
        if (isProduction && req.hostname === 'anonymshares.com') {
            const targetUrl = `${protocol}://www.anonymshares.com${req.originalUrl}`;
            console.log(`[Redirect] ${req.hostname}${req.originalUrl} -> ${targetUrl}`);
            return res.redirect(301, targetUrl);
        }

        next();
    };
};

module.exports = wwwRedirect;