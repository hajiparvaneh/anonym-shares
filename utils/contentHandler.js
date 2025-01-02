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
 * Extracts hashtags from content
 * @param {string} content - The post content
 * @returns {string[]} Array of hashtags found in content
 */
function extractHashtags(content) {
  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex) || [];
  return matches.map((tag) => tag.slice(1).toLowerCase()); // Remove # and convert to lowercase
}

/**
 * Generates tags from content based on word frequency
 * @param {string} content - The post content
 * @param {string[]} existingTags - Tags already found in content
 * @returns {string[]} Array of generated tags
 */
function generateTags(content, existingTags) {
  // Remove URLs and existing hashtags to avoid counting them
  const contentWithoutUrls = content
    .replace(/https?:\/\/[^\s<>"']+/g, "")
    .replace(/#\w+/g, "");

  // Remove special characters and split into words
  const words = contentWithoutUrls
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 3 && // Ignore very short words
        !STOP_WORDS.has(word) && // Ignore common words
        !existingTags.includes(word) && // Ignore words that are already hashtags
        !/^\d+$/.test(word) // Ignore numbers
    );

  // Count word frequency
  const wordCount = {};
  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Sort words by frequency and length
  const sortedWords = Object.entries(wordCount).sort(
    ([wordA, countA], [wordB, countB]) => {
      if (countA === countB) {
        return wordB.length - wordA.length;
      }
      return countB - countA;
    }
  );

  // Get top words (up to 5 minus the number of existing hashtags)
  const remainingTagsNeeded = Math.max(0, 5 - existingTags.length);
  const generatedTags = sortedWords
    .filter(([_, count]) => count > 1)
    .slice(0, remainingTagsNeeded)
    .map(([word]) => word);

  return generatedTags;
}

/**
 * Creates a formatted tag link
 * @param {string} tag - The tag text without #
 * @returns {string} Formatted HTML for the tag link
 */
function formatTagLink(tag) {
  return `<a href="/tag/${tag}" class="inline-block bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#${tag}</a>`;
}

/**
 * Processes content by converting hashtags to links
 * @param {string} content - The content to process
 * @returns {string} Processed content with hashtag links
 */
function processHashtags(content) {
  return content.replace(/#(\w+)/g, (match, tag) => {
    const lowercaseTag = tag.toLowerCase();
    return formatTagLink(lowercaseTag);
  });
}

/**
 * Sanitizes content and converts URLs and hashtags to clickable links
 */
function processContent(content) {
  // Extract existing hashtags first
  const existingTags = extractHashtags(content);

  // Generate additional tags if needed
  const generatedTags = generateTags(content, existingTags);

  // Combine all tags (existing + generated)
  const allTags = [...new Set([...existingTags, ...generatedTags])];

  // First sanitize the HTML
  const sanitized = sanitizeHtml(content, {
    allowedTags: ["a"],
    allowedAttributes: {
      a: ["href", "rel", "target", "class"],
    },
    disallowedTagsMode: "recursiveEscape",
  });

  // Convert URLs to links
  const urlRegex = /(?<!["'=])(https?:\/\/[^\s<>"']+)/g;
  let processedContent = sanitized.replace(
    urlRegex,
    (url) =>
      `<a href="${url}" rel="nofollow" target="_blank" class="text-blue-600 hover:text-blue-800 underline break-words">${url}</a>`
  );

  // Convert hashtags to links in the content
  processedContent = processHashtags(processedContent);

  // Format all tags for the tag section
  const formattedTags = allTags.map(formatTagLink).join(" ");

  return {
    processedContent,
    tags: allTags,
    formattedTags,
  };
}

module.exports = { processContent, generateTags };
