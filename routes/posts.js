const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const Post = require("../models/Post");
const { generateMetaTags } = require("../utils/seo");
const { processContent, extractHashtags } = require("../utils/contentHandler");

// Helper function to create SEO-friendly slug
function createSlug(text) {
  console.log("[Slug] Creating slug for text:", text.substring(0, 30) + "...");
  const slug = text
    .substring(0, 50)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  console.log("[Slug] Generated slug:", slug);
  return slug;
}

// Helper function to ensure post has processed content
async function ensureProcessedContent(post) {
  if (!post.processedContent || !post.tags) {
    console.log("[Migration] Processing content for post:", post.uuid);
    const { processedContent, tags } = processContent(post.content);

    // Append any generated hashtags to original content
    const existingTags = new Set(extractHashtags(post.content));
    const tagsToAdd = tags.filter((tag) => !existingTags.has(tag));

    if (tagsToAdd.length > 0) {
      post.content =
        post.content.trim() +
        "\n\n" +
        tagsToAdd.map((tag) => `#${tag}`).join(" ");
    }

    post.processedContent = processedContent;
    post.tags = tags;

    try {
      await post.save();
      console.log("[Migration] Successfully updated post:", post.uuid);
    } catch (err) {
      console.error("[Migration] Error updating post:", post.uuid, err);
      // Still return processed content even if save fails
    }
  }
  return post;
}

// Home page route
router.get("/", async (req, res) => {
  console.log("[Route] GET / - Accessing home page");
  try {
    console.log("[DB] Fetching recent posts for home page");
    const recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "slug uuid content processedContent preview createdAt views qualityRating tags"
      );

    // Process any posts that need it
    const processedPosts = await Promise.all(
      recentPosts.map(ensureProcessedContent)
    );

    // Get some stats for the homepage
    const totalPosts = await Post.countDocuments();
    const totalViews = await Post.aggregate([
      { $group: { _id: null, total: { $sum: "$views" } } },
    ]);
    const stats = {
      posts: totalPosts,
      views: totalViews[0]?.total || 0,
    };

    console.log("[Route] Found recent posts:", processedPosts.length);

    const meta = generateMetaTags("home", {
      stats,
      recentPostsCount: processedPosts.length,
      url: "/",
    });

    res.render("home", {
      currentPage: "home",
      pageType: "home",
      pageData: {
        title: "Anonymous Shares - Share Your Thoughts Anonymously",
        description:
          "Share your thoughts, stories, and ideas anonymously with the world. A safe space for expression without identity.",
        recentPostsCount: processedPosts.length,
        stats,
      },
      recentPosts: processedPosts,
      meta,
    });
  } catch (err) {
    console.error("[Error] Home page error:", err);
    res.render("home", {
      currentPage: "home",
      pageType: "home",
      pageData: {
        title: "Anonymous Shares - Share Your Thoughts Anonymously",
        description:
          "Share your thoughts, stories, and ideas anonymously with the world.",
        recentPostsCount: 0,
      },
      recentPosts: [],
      meta: generateMetaTags("home", {
        error: true,
        url: "/",
      }),
    });
  }
});

// Submit new post
router.post("/share", async (req, res) => {
  console.log("[Route] POST /share - Creating new post");
  try {
    if (req.body.email) {
      return res.status(400).send("Bot detected.");
    }

    let content = req.body.content?.trim();
    console.log("[Route] Post content length:", content?.length || 0);

    if (!content) {
      console.warn("[Route] Empty content rejected");
      return res.status(400).json({ error: "Content cannot be empty" });
    }

    const { processedContent, tags } = processContent(content);

    // Append generated hashtags to content
    const existingTags = new Set(extractHashtags(content));
    const tagsToAdd = tags.filter((tag) => !existingTags.has(tag));

    if (tagsToAdd.length > 0) {
      content =
        content.trim() + "\n\n" + tagsToAdd.map((tag) => `#${tag}`).join(" ");
    }

    const uuid = uuidv4();
    const slug = createSlug(content);
    const qualityRating = rateContentQuality(content);

    console.log("[DB] Creating new post with UUID:", uuid);
    const post = new Post({
      uuid,
      slug,
      content,
      processedContent,
      preview: content.substring(0, 160),
      qualityRating,
      tags,
    });

    await post.save();
    console.log(
      "[Route] Post created successfully with URL: /%s-%s",
      slug,
      uuid
    );
    res.json({ url: `/${slug}-${uuid}` });
  } catch (err) {
    console.error("[Error] Post creation error:", err);
    res.status(500).json({ error: "Error creating post" });
  }
});

