// routes/seo.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const getEnvironmentConfig = require('../config/environment');

// Sitemap cache configuration
let sitemapCache = {
    content: null,
    lastUpdated: null
};

// Robots.txt route
router.get('/robots.txt', (req, res) => {
    const config = getEnvironmentConfig();
    const baseUrl = config.baseUrl;
    
    // Different robots.txt content based on environment
    let robotsTxt = '';
    
    if (process.env.NODE_ENV === 'production') {
        robotsTxt = `
User-agent: *
Allow: /
Disallow: /api/
Disallow: /share
Disallow: /search?*

# Preferred domain
Host: www.anonymshares.com

# Crawl-delay
Crawl-delay: 5

# Sitemaps
Sitemap: ${baseUrl}/sitemap_index.xml
`.trim();
    } else {
        // More restrictive for non-production environments
        robotsTxt = `
User-agent: *
Disallow: /

# Non-production environment - No indexing allowed
`.trim();
    }

    res.type('text/plain');
    res.send(robotsTxt);
});

// Sitemap index route
router.get('/sitemap_index.xml', async (req, res) => {
    try {
        const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
        let sitemapIndex = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemapIndex += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Generate individual sitemap links (e.g., sitemap-1.xml, sitemap-2.xml)
        const postsCount = await Post.countDocuments();
        const sitemapSize = 50000; // Limit each sitemap to 50,000 URLs
        const totalSitemaps = Math.ceil(postsCount / sitemapSize);

        for (let i = 1; i <= totalSitemaps; i++) {
            sitemapIndex += `  <sitemap>\n`;
            sitemapIndex += `    <loc>${baseUrl}/sitemap-${i}.xml</loc>\n`;
            sitemapIndex += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
            sitemapIndex += `  </sitemap>\n`;
        }

        sitemapIndex += '</sitemapindex>';

        res.header('Content-Type', 'application/xml');
        res.send(sitemapIndex);
    } catch (err) {
        console.error('[Error] Sitemap index generation error:', err);
        res.status(500).send('Error generating sitemap index');
    }
});

// Individual sitemap routes with caching
router.get('/sitemap-:index.xml', async (req, res) => {
    try {
        const index = parseInt(req.params.index, 10);
        if (isNaN(index) || index < 1) {
            return res.status(400).send('Invalid sitemap index');
        }

        // Check cache (valid for 1 hour)
        const cacheAge = sitemapCache.lastUpdated ? Date.now() - sitemapCache.lastUpdated : Infinity;
        if (sitemapCache.content && sitemapCache.index === index && cacheAge < 3600000) {
            res.header('Content-Type', 'application/xml');
            return res.send(sitemapCache.content);
        }

        const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Fetch posts in batches based on the sitemap index
        const sitemapSize = 50000;
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip((index - 1) * sitemapSize)
            .limit(sitemapSize)
            .select('slug uuid createdAt views')
            .lean();

        posts.forEach(post => {
            const postAge = Date.now() - post.createdAt.getTime();
            const changefreq = postAge < 86400000 ? 'hourly' : // < 1 day
                             postAge < 604800000 ? 'daily' :   // < 1 week
                             'weekly';
            
            const priority = Math.max(0.5, Math.min(0.7, 
                0.7 * Math.exp(-postAge / (7 * 86400000))  // Decay over time
                + 0.3 * Math.min(1, post.views / 1000)     // Boost by views
            )).toFixed(1);

            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}/${post.slug}-${post.uuid}</loc>\n`;
            sitemap += `    <lastmod>${post.createdAt.toISOString()}</lastmod>\n`;
            sitemap += `    <changefreq>${changefreq}</changefreq>\n`;
            sitemap += `    <priority>${priority}</priority>\n`;
            sitemap += `  </url>\n`;
        });

        sitemap += '</urlset>';

        // Update cache
        sitemapCache = {
            content: sitemap,
            lastUpdated: Date.now(),
            index
        };

        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (err) {
        console.error('[Error] Sitemap generation error:', err);
        res.status(500).send('Error generating sitemap');
    }
});

module.exports = router;
