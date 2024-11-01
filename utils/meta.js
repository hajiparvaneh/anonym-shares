// utils/meta.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const DEFAULT_META = {
    siteName: 'Anonymous Shares',
    title: 'Anonymous Shares',
    description: 'Share your thoughts anonymously with the world.',
    type: 'website',
    image: `${BASE_URL}/og-image.png` // If you have one
};

const getMetaData = (page, customMeta = {}) => {
    const meta = { ...DEFAULT_META };

    switch (page) {
        case 'home':
            meta.title = 'Share Your Thoughts Anonymously';
            meta.description = 'Share your thoughts, stories, and ideas anonymously with the world. No registration required.';
            meta.canonical = BASE_URL;
            break;

        case 'posts':
            meta.title = customMeta.title || 'Browse Anonymous Shares';
            meta.description = customMeta.description || 'Read anonymous thoughts shared by people from around the world.';
            meta.canonical = customMeta.canonical || `${BASE_URL}/browse`;
            break;

        case 'view':
            // For single post view, use custom meta
            meta.title = customMeta.title || 'Anonymous Shares';
            meta.description = customMeta.description;
            meta.canonical = customMeta.canonical;
            meta.type = 'article';
            meta.published = customMeta.published;
            break;

        case '404':
            meta.title = 'Page Not Found';
            meta.description = 'The page you are looking for could not be found.';
            meta.canonical = null; // No canonical for 404
            break;

        case 'error':
            meta.title = 'Error';
            meta.description = 'An error occurred while processing your request.';
            meta.canonical = null; // No canonical for error
            break;
    }

    // Ensure title format consistency
    if (!meta.title.includes(DEFAULT_META.siteName)) {
        meta.title = `${meta.title} | ${DEFAULT_META.siteName}`;
    }

    return meta;
};

module.exports = {
    getMetaData,
    BASE_URL
};