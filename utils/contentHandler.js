// utils/contentHandler.js
const sanitizeHtml = require('sanitize-html');

/**
 * Sanitizes content and converts URLs to clickable links
 */
function processContent(content) {
    // First sanitize the HTML (allow <a> tags with specific attributes)
    const sanitized = sanitizeHtml(content, {
        allowedTags: ['a'],
        allowedAttributes: {
            'a': ['href', 'rel', 'target', 'class']
        },
        disallowedTagsMode: 'recursiveEscape'
    });

    // Then convert URLs to links
    const urlRegex = /(?<!["'=])(https?:\/\/[^\s<>"']+)/g;

    return sanitized.replace(urlRegex, (url) =>
        `<a href="${url}" rel="nofollow" target="_blank" class="text-blue-600 hover:text-blue-800 underline break-words">${url}</a>`
    );
}

module.exports = { processContent };