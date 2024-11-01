// utils/seo.js
const slugify = require('slugify');
const striptags = require('striptags');

// SEO Configuration
const SEO_CONFIG = {
    siteName: 'Anonymous Shares',
    baseTitle: 'Share Your Thoughts Anonymously',
    baseDescription: 'Share your thoughts, stories, and ideas anonymously with the world. A safe space for expression without identity.',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    twitter: {
        card: 'summary_large_image',
        site: '@yourtwitterhandle' // If you have one
    },
    openGraph: {
        type: 'website',
        locale: 'en_US'
    }
};

// Generate meta tags for different page types
const generateMetaTags = (type, data = {}) => {
    const meta = {
        title: '',
        description: '',
        canonical: '',
        structured: {},
        openGraph: {},
        twitter: {}
    };

    switch (type) {
        case 'home':
            meta.title = SEO_CONFIG.baseTitle;
            meta.description = SEO_CONFIG.baseDescription;
            meta.canonical = SEO_CONFIG.baseUrl;
            meta.structured = {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: SEO_CONFIG.siteName,
                description: SEO_CONFIG.baseDescription,
                url: SEO_CONFIG.baseUrl
            };
            break;

        case 'post':
            const cleanContent = striptags(data.content || '');
            const preview = cleanContent.substring(0, 160);
            
            meta.title = `${preview}... | ${SEO_CONFIG.siteName}`;
            meta.description = preview;
            meta.canonical = `${SEO_CONFIG.baseUrl}/${data.slug}-${data.uuid}`;
            meta.structured = {
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: preview,
                description: preview,
                datePublished: data.createdAt,
                dateModified: data.createdAt,
                mainEntityOfPage: {
                    '@type': 'WebPage',
                    '@id': meta.canonical
                },
                author: {
                    '@type': 'Person',
                    name: 'Anonymous'
                }
            };
            break;

        case 'browse':
            const section = data.section || 'latest';
            const page = data.page || 1;
            
            meta.title = `${section === 'popular' ? 'Most Popular' : 'Latest'} Anonymous Thoughts | Page ${page}`;
            meta.description = `Browse ${section === 'popular' ? 'popular' : 'recent'} anonymous thoughts, stories, and ideas shared by people worldwide. Page ${page}.`;
            meta.canonical = `${SEO_CONFIG.baseUrl}/browse/${section}`;
            meta.structured = {
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: meta.title,
                description: meta.description,
                url: meta.canonical
            };
            break;
    }

    // Generate OpenGraph tags
    meta.openGraph = {
        ...SEO_CONFIG.openGraph,
        title: meta.title,
        description: meta.description,
        url: meta.canonical,
        site_name: SEO_CONFIG.siteName
    };

    // Generate Twitter tags
    meta.twitter = {
        ...SEO_CONFIG.twitter,
        title: meta.title,
        description: meta.description
    };

    return meta;
};

module.exports = {
    SEO_CONFIG,
    generateMetaTags
};