// Search routes for multiple URL patterns
router.get(
  ["/search/:query?", "/land/:query", "/tag/:query"],
  async (req, res) => {
    const searchQuery = req.params.query || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const searchType = req.path.split("/")[1];

    console.log(
      "[Route] GET %s/%s - Searching posts",
      searchType,
      searchQuery,
      {
        page,
        limit,
        type: searchType,
      }
    );

    try {
      let query = {};
      if (searchQuery) {
        const decodedQuery = decodeURIComponent(searchQuery);
        switch (searchType) {
          case "tag":
            query.tags = decodedQuery.toLowerCase();
            break;
          case "land":
            query.content = {
              $regex: `\\b${decodedQuery}\\b`,
              $options: "i",
            };
            break;
          default:
            query.content = {
              $regex: decodedQuery,
              $options: "i",
            };
        }
        console.log("[DB] Search query:", query);
      }

      const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(
          "slug uuid content processedContent preview createdAt views qualityRating tags"
        );

      // Process any posts that need it
      const processedPosts = await Promise.all(
        posts.map(ensureProcessedContent)
      );

      const total = await Post.countDocuments(query);
      console.log("[Route] Found total posts:", total);

      const totalPages = Math.ceil(total / limit);
      const baseUrl = `/${searchType}/${searchQuery}`;

      // Customize title and description based on search type
      let title, description;
      switch (searchType) {
        case "land":
          title = searchQuery
            ? `Land Posts about "${searchQuery}"`
            : "Browse Land Posts";
          description = searchQuery
            ? `Browse land-specific posts about "${searchQuery}". Found ${total} anonymous thoughts and stories.`
            : "Browse through land-specific anonymous thoughts and stories.";
          break;
        case "tag":
          title = searchQuery
            ? `Posts tagged with #${searchQuery}`
            : "Browse Tagged Posts";
          description = searchQuery
            ? `Browse posts tagged with #${searchQuery}. Found ${total} anonymous thoughts and stories.`
            : "Browse through tagged anonymous thoughts and stories.";
          break;
        default:
          title = searchQuery
            ? `Search Results for "${searchQuery}"`
            : "Search Anonymous Thoughts";
          description = searchQuery
            ? `Browse search results for "${searchQuery}". Found ${total} anonymous thoughts and stories.`
            : "Search through anonymous thoughts and stories shared by people worldwide.";
      }

      const meta = generateMetaTags(searchType, {
        query: searchQuery,
        page: page,
        total: total,
        pagination: {
          current: page,
          total: totalPages,
          prevUrl: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
          nextUrl: page < totalPages ? `${baseUrl}?page=${page + 1}` : null,
        },
        title,
        description,
        robots: "noindex, follow",
      });

      console.log(
        "[Route] Rendering search results with posts:",
        processedPosts.length
      );
      res.render("search", {
        currentPage: searchType,
        pageType: searchType,
        pageData: {
          query: searchQuery,
          page: page,
          total: total,
          title,
          description,
          searchType,
          pagination: {
            current: page,
            total: totalPages,
            prevUrl: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
            nextUrl: page < totalPages ? `${baseUrl}?page=${page + 1}` : null,
          },
        },
        search: searchQuery,
        posts: processedPosts,
        total,
        pagination: {
          current: page,
          total: totalPages,
          prevUrl: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
          nextUrl: page < totalPages ? `${baseUrl}?page=${page + 1}` : null,
        },
        meta,
      });
    } catch (err) {
      console.error("[Error] Search error:", err);
      res.status(500).render("error", {
        currentPage: "error",
        pageType: "error",
        pageData: {
          title: "Search Error",
          description: "An error occurred while searching posts.",
        },
        meta: generateMetaTags("error", {
          title: "Search Error | Anonymous Shares",
          description: "An error occurred while searching posts.",
          robots: "noindex, nofollow",
        }),
      });
    }
  }
);

