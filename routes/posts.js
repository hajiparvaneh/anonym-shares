const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Post = require('../models/Post');

// Helper function to create SEO-friendly slug
function createSlug(text) {
    console.log('[Slug] Creating slug for text:', text.substring(0, 30) + '...');
    const slug = text
        .substring(0, 100)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    console.log('[Slug] Generated slug:', slug);
    return slug;
}

// Home page
router.get('/', async (req, res) => {
    console.log('[Route] GET / - Accessing home page');
    try {
        console.log('[DB] Fetching recent posts for home page');
        const recentPosts = await Post.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('slug uuid content preview createdAt views');

        console.log('[Route] Found recent posts:', recentPosts.length);
        res.render('home', {
            currentPage: 'home',
            recentPosts
        });
    } catch (err) {
        console.error('[Error] Home page error:', err);
        res.render('home', {
            currentPage: 'home',
            recentPosts: []
        });
    }
});

// Submit new post
router.post('/share', async (req, res) => {
    console.log('[Route] POST /share - Creating new post');
    try {
        const content = req.body.content?.trim();
        console.log('[Route] Post content length:', content?.length || 0);

        if (!content) {
            console.warn('[Route] Empty content rejected');
            return res.status(400).json({ error: 'Content cannot be empty' });
        }

        const uuid = uuidv4();
        const slug = createSlug(content);

        console.log('[DB] Creating new post with UUID:', uuid);
        const post = new Post({
            uuid,
            slug,
            content,
            preview: content.substring(0, 160)
        });

        await post.save();
        console.log('[Route] Post created successfully with URL: /%s-%s', slug, uuid);
        res.json({ url: `/${slug}-${uuid}` });
    } catch (err) {
        console.error('[Error] Post creation error:', err);
        res.status(500).json({ error: 'Error creating post' });
    }
});

// Posts listing - MOVED BEFORE INDIVIDUAL POST ROUTE
router.get('/browse/:section?', async (req, res) => {
    const section = req.params.section || 'latest';
    const search = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    console.log('[Route] GET /browse/%s - Listing posts', section, {
        page,
        search,
        limit
    });

    try {
        let query = {};
        if (search) {
            query.content = { $regex: search, $options: 'i' };
            console.log('[DB] Search query:', query);
        }

        let sortQuery = { createdAt: -1 };
        if (section === 'popular') {
            sortQuery = { views: -1 };
            console.log('[DB] Sorting by popularity');
        }

        console.log('[DB] Executing posts query with parameters:', {
            query,
            sort: sortQuery,
            page,
            limit
        });

        const posts = await Post.find(query)
            .sort(sortQuery)
            .skip((page - 1) * limit)
            .limit(limit)
            .select('slug uuid content preview createdAt views');

        const total = await Post.countDocuments(query);
        console.log('[Route] Found total posts:', total);

        const totalPages = Math.ceil(total / limit);
        const baseUrl = `/browse/${section}`;

        console.log('[Route] Rendering list view with posts:', posts.length);
        res.render('list', {
            section,
            search,
            posts,
            pagination: {
                current: page,
                total: totalPages,
                prevUrl: page > 1 ? `${baseUrl}?page=${page - 1}${search ? '&q=' + search : ''}` : null,
                nextUrl: page < totalPages ? `${baseUrl}?page=${page + 1}${search ? '&q=' + search : ''}` : null
            }
        });
    } catch (err) {
        console.error('[Error] Posts listing error:', err);
        res.status(500).render('error', {
            currentPage: 'error',
            error: 'Error loading posts'
        });
    }
});

// API search endpoint
router.get('/api/search', async (req, res) => {
    const search = req.query.q || '';
    console.log('[Route] GET /api/search - Query:', search);

    try {
        console.log('[DB] Executing API search query');
        const posts = await Post.find({
            content: { $regex: search, $options: 'i' }
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('slug uuid content preview createdAt');

        console.log('[Route] API search found results:', posts.length);
        res.json(posts);
    } catch (err) {
        console.error('[Error] API search error:', err);
        res.status(500).json({ error: 'Error searching posts' });
    }
});

// Fixed View specific post route
router.get('/:slugId', async (req, res) => {
    const slugId = req.params.slugId;
    console.log('[Route] GET /:slugId - Viewing post:', slugId);

    try {
        // Extract UUID - Look for the pattern after last hyphen with UUID format
        const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
        const uuidMatch = slugId.match(uuidPattern);

        if (!uuidMatch) {
            console.warn('[Route] Invalid UUID format in URL:', slugId);
            return res.status(404).render('404', {
                currentPage: '404'
            });
        }

        const uuid = uuidMatch[0];
        console.log('[DB] Looking up post with UUID:', uuid);

        const post = await Post.findOne({ uuid });
        if (!post) {
            console.warn('[Route] Post not found:', uuid);
            return res.status(404).render('404', {
                currentPage: '404'
            });
        }

        // Check for canonical URL
        const correctUrl = `/${post.slug}-${post.uuid}`;
        if (req.path !== correctUrl) {
            console.log('[Route] Redirecting to canonical URL:', correctUrl);
            return res.redirect(301, correctUrl);
        }

        console.log('[DB] Fetching recent posts excluding current');
        const recentPosts = await Post.find({
            _id: { $ne: post._id }
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('slug uuid content preview createdAt views');

        // Increment views
        console.log('[DB] Incrementing view count for post:', uuid);
        post.views += 1;
        await post.save();

        console.log('[Route] Successfully rendered post view');
        res.render('view', {
            currentPage: 'view',
            post,
            recentPosts
        });
    } catch (err) {
        console.error('[Error] Post view error:', err);
        res.status(500).render('error', {
            currentPage: 'error'
        });
    }
});

module.exports = router;