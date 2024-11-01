// routes/seo.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// Sitemap cache configuration
let sitemapCache = {
    content: null,
    lastUpdated: null
};

// Robots.txt route
router.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
    const robotsTxt = `
User-agent: *
Allow: /
Disallow: /api/
Disallow: /share
Disallow: /search?*

# Crawl-delay
Crawl-delay: 5

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
`.trim();

    res.type('text/plain');
    res.send(robotsTxt);
});

// Sitemap route with caching
router.get('/sitemap.xml', async (req, res) => {
    try {
        // Check cache (valid for 1 hour)
        const cacheAge = sitemapCache.lastUpdated ? Date.now() - sitemapCache.lastUpdated : Infinity;
        if (sitemapCache.content && cacheAge < 3600000) {
            res.header('Content-Type', 'application/xml');
            return res.send(sitemapCache.content);
        }

        const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Add static pages
        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'hourly' },
            { url: '/browse/latest', priority: '0.9', changefreq: 'hourly' },
            { url: '/browse/popular', priority: '0.8', changefreq: 'daily' }
        ];

        staticPages.forEach(page => {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
            sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
            sitemap += `    <priority>${page.priority}</priority>\n`;
            sitemap += `  </url>\n`;
        });

        // Add posts
        const posts = await Post.find()
            .sort({ createdAt: -1 })
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
            lastUpdated: Date.now()
        };

        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (err) {
        console.error('[Error] Sitemap generation error:', err);
        res.status(500).send('Error generating sitemap');
    }
});

module.exports = router;