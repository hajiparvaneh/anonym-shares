// utils/seo.js

/**
 * Enhanced SEO Configuration and Meta Tag Generator
 * Handles all types of pages with proper meta tags, structured data, and social sharing
 */

const SEO_CONFIG = {
    site: {
        name: 'Anonymous Shares',
        baseTitle: 'Share Your Thoughts Anonymously',
        baseDescription: 'Share your thoughts, stories, and ideas anonymously with the world. A safe space for expression without identity.',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
        language: 'en',
        defaultLocale: 'en_US'
    },
    branding: {
        logo: {
            url: '/images/logo.png',
            width: 190,
            height: 60
        },
        defaultImage: {
            url: '/images/default-share.png',
            width: 1200,
            height: 630,
            type: 'image/png'
        }
    },
    social: {
        twitter: {
            card: 'summary_large_image',
            site: '@anonymshares',
            creator: '@anonymshares'
        },
        facebook: {
            appId: process.env.FACEBOOK_APP_ID
        }
    },
    seo: {
        maxTitleLength: 60,
        maxDescriptionLength: 160,
        maxKeywordsLength: 10,
        robots: {
            default: 'index, follow',
            search: 'noindex, follow',
            admin: 'noindex, nofollow'
        }
    },
    schema: {
        organization: {
            '@type': 'Organization',
            name: 'Anonymous Shares',
            url: process.env.BASE_URL || 'http://localhost:3000',
            logo: {
                '@type': 'ImageObject',
                url: '/images/logo.png',
                width: '190',
                height: '60'
            }
        }
    }
};

/**
 * Helper function to truncate text while maintaining word boundaries
 */
const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;

    const truncated = text.slice(0, maxLength).trim();
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
};

/**
 * Generate breadcrumb structured data
 */
const generateBreadcrumbs = (items) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
            '@id': `${SEO_CONFIG.site.baseUrl}${item.path}`,
            name: item.name
        }
    }))
});

/**
 * Generate WebSite structured data
 */
const generateWebsiteSchema = () => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO_CONFIG.site.name,
    url: SEO_CONFIG.site.baseUrl,
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SEO_CONFIG.site.baseUrl}/search/{search_term_string}`
        },
        'query-input': 'required name=search_term_string'
    }
});

/**
 * Generate Article structured data
 */
const generateArticleSchema = (post) => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: truncateText(post.content, 110),
    description: post.preview || truncateText(post.content, SEO_CONFIG.seo.maxDescriptionLength),
    author: {
        '@type': 'Person',
        name: 'Anonymous'
    },
    publisher: SEO_CONFIG.schema.organization,
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${SEO_CONFIG.site.baseUrl}/${post.slug}-${post.uuid}`
    },
    image: {
        '@type': 'ImageObject',
        url: SEO_CONFIG.branding.defaultImage.url,
        width: SEO_CONFIG.branding.defaultImage.width,
        height: SEO_CONFIG.branding.defaultImage.height
    }
});

/**
 * Main meta tag generator function
 */