// Browse/List route
router.get("/browse/:section?", async (req, res) => {
  const section = req.params.section || "latest";
  const search = req.query.q || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  console.log("[Route] GET /browse/%s - Listing posts", section, {
    page,
    search,
    limit,
  });

  if (search) {
    console.log("[Route] Redirecting to search route with query:", search);
    return res.redirect(`/search/${encodeURIComponent(search)}`);
  }

  try {
    let sortQuery = { createdAt: -1 };
    if (section === "popular") {
      sortQuery = { views: -1 };
      console.log("[DB] Sorting by popularity");
    }

    if (!["latest", "popular"].includes(section)) {
      console.warn("[Route] Invalid section requested:", section);
      return res.redirect("/browse/latest");
    }

    const posts = await Post.find()
      .sort(sortQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "slug uuid content processedContent preview createdAt views qualityRating tags"
      );

    // Process any posts that need it
    const processedPosts = await Promise.all(posts.map(ensureProcessedContent));

    const total = await Post.countDocuments();
    const totalPages = Math.ceil(total / limit);
    const baseUrl = `/browse/${section}`;

    const sectionTitle = section === "popular" ? "Most Popular" : "Latest";
    const pageTitle = page > 1 ? ` | Page ${page}` : "";
    const title = `${sectionTitle} Anonymous Thoughts${pageTitle}`;
    const description = `Browse ${
      section === "popular" ? "popular" : "recent"
    } anonymous thoughts and stories. Page ${page} of ${totalPages}.`;

    const meta = generateMetaTags("browse", {
      section,
      page,
      total,
      title,
      description,
      pagination: {
        current: page,
        total: totalPages,
        prevUrl: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
        nextUrl: page < totalPages ? `${baseUrl}?page=${page + 1}` : null,
      },
      url: `${baseUrl}${page > 1 ? `?page=${page}` : ""}`,
    });

    console.log(
      "[Route] Rendering list view with posts:",
      processedPosts.length
    );
    res.render("list", {
      currentPage: "browse",
      pageType: "browse",
      pageData: {
        title,
        description,
        section,
        total,
        currentPage: page,
        totalPages,
      },
      section,
      search: "",
      posts: processedPosts,
      pagination: {
        current: page,
        total: totalPages,
        prevUrl: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
        nextUrl: page < totalPages ? `${baseUrl}?page=${page + 1}` : null,
      },
      meta,
    });
  } catch (err) {
    console.error("[Error] Posts listing error:", err);
    res.status(500).render("error", {
      currentPage: "error",
      pageType: "error",
      pageData: {
        title: "Error Loading Posts",
        description: "An error occurred while loading the posts.",
      },
      meta: generateMetaTags("error", {
        title: "Error Loading Posts | Anonymous Shares",
        description: "An error occurred while loading the posts.",
        robots: "noindex, nofollow",
      }),
    });
  }
});

// API search endpoint
router.get("/api/search", async (req, res) => {
  const search = req.query.q || "";
  console.log("[Route] GET /api/search - Query:", search);

  try {
    console.log("[DB] Executing API search query");
    const posts = await Post.find({
      content: { $regex: search, $options: "i" },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "slug uuid content processedContent preview createdAt views qualityRating tags"
      );

    // Process any posts that need it
    const processedPosts = await Promise.all(posts.map(ensureProcessedContent));

    console.log("[Route] API search found results:", processedPosts.length);
    res.json(processedPosts);
  } catch (err) {
    console.error("[Error] API search error:", err);
    res.status(500).json({ error: "Error searching posts" });
  }
});

// GET /:slugId - View specific post
router.get("/:slugId", async (req, res) => {
  const slugId = req.params.slugId;
  console.log("[Route] GET /:slugId - Viewing post:", slugId);

  try {
    // Extract UUID - Look for the pattern after last hyphen with UUID format
    const uuidPattern =
      /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
    const uuidMatch = slugId.match(uuidPattern);

    if (!uuidMatch) {
      console.warn("[Route] Invalid UUID format in URL:", slugId);
      return res.status(404).render("404", {
        currentPage: "404",
        pageType: "404",
        meta: generateMetaTags("error", {
          title: "Post Not Found | Anonymous Shares",
          description: "The post you are looking for could not be found.",
          robots: "noindex, nofollow",
        }),
      });
    }

    const uuid = uuidMatch[0];
    console.log("[DB] Looking up post with UUID:", uuid);

    const post = await Post.findOne({ uuid }).select(
      "uuid slug content processedContent preview views qualityRating createdAt updatedAt tags"
    );

    if (!post) {
      console.warn("[Route] Post not found:", uuid);
      return res.status(404).render("404", {
        currentPage: "404",
        pageType: "404",
        meta: generateMetaTags("error", {
          title: "Post Not Found | Anonymous Shares",
          description: "The post you are looking for could not be found.",
          robots: "noindex, nofollow",
        }),
      });
    }

    // Ensure post has processed content and tags
    const processedPost = await ensureProcessedContent(post);

    // Check if post needs a quality rating
    if (
      typeof processedPost.qualityRating === "undefined" ||
      processedPost.qualityRating === null
    ) {
      console.log(
        "[Rating] Calculating missing quality rating for post:",
        uuid
      );
      processedPost.qualityRating = rateContentQuality(processedPost.content);
      await processedPost.save();
    }

    // Check for canonical URL
    const correctSlug = createSlug(processedPost.content);
    const correctUrl = `/${correctSlug}-${processedPost.uuid}`;
    if (req.path !== correctUrl) {
      console.log("[Route] Redirecting to canonical URL:", correctUrl);
      return res.redirect(301, correctUrl);
    }

    // Prepare preview if not exists
    if (!processedPost.preview) {
      processedPost.preview = processedPost.content.substring(0, 160);
    }

    // Fetch recent posts excluding current
    console.log("[DB] Fetching recent posts excluding current");
    const recentPosts = await Post.find({
      _id: { $ne: processedPost._id },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "slug uuid content processedContent preview createdAt views qualityRating tags"
      );

    // Process recent posts if needed
    const processedRecentPosts = await Promise.all(
      recentPosts.map(ensureProcessedContent)
    );

    // Increment views
    console.log("[DB] Incrementing view count for post:", uuid);
    processedPost.views += 1;
    await processedPost.save();

    // Calculate reading time and word count
    const wordsPerMinute = 200;
    const words = processedPost.content.trim().split(/\s+/);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);

    // Calculate content quality indicators
    const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
    const vocabularyDiversity = (uniqueWords / wordCount).toFixed(2);
    const sentenceCount = processedPost.content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0).length;
    const avgWordsPerSentence = (wordCount / sentenceCount).toFixed(1);

    // Get post creation date in various formats
    const createdDate = new Date(processedPost.createdAt);
    const formattedDate = createdDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate meta tags with enhanced data
    const meta = generateMetaTags("post", {
      post: {
        ...processedPost.toObject(),
        formattedDate,
      },
      readingTime,
      wordCount,
      contentMetrics: {
        vocabularyDiversity,
        avgWordsPerSentence,
        sentenceCount,
      },
      engagement: {
        views: processedPost.views,
        qualityRating: processedPost.qualityRating,
      },
    });

    console.log("[Route] Successfully preparing post view with SEO data");
    res.render("view", {
      currentPage: "view",
      pageType: "post",
      pageData: {
        content: processedPost.content,
        processedContent: processedPost.processedContent,
        slug: processedPost.slug,
        uuid: processedPost.uuid,
        createdAt: processedPost.createdAt,
        formattedDate,
        views: processedPost.views,
        qualityRating: processedPost.qualityRating,
        readingTime,
        wordCount,
        contentMetrics: {
          vocabularyDiversity,
          avgWordsPerSentence,
          sentenceCount,
        },
      },
      post: {
        ...processedPost.toObject(),
        readingTime,
        wordCount,
        formattedDate,
      },
      recentPosts: processedRecentPosts,
      meta,
    });
  } catch (err) {
    console.error("[Error] Post view error:", err);
    res.status(500).render("error", {
      currentPage: "error",
      pageType: "error",
      meta: generateMetaTags("error", {
        title: "Error Viewing Post | Anonymous Shares",
        description: "An error occurred while trying to view this post.",
        robots: "noindex, nofollow",
      }),
    });
  }
});

// Helper function to rate content quality (0-5)
function rateContentQuality(content) {
  console.log(
    "[Rating] Starting quality assessment for content:",
    content.substring(0, 30) + "..."
  );
  let score = 0;

  // Length check (0-1.5 points)
  console.log("[Rating] Content length:", content.length);
  if (content.length > 10) {
    score += 0.5;
    console.log("[Rating] +0.5 points for length > 10 chars");
  }
  if (content.length > 20) {
    score += 0.5;
    console.log("[Rating] +0.5 points for length > 20 chars");
  }
  if (content.length > 40) {
    score += 0.5;
    console.log("[Rating] +0.5 points for length > 40 chars");
  }
  console.log("[Rating] Length score subtotal:", score);

  // Sentence structure (0-1 points)
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  console.log("[Rating] Number of sentences:", sentences.length);
  if (sentences.length >= 2) {
    score += 0.5;
    console.log("[Rating] +0.5 points for having 2+ sentences");
  }

  const properCapitalization = sentences.every(
    (s) => s.trim()[0] === s.trim()[0].toUpperCase()
  );
  if (properCapitalization) {
    score += 0.5;
    console.log("[Rating] +0.5 points for proper capitalization");
  }
  console.log("[Rating] Structure score subtotal:", score);

  // Word variety (0-1 points)
  const words = content.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const varietyRatio = uniqueWords.size / words.length;
  const varietyScore = Math.min(1, varietyRatio * 2);
  score += varietyScore;
  console.log("[Rating] Word variety metrics:", {
    totalWords: words.length,
    uniqueWords: uniqueWords.size,
    ratio: varietyRatio.toFixed(2),
    score: varietyScore.toFixed(2),
  });
  console.log("[Rating] Variety score subtotal:", score);

  // Punctuation usage (0-1 points)
  const punctuation = (content.match(/[.,!?;:]/g) || []).length;
  const expectedPunctuation = content.length / 100;
  const punctuationScore = Math.min(1, punctuation / expectedPunctuation);
  score += punctuationScore;
  console.log("[Rating] Punctuation metrics:", {
    found: punctuation,
    expected: expectedPunctuation.toFixed(2),
    score: punctuationScore.toFixed(2),
  });
  console.log("[Rating] Punctuation score subtotal:", score);

  // Special characters and formatting (0-0.5 points)
  if (content.includes('"')) {
    score += 0.25;
    console.log("[Rating] +0.25 points for quotation marks");
  }
  if (content.includes(",")) {
    score += 0.25;
    console.log("[Rating] +0.25 points for commas");
  }

  // Round to nearest 0.5 and ensure range 0-5
  const finalScore = Math.max(0, Math.min(5, Math.round(score * 2) / 2));
  console.log("[Rating] Final score calculation:", {
    rawScore: score.toFixed(2),
    roundedScore: finalScore,
    breakdown: {
      length:
        content.length > 40
          ? 1.5
          : content.length > 20
          ? 1
          : content.length > 10
          ? 0.5
          : 0,
      structure:
        (sentences.length >= 2 ? 0.5 : 0) + (properCapitalization ? 0.5 : 0),
      variety: varietyScore,
      punctuation: punctuationScore,
      special:
        (content.includes('"') ? 0.25 : 0) + (content.includes(",") ? 0.25 : 0),
    },
  });

  return finalScore;
}

module.exports = router;
