const express = require('express');
const router = express.Router();
const { generateMetaTags } = require('../utils/seo');

// Static pages router
router.get('/privacy', (req, res) => {
    console.log('[Route] GET /privacy - Accessing privacy policy');
    const meta = generateMetaTags('page', {
        title: 'Privacy Policy | Anonymous Shares',
        description: 'Our commitment to your privacy and data protection at AnonymShares. Learn about our no-tracking, no-cookies policy.',
        url: '/privacy',
        robots: 'index, follow'
    });

    res.render('pages/privacy-policy', {
        currentPage: 'privacy',
        pageType: 'policy',
        pageData: {
            title: 'Privacy Policy',
            description: 'Our commitment to your privacy and data protection at AnonymShares.',
            lastUpdated: new Date().toLocaleDateString()
        },
        meta
    });
});

// Terms of Use page route
router.get('/terms', (req, res) => {
    console.log('[Route] GET /terms - Accessing terms of use');
    const meta = generateMetaTags('page', {
        title: 'Terms of Use | Anonymous Shares',
        description: 'Terms and conditions for using AnonymShares platform. Learn about our content guidelines and user responsibilities.',
        url: '/terms',
        robots: 'index, follow'
    });

    res.render('pages/terms-of-use', {
        currentPage: 'terms',
        pageType: 'policy',
        pageData: {
            title: 'Terms of Use',
            description: 'Terms and conditions for using AnonymShares platform.',
            lastUpdated: new Date().toLocaleDateString()
        },
        meta
    });
});

module.exports = router;