const generateMetaTags = (type, data = {}) => {
    const meta = {
        basic: [],        // Basic meta tags
        opengraph: [],    // Open Graph meta tags
        twitter: [],      // Twitter meta tags
        links: [],        // Link tags
        structured: [],   // Structured data
        custom: []        // Custom meta tags
    };

    // Default values
    const defaults = {
        title: SEO_CONFIG.site.baseTitle,
        description: SEO_CONFIG.site.baseDescription,
        url: SEO_CONFIG.site.baseUrl,
        image: SEO_CONFIG.branding.defaultImage.url,
        robots: SEO_CONFIG.seo.robots.default
    };

    // Process by page type
    switch (type) {
        case 'home': {
            const baseTitle = 'Anonymous Shares - Share Your Thoughts Anonymously';
            const baseDescription = 'Share your thoughts, stories, and ideas anonymously with the world. A safe space for expression without identity.';

            // Add basic meta tags
            meta.basic.push(
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
                { name: 'robots', content: 'index, follow' },
                { name: 'description', content: baseDescription },
                { name: 'language', content: 'en' }
            );

            // Add statistics if available
            if (data.stats) {
                meta.custom.push(
                    { name: 'total-posts', content: data.stats.posts },
                    { name: 'total-views', content: data.stats.views }
                );
            }

            // Add Open Graph tags
            meta.opengraph.push(
                { property: 'og:title', content: baseTitle },
                { property: 'og:description', content: baseDescription },
                { property: 'og:url', content: SEO_CONFIG.site.baseUrl },
                { property: 'og:type', content: 'website' },
                { property: 'og:site_name', content: SEO_CONFIG.site.name },
                { property: 'og:image', content: SEO_CONFIG.branding.defaultImage.url },
                { property: 'og:image:width', content: SEO_CONFIG.branding.defaultImage.width },
                { property: 'og:image:height', content: SEO_CONFIG.branding.defaultImage.height }
            );

            // Add Twitter Card tags
            meta.twitter.push(
                { name: 'twitter:card', content: 'summary_large_image' },
                { name: 'twitter:title', content: baseTitle },
                { name: 'twitter:description', content: baseDescription },
                { name: 'twitter:image', content: SEO_CONFIG.branding.defaultImage.url }
            );

            // Add Website structured data
            meta.structured.push({
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: SEO_CONFIG.site.name,
                description: baseDescription,
                url: SEO_CONFIG.site.baseUrl,
                potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                        '@type': 'EntryPoint',
                        urlTemplate: `${SEO_CONFIG.site.baseUrl}/search/{search_term_string}`
                    },
                    'query-input': 'required name=search_term_string'
                }
            });

            // Add Organization structured data
            meta.structured.push({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: SEO_CONFIG.site.name,
                url: SEO_CONFIG.site.baseUrl,
                logo: {
                    '@type': 'ImageObject',
                    url: `${SEO_CONFIG.site.baseUrl}${SEO_CONFIG.branding.logo.url}`,
                    width: SEO_CONFIG.branding.logo.width,
                    height: SEO_CONFIG.branding.logo.height
                },
                sameAs: [
                    'https://twitter.com/anonymshares',
                    // Add other social media links here
                ]
            });

            // Add breadcrumbs structured data for home page
            meta.structured.push(
                generateBreadcrumbs([
                    { name: 'Home', path: '/' }
                ])
            );

            return {
                title: baseTitle,
                meta: {
                    basic: meta.basic,
                    opengraph: meta.opengraph,
                    twitter: meta.twitter,
                    custom: meta.custom
                },
                links: meta.links,
                structured: meta.structured,
                canonical: SEO_CONFIG.site.baseUrl
            };
        }

        case 'post': {
            if (!data.post) throw new Error('Post data required for post type');

            // Format dates properly
            const publishDate = new Date(data.post.createdAt).toISOString();
            const modifyDate = new Date(data.post.updatedAt || data.post.createdAt).toISOString();

            // Create clean description without unwanted characters
            const cleanContent = data.post.content
                .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except basic punctuation
                .trim();
            const postDesc = data.post.preview || truncateText(cleanContent, SEO_CONFIG.seo.maxDescriptionLength);
            const postTitle = truncateText(cleanContent, SEO_CONFIG.seo.maxTitleLength);
            const postUrl = `${SEO_CONFIG.site.baseUrl}/${data.post.slug}-${data.post.uuid}`;

            // Add basic meta tags
            meta.basic.push(
                { name: 'article:published_time', content: publishDate },
                { name: 'article:modified_time', content: modifyDate },
                { name: 'author', content: 'Anonymous' },
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
                { name: 'robots', content: data.robots || 'index, follow' },
                { name: 'description', content: postDesc }
            );

            // Add OpenGraph tags
            meta.opengraph.push(
                { property: 'og:title', content: `${postTitle} | ${SEO_CONFIG.site.name}` },
                { property: 'og:description', content: postDesc },
                { property: 'og:url', content: postUrl },
                { property: 'og:type', content: 'article' },
                { property: 'og:site_name', content: SEO_CONFIG.site.name },
                { property: 'og:image', content: SEO_CONFIG.branding.defaultImage.url },
                { property: 'og:image:width', content: SEO_CONFIG.branding.defaultImage.width },
                { property: 'og:image:height', content: SEO_CONFIG.branding.defaultImage.height },
                { property: 'og:locale', content: SEO_CONFIG.site.defaultLocale },
                { property: 'article:published_time', content: publishDate },
                { property: 'article:modified_time', content: modifyDate },
                { property: 'article:author', content: 'Anonymous' }
            );

            // Add Twitter tags
            meta.twitter.push(
                { name: 'twitter:card', content: SEO_CONFIG.social.twitter.card },
                { name: 'twitter:site', content: SEO_CONFIG.social.twitter.site },
                { name: 'twitter:title', content: `${postTitle} | ${SEO_CONFIG.site.name}` },
                { name: 'twitter:description', content: postDesc },
                { name: 'twitter:image', content: SEO_CONFIG.branding.defaultImage.url }
            );

            // Add custom meta tags for engagement metrics
            if (data.post.qualityRating !== undefined) {
                meta.custom.push({ name: 'quality-score', content: data.post.qualityRating });
            }
            if (data.post.views !== undefined) {
                meta.custom.push({ name: 'view-count', content: data.post.views });
            }
            if (data.readingTime) {
                meta.custom.push({ name: 'reading-time', content: data.readingTime });
            }

            // Add structured data
            meta.structured.push(
                {
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    headline: postTitle,
                    description: postDesc,
                    author: {
                        '@type': 'Person',
                        name: 'Anonymous'
                    },
                    publisher: SEO_CONFIG.schema.organization,
                    datePublished: publishDate,
                    dateModified: modifyDate,
                    mainEntityOfPage: {
                        '@type': 'WebPage',
                        '@id': postUrl
                    },
                    image: {
                        '@type': 'ImageObject',
                        url: SEO_CONFIG.branding.defaultImage.url,
                        width: SEO_CONFIG.branding.defaultImage.width,
                        height: SEO_CONFIG.branding.defaultImage.height
                    }
                },
                generateBreadcrumbs([
                    { name: 'Home', path: '/' },
                    { name: 'Posts', path: '/browse/latest' },
                    { name: postTitle, path: `/${data.post.slug}-${data.post.uuid}` }
                ])
            );

            return {
                title: `${postTitle} | ${SEO_CONFIG.site.name}`,
                meta: {
                    basic: meta.basic,
                    opengraph: meta.opengraph,
                    twitter: meta.twitter,
                    custom: meta.custom
                },
                links: meta.links,
                structured: meta.structured,
                canonical: postUrl
            };
        }

        case 'search': {
            const searchQuery = data.query || '';
            const page = data.page || 1;
            const isFirstPage = page === 1;
            const totalResults = data.total || 0;

            // Add basic meta tags
            meta.basic.push(
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
                { name: 'robots', content: data.robots || 'noindex, follow' },
                { name: 'description', content: data.description },
                { name: 'language', content: 'en' }
            );

            // Add Open Graph tags
            meta.opengraph.push(
                { property: 'og:title', content: data.title },
                { property: 'og:description', content: data.description },
                { property: 'og:url', content: `${SEO_CONFIG.site.baseUrl}/search/${encodeURIComponent(searchQuery)}` },
                { property: 'og:type', content: 'website' },
                { property: 'og:site_name', content: SEO_CONFIG.site.name }
            );

            // Add Twitter Card tags
            meta.twitter.push(
                { name: 'twitter:card', content: 'summary' },
                { name: 'twitter:title', content: data.title },
                { name: 'twitter:description', content: data.description }
            );

            // Add pagination links if available
            if (data.pagination) {
                if (data.pagination.prevUrl) {
                    meta.links.push({ rel: 'prev', href: data.pagination.prevUrl });
                }
                if (data.pagination.nextUrl) {
                    meta.links.push({ rel: 'next', href: data.pagination.nextUrl });
                }
            }

            return {
                title: data.title,
                meta: {
                    basic: meta.basic,
                    opengraph: meta.opengraph,
                    twitter: meta.twitter,
                    custom: meta.custom
                },
                links: meta.links,
                structured: meta.structured,
                canonical: `${SEO_CONFIG.site.baseUrl}/search/${encodeURIComponent(searchQuery)}`
            };
        }

        case 'browse': {
            const section = data.section || 'latest';
            const page = data.page || 1;
            const isFirstPage = page === 1;
            const baseUrl = `${SEO_CONFIG.site.baseUrl}/browse/${section}`;
            const currentUrl = `${baseUrl}${page > 1 ? `?page=${page}` : ''}`;

            // Add basic meta tags
            meta.basic.push(
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
                { name: 'robots', content: 'index, follow' },
                { name: 'description', content: data.description },
                { name: 'language', content: 'en' }
            );

            // Add Open Graph tags
            meta.opengraph.push(
                { property: 'og:title', content: data.title },
                { property: 'og:description', content: data.description },
                { property: 'og:url', content: currentUrl },
                { property: 'og:type', content: 'website' },
                { property: 'og:site_name', content: SEO_CONFIG.site.name }
            );

            // Add Twitter Card tags
            meta.twitter.push(
                { name: 'twitter:card', content: 'summary_large_image' },
                { name: 'twitter:title', content: data.title },
                { name: 'twitter:description', content: data.description }
            );

            // Add structured data for CollectionPage
            meta.structured.push({
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: data.title,
                description: data.description,
                url: currentUrl,
                isPartOf: {
                    '@type': 'WebSite',
                    name: SEO_CONFIG.site.name,
                    url: SEO_CONFIG.site.baseUrl
                }
            });

            // Add breadcrumbs structured data
            meta.structured.push(
                generateBreadcrumbs([
                    { name: 'Home', path: '/' },
                    { name: 'Browse', path: '/browse' },
                    { name: section === 'popular' ? 'Most Popular' : 'Latest', path: `/browse/${section}` }
                ])
            );

            // Add pagination links if available
            if (data.pagination) {
                if (data.pagination.prevUrl) {
                    meta.links.push({ rel: 'prev', href: data.pagination.prevUrl });
                }
                if (data.pagination.nextUrl) {
                    meta.links.push({ rel: 'next', href: data.pagination.nextUrl });
                }
            }

            return {
                title: data.title,
                meta: {
                    basic: meta.basic,
                    opengraph: meta.opengraph,
                    twitter: meta.twitter,
                    custom: meta.custom
                },
                links: meta.links,
                structured: meta.structured,
                canonical: currentUrl
            };
        }
    }

    // Add basic meta tags
    meta.basic.push(
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { name: 'robots', content: data.robots || defaults.robots },
        { name: 'description', content: data.description || defaults.description }
    );

    // Add OpenGraph meta tags
    meta.opengraph.push(
        { property: 'og:title', content: data.title || defaults.title },
        { property: 'og:description', content: data.description || defaults.description },
        { property: 'og:url', content: data.url || defaults.url },
        { property: 'og:type', content: type === 'post' ? 'article' : 'website' },
        { property: 'og:site_name', content: SEO_CONFIG.site.name },
        { property: 'og:image', content: data.image || defaults.image },
        { property: 'og:image:width', content: SEO_CONFIG.branding.defaultImage.width },
        { property: 'og:image:height', content: SEO_CONFIG.branding.defaultImage.height },
        { property: 'og:locale', content: SEO_CONFIG.site.defaultLocale }
    );

    // Add Twitter meta tags
    meta.twitter.push(
        { name: 'twitter:card', content: SEO_CONFIG.social.twitter.card },
        { name: 'twitter:site', content: SEO_CONFIG.social.twitter.site },
        { name: 'twitter:title', content: data.title || defaults.title },
        { name: 'twitter:description', content: data.description || defaults.description },
        { name: 'twitter:image', content: data.image || defaults.image }
    );

    return {
        title: data.title || defaults.title,
        meta: {
            basic: meta.basic,
            opengraph: meta.opengraph,
            twitter: meta.twitter,
            custom: meta.custom
        },
        links: meta.links,
        structured: meta.structured,
        canonical: data.url || defaults.url
    };
};

module.exports = {
    SEO_CONFIG,
    generateMetaTags,
    truncateText
};