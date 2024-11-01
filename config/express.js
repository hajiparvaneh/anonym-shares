// config/express.js
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const { generateMetaTags, SEO_CONFIG } = require('../utils/seo');
const path = require('path');

function configureExpress(app) {
    // View engine setup
    app.set('views', path.join(__dirname, '..', 'views'));
    app.set('view engine', 'ejs');
    app.use(expressLayouts);
    app.set('layout', 'layouts/main');

    // Make helper functions and constants available to all views
    app.locals = {
        ...app.locals,
        generateMetaTags,
        siteConfig: SEO_CONFIG,
        // Helper functions
        formatDate: (date) => {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        truncate: (str, length) => {
            if (!str) return '';
            return str.length > length ? str.substring(0, length) + '...' : str;
        }
    };

    // Add response locals that should be available for all responses
    app.use((req, res, next) => {
        res.locals.currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
        next();
    });

    return app;
}

module.exports = configureExpress;