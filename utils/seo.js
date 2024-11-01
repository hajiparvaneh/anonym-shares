// utils/seo.js
const slugify = require('slugify');
const striptags = require('striptags');

// Enhanced SEO Configuration
const SEO_CONFIG = {
    siteName: 'Anonymous Shares',
    baseTitle: 'Share Your Thoughts Anonymously',
    baseDescription: 'Share your thoughts, stories, and ideas anonymously with the world. A safe space for expression without identity.',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    twitter: {
        card: 'summary_large_image',
        site: '@yourtwitterhandle',
        creator: '@yourtwitterhandle'
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        image: '/images/default-share.png', // Default sharing image
        imageType: 'image/png',
        imageWidth: '1200',
        imageHeight: '630'
    },
    alternateLanguages: [
        { lang: 'en', url: 'https://anonymshares.com' }
        // Add more languages if needed
    ]
};

// Helper function to ensure text is within length limits
const truncateText = (text, maxLength) => {
    if (!text) return '';
    const truncated = text.substring(0, maxLength);
    return truncated.length < text.length ? `${truncated}...` : truncated;
};

// Helper to generate breadcrumbs structured data
const generateBreadcrumbs = (items) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${SEO_CONFIG.baseUrl}${item.path}`
    }))
});

// Enhanced meta tags generator
const generateMetaTags = (type, data = {}) => {
    const meta = {
        title: '',
        description: '',
        canonical: '',
        structured: [],  // Array to support multiple structured data objects
        openGraph: {},
        twitter: {},
        meta: [], // Additional meta tags
        links: [] // Additional link tags
    };

    // Common meta tags for all pages
    meta.meta.push(
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
        { name: 'format-detection', content: 'telephone=no' }
    );

    switch (type) {
        case 'home':
            meta.title = SEO_CONFIG.baseTitle;
            meta.description = SEO_CONFIG.baseDescription;
            meta.canonical = SEO_CONFIG.baseUrl;
            
            // WebSite structured data
            meta.structured.push({
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: SEO_CONFIG.siteName,
                description: SEO_CONFIG.baseDescription,
                url: SEO_CONFIG.baseUrl,
                potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                        '@type': 'EntryPoint',
                        urlTemplate: `${SEO_CONFIG.baseUrl}/search/{search_term_string}`
                    },
                    'query-input': 'required name=search_term_string'
                }
            });
            break;

        case 'post':
            const cleanContent = striptags(data.content || '');
            const preview = truncateText(cleanContent, 160);
            const postUrl = `${SEO_CONFIG.baseUrl}/${data.slug}-${data.uuid}`;
            
            // Enhanced title with engagement indicators
            const titlePrefix = data.views > 1000 ? 'Popular: ' : '';
            meta.title = `${titlePrefix}${truncateText(preview, 60)} | ${SEO_CONFIG.siteName}`;
            meta.description = preview;
            meta.canonical = postUrl;

            // Article structured data
            meta.structured.push({
                '@context': 'https://schema.org',
                '@type': 'SocialMediaPosting',
                headline: truncateText(preview, 110),
                description: preview,
                datePublished: data.createdAt,
                dateModified: data.createdAt,
                url: postUrl,
                interactionStatistic: {
                    '@type': 'InteractionCounter',
                    interactionType: 'https://schema.org/ReadAction',
                    userInteractionCount: data.views
                },
                author: {
                    '@type': 'Person',
                    name: 'Anonymous'
                },
                publisher: {
                    '@type': 'Organization',
                    name: SEO_CONFIG.siteName,
                    url: SEO_CONFIG.baseUrl,
                    logo: {
                        '@type': 'ImageObject',
                        url: `${SEO_CONFIG.baseUrl}/images/logo.png`
                    }
                },
                mainEntityOfPage: {
                    '@type': 'WebPage',
                    '@id': postUrl
                }
            });

            // Add breadcrumbs
            meta.structured.push(generateBreadcrumbs([
                { name: 'Home', path: '/' },
                { name: 'Posts', path: '/browse/latest' },
                { name: truncateText(preview, 30), path: `/${data.slug}-${data.uuid}` }
            ]));

            // Additional meta tags for posts
            meta.meta.push(
                { name: 'article:published_time', content: data.createdAt },
                { name: 'article:section', content: 'Anonymous Thoughts' },
                { name: 'robots', content: 'max-snippet:-1, max-image-preview:large, max-video-preview:-1' }
            );
            break;

        case 'browse':
            const section = data.section || 'latest';
            const page = data.page || 1;
            const isFirstPage = page === 1;
            
            meta.title = `${section === 'popular' ? 'Most Popular' : 'Latest'} Anonymous Thoughts ${isFirstPage ? '' : `| Page ${page}`}`;
            meta.description = `Browse ${section === 'popular' ? 'popular' : 'recent'} anonymous thoughts, stories, and ideas shared by people worldwide${isFirstPage ? '' : ` - Page ${page}`}.`;
            meta.canonical = `${SEO_CONFIG.baseUrl}/browse/${section}${isFirstPage ? '' : `?page=${page}`}`;

            // CollectionPage structured data
            meta.structured.push({
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: meta.title,
                description: meta.description,
                url: meta.canonical,
                isPartOf: {
                    '@type': 'WebSite',
                    name: SEO_CONFIG.siteName,
                    url: SEO_CONFIG.baseUrl
                }
            });

            // Add pagination meta tags
            if (data.pagination) {
                if (data.pagination.prevUrl) {
                    meta.links.push({ rel: 'prev', href: data.pagination.prevUrl });
                }
                if (data.pagination.nextUrl) {
                    meta.links.push({ rel: 'next', href: data.pagination.nextUrl });
                }
            }
            break;
    }

    // Common OpenGraph tags
    meta.openGraph = {
        ...SEO_CONFIG.openGraph,
        title: meta.title,
        description: meta.description,
        url: meta.canonical,
        site_name: SEO_CONFIG.siteName,
        updated_time: data.createdAt || new Date().toISOString()
    };

    // Common Twitter tags
    meta.twitter = {
        ...SEO_CONFIG.twitter,
        title: truncateText(meta.title, 70),
        description: truncateText(meta.description, 200)
    };

    // Add alternate language links
    SEO_CONFIG.alternateLanguages.forEach(lang => {
        meta.links.push({
            rel: 'alternate',
            hreflang: lang.lang,
            href: lang.url + (meta.canonical.replace(SEO_CONFIG.baseUrl, ''))
        });
    });

    return meta;
};

module.exports = {
    SEO_CONFIG,
    generateMetaTags,
    truncateText
};