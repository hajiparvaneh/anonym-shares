// utils/contentHandler.js
const sanitizeHtml = require("sanitize-html");

// Common words to exclude from tag generation
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "the",
  "this",
  "but",
  "they",
  "have",
  "had",
  "what",
  "when",
  "where",
  "who",
  "which",
  "why",
  "how",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "can",
  "just",
  "should",
  "now",
  "i",
  "you",
  "your",
  "we",
  "my",
  "me",
  "her",
  "his",
  "their",
  "our",
  "im",
  "i'm",
  "ive",
  "i've",
  "id",
  "i'd",
  "ill",
  "i'll",
]);

/**
 * Generates tags from content based on word frequency
 * @param {string} content - The post content
 * @param {number} maxTags - Maximum number of tags to generate (default: 5)
 * @returns {string[]} Array of generated tags
 */
function generateTags(content) {
  // Remove URLs to avoid them being counted as words
  const contentWithoutUrls = content.replace(/https?:\/\/[^\s<>"']+/g, "");

  // Remove special characters and split into words
  const words = contentWithoutUrls
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 3 && // Ignore very short words
        !STOP_WORDS.has(word) && // Ignore common words
        !/^\d+$/.test(word) // Ignore numbers
    );

  // Count word frequency
  const wordCount = {};
  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Sort words by frequency and length (prefer longer words when frequencies are equal)
  const sortedWords = Object.entries(wordCount).sort(
    ([wordA, countA], [wordB, countB]) => {
      if (countA === countB) {
        return wordB.length - wordA.length; // Prefer longer words
      }
      return countB - countA; // Sort by frequency
    }
  );

  // Get top words (up to 5, but only if they appear more than once)
  const tags = sortedWords
    .filter(([_, count]) => count > 1) // Only include words that appear more than once
    .slice(0, 5)
    .map(([word]) => word);

  return tags;
}

/**
 * Sanitizes content and converts URLs to clickable links
 */
function processContent(content) {
  // Generate tags first
  const tags = generateTags(content);

  // First sanitize the HTML (allow <a> tags with specific attributes)
  const sanitized = sanitizeHtml(content, {
    allowedTags: ["a"],
    allowedAttributes: {
      a: ["href", "rel", "target", "class"],
    },
    disallowedTagsMode: "recursiveEscape",
  });

  // Convert URLs to links
  const urlRegex = /(?<!["'=])(https?:\/\/[^\s<>"']+)/g;
  const processedContent = sanitized.replace(
    urlRegex,
    (url) =>
      `<a href="${url}" rel="nofollow" target="_blank" class="text-blue-600 hover:text-blue-800 underline break-words">${url}</a>`
  );

  // Format tags with hash symbols and links
  const formattedTags = tags.map(
    (tag) =>
      `<a href="/tag/${tag}" class="inline-block bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#${tag}</a>`
  );

  return {
    processedContent,
    tags,
    formattedTags: formattedTags.join(" "),
  };
}

module.exports = { processContent, generateTags };
