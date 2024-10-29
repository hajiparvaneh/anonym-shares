const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Post = require('../models/Post');

// Home page - Create new post form
router.get('/', (req, res) => {
    res.render('create');
});

// Submit new post
router.post('/post', async (req, res) => {
    try {
        if (!req.body.content || req.body.content.trim().length === 0) {
            return res.status(400).json({ error: 'Content cannot be empty' });
        }

        const uuid = uuidv4();
        const post = new Post({
            uuid,
            content: req.body.content.trim()
        });

        await post.save();
        res.json({ url: `/view/${uuid}` });
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).json({ error: 'Error creating post' });
    }
});

// View specific post
router.get('/view/:uuid', async (req, res) => {
    try {
        const post = await Post.findOne({ uuid: req.params.uuid });
        if (!post) {
            return res.status(404).render('view', {
                error: 'Post not found',
                post: null
            });
        }

        // Increment views
        post.views += 1;
        await post.save();

        res.render('view', { post });
    } catch (err) {
        console.error('Error viewing post:', err);
        res.status(500).render('view', {
            error: 'Error loading post',
            post: null
        });
    }
});

// List all posts with pagination and sorting
router.get('/list', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const sort = req.query.sort || 'latest';
        const search = req.query.search || '';

        // Build query
        let query = {};
        if (search) {
            query.content = { $regex: search, $options: 'i' };
        }

        // Build sort options
        let sortQuery = {};
        if (sort === 'latest') sortQuery = { createdAt: -1 };
        if (sort === 'views') sortQuery = { views: -1 };

        // Execute query with pagination
        const posts = await Post.find(query)
            .sort(sortQuery)
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Post.countDocuments(query);

        res.render('list', {
            posts,
            currentPage: page,
            pages: Math.ceil(total / limit),
            sort,
            search
        });
    } catch (err) {
        console.error('Error listing posts:', err);
        res.status(500).render('list', {
            error: 'Error loading posts',
            posts: [],
            currentPage: 1,
            pages: 0,
            sort: 'latest',
            search: ''
        });
    }
});

// API endpoint for searching posts
router.get('/api/search', async (req, res) => {
    try {
        const search = req.query.q || '';
        const posts = await Post.find({
            content: { $regex: search, $options: 'i' }
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('uuid content createdAt');

        res.json(posts);
    } catch (err) {
        console.error('Error searching posts:', err);
        res.status(500).json({ error: 'Error searching posts' });
    }
});

module.exports = router;