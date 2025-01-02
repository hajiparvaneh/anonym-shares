const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const Post = require("../models/Post");
const { generateMetaTags } = require("../utils/seo");

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

// Home page route
router.get("/", async (req, res) => {
  console.log("[Route] GET / - Accessing home page");
  try {
    console.log("[DB] Fetching recent posts for home page");
    const recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("slug uuid content preview createdAt views qualityRating");

    // Get some stats for the homepage
    const totalPosts = await Post.countDocuments();
    const totalViews = await Post.aggregate([
      { $group: { _id: null, total: { $sum: "$views" } } },
    ]);
    const stats = {
      posts: totalPosts,
      views: totalViews[0]?.total || 0,
    };

    console.log("[Route] Found recent posts:", recentPosts.length);

    // Generate meta tags for home page
    const meta = generateMetaTags("home", {
      stats,
      recentPostsCount: recentPosts.length,
      url: "/",
      // You can add more dynamic data here if needed
    });

    res.render("home", {
      currentPage: "home",
      pageType: "home",
      pageData: {
        title: "Anonymous Shares - Share Your Thoughts Anonymously",
        description:
          "Share your thoughts, stories, and ideas anonymously with the world. A safe space for expression without identity.",
        recentPostsCount: recentPosts.length,
        stats,
      },
      recentPosts,
      meta, // Add meta object to the template
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
      // If the email field is filled, treat it as a bot.
      return res.status(400).send("Bot detected.");
    }
    const content = req.body.content?.trim();
    console.log("[Route] Post content length:", content?.length || 0);

    if (!content) {
      console.warn("[Route] Empty content rejected");
      return res.status(400).json({ error: "Content cannot be empty" });
    }

    const uuid = uuidv4();
    const slug = createSlug(content);
    const qualityRating = rateContentQuality(content);

    console.log("[DB] Creating new post with UUID:", uuid);
    const post = new Post({
      uuid,
      slug,
      content,
      preview: content.substring(0, 160),
      qualityRating,
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

// Helper function to rate content quality (0-5)
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

// In posts.js - Update the search route handler

// Search routes for multiple URL patterns
router.get(
  ["/search/:query?", "/land/:query", "/tag/:query"],
  async (req, res) => {
    const searchQuery = req.params.query || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const searchType = req.path.split("/")[1]; // Gets 'search', 'land', or 'tag'

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
        // Customize query based on search type
        switch (searchType) {
          case "land":
            // Add specific query for land-based searches
            query.content = {
              $regex: `\\b${decodedQuery}\\b`,
              $options: "i",
            };
            break;
          case "tag":
            // Add specific query for tag-based searches
            query.content = {
              $regex: `#${decodedQuery}\\b`,
              $options: "i",
            };
            break;
          default: // 'search'
            // Default search behavior
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
        .select("slug uuid content preview createdAt views qualityRating");

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

      // Generate meta tags for search page
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
        robots: "noindex, follow", // Best practice for search pages
      });

      console.log("[Route] Rendering search results with posts:", posts.length);
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
        posts,
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
      .select("slug uuid content preview createdAt views qualityRating");

    const total = await Post.countDocuments();
    const totalPages = Math.ceil(total / limit);
    const baseUrl = `/browse/${section}`;

    // Prepare title and description based on section
    const sectionTitle = section === "popular" ? "Most Popular" : "Latest";
    const pageTitle = page > 1 ? ` | Page ${page}` : "";
    const title = `${sectionTitle} Anonymous Thoughts${pageTitle}`;
    const description = `Browse ${
      section === "popular" ? "popular" : "recent"
    } anonymous thoughts and stories. Page ${page} of ${totalPages}.`;

    // Generate meta tags for browse page
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

    console.log("[Route] Rendering list view with posts:", posts.length);
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
      posts,
      pagination: {
        current: page,
        total: totalPages,
        prevUrl: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
        nextUrl: page < totalPages ? `${baseUrl}?page=${page + 1}` : null,
      },
      meta, // Add meta object to the template
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
      .select("slug uuid content preview createdAt views qualityRating");

    console.log("[Route] API search found results:", posts.length);
    res.json(posts);
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

    // Fetch the post with select fields
    const post = await Post.findOne({ uuid }).select(
      "uuid slug content preview views qualityRating createdAt updatedAt"
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

    // Check if post needs a quality rating
    if (
      typeof post.qualityRating === "undefined" ||
      post.qualityRating === null
    ) {
      console.log(
        "[Rating] Calculating missing quality rating for post:",
        uuid
      );
      post.qualityRating = rateContentQuality(post.content);
      await post.save();
    }

    // Check for canonical URL
    const correctSlug = createSlug(post.content);
    const correctUrl = `/${correctSlug}-${post.uuid}`;
    if (req.path !== correctUrl) {
      console.log("[Route] Redirecting to canonical URL:", correctUrl);
      return res.redirect(301, correctUrl);
    }

    // Prepare preview if not exists
    if (!post.preview) {
      post.preview = post.content.substring(0, 160);
    }

    // Fetch recent posts excluding current
    console.log("[DB] Fetching recent posts excluding current");
    const recentPosts = await Post.find({
      _id: { $ne: post._id },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("slug uuid content preview createdAt views qualityRating");

    // Increment views
    console.log("[DB] Incrementing view count for post:", uuid);
    post.views += 1;
    await post.save();

    // Calculate reading time and word count
    const wordsPerMinute = 200;
    const words = post.content.trim().split(/\s+/);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);

    // Calculate content quality indicators
    const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
    const vocabularyDiversity = (uniqueWords / wordCount).toFixed(2);
    const sentenceCount = post.content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0).length;
    const avgWordsPerSentence = (wordCount / sentenceCount).toFixed(1);

    // Get post creation date in various formats
    const createdDate = new Date(post.createdAt);
    const formattedDate = createdDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate meta tags with enhanced data
    const meta = generateMetaTags("post", {
      post: {
        ...post.toObject(),
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
        views: post.views,
        qualityRating: post.qualityRating,
      },
    });

    console.log("[Route] Successfully preparing post view with SEO data");
    res.render("view", {
      currentPage: "view",
      pageType: "post",
      pageData: {
        content: post.content,
        slug: post.slug,
        uuid: post.uuid,
        createdAt: post.createdAt,
        formattedDate,
        views: post.views,
        qualityRating: post.qualityRating,
        readingTime,
        wordCount,
        contentMetrics: {
          vocabularyDiversity,
          avgWordsPerSentence,
          sentenceCount,
        },
      },
      post: {
        ...post.toObject(),
        readingTime,
        wordCount,
        formattedDate,
      },
      recentPosts,
      meta, // Contains all SEO meta tags, structured data, and social sharing info
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

module.exports = router;
