// imports the necessary modules/libraries/middleware/models
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Post = require('../models/post');
const User = require('../models/user');
const router = express.Router();


// This section checks if a post expired or not
function isExpired(post) {
  return post.expiresAt <= new Date();
}

// This part calculates the time left
function timeLeftSeconds(post) {
  const diffMs = post.expiresAt - new Date();
  return diffMs > 0 ? Math.floor(diffMs / 1000) : 0;
}


// GET /api/posts/test
router.get('/test', (req, res) => {
  res.json({ message: 'Posts routes working' });
});

// GET /api/posts?topic=Tech
// Returns all non-expired "Live" posts, optionally filtered by topic
router.get('/', async (req, res) => {
  try {
    const { topic } = req.query;      // e.g. ?topic=Tech
    const now = new Date();

    // Base query: only live posts that haven't expired yet
    const query = {
      status: 'Live',
      expiresAt: { $gt: now },
    };

    // If a topic query is provided, filter by it
    if (topic) {
      // topics is an array, so check if it contains the topic
      query.topics = { $in: [topic] };
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });

    return res.json({ posts });
  } catch (err) {
    console.error('Fetch posts error:', err);
    return res.status(500).json({ message: 'Server error fetching posts' });
  }
});

// GET /api/posts/expired?topic=Sports
// Returns expired posts, optionally filtered by topic
router.get('/expired', async (req, res) => {
  try {
    const { topic } = req.query;
    const now = new Date();

    const query = {
      status: 'Expired',
      expiresAt: { $lte: now },
    };

    if (topic) {
      query.topics = { $in: [topic] };
    }

    const posts = await Post.find(query).sort({ expiresAt: -1 });

    return res.json({ posts });
  } catch (err) {
    console.error('Get expired posts error:', err);
    return res.status(500).json({ message: 'Server error fetching expired posts' });
  }
});




// Creates a post (Action: user posts a message)
// Body: { title, body, topics: ["Tech"], expiresInMinutes: 5 }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, body, topics, expiresInMinutes } = req.body;

    if (!title || !body || !topics || !Array.isArray(topics) || topics.length === 0) {
      return res
        .status(400)
        .json({ message: 'Title, body and at least one topic are required' });
    }
    //This part sets the expiration to a default of 5mins if not provided
    const minutes = Number(expiresInMinutes) || 5;
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    // Finds the user creating the post (their name)
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const post = await Post.create({
      title,
      body,
      topics,
      owner: user._id,
      ownerName: user.name,
      expiresAt,
    });

    res.status(201).json({ message: 'Post created', post });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ message: 'Server error creating post' });
  }
});


//  Browse all active posts in a topic
// GET /api/posts/topic/:topic
router.get('/topic/:topic', authMiddleware, async (req, res) => {
  try {
    const topic = req.params.topic;

    const posts = await Post.find({
      topics: topic,
      expiresAt: { $gt: new Date() }, // only live posts
    }).sort({ createdAt: 1 });

    res.json({
      topic,
      count: posts.length,
      posts: posts.map((p) => ({
        id: p._id,
        title: p.title,
        body: p.body,
        ownerName: p.ownerName,
        status: isExpired(p) ? 'Expired' : 'Live',
        likes: p.likes.length,
        dislikes: p.dislikes.length,
        comments: p.comments.length,
        timeLeftSeconds: timeLeftSeconds(p),
      })),
    });
  } catch (err) {
    console.error('Browse topic error:', err);
    res.status(500).json({ message: 'Server error browsing posts' });
  }
});

// GET /api/posts/top-interest?topic=Tech
// Returns the active post with the highest "interest" in a topic
router.get('/top-interest', authMiddleware, async (req, res) => {
  try {
    const { topic } = req.query;
    const now = new Date();

    // Only active, non-expired posts
    const query = {
      status: 'Live',
      expiresAt: { $gt: now },
    };

    // If a topic is provided, filter by that topic
    if (topic) {
      query.topics = { $in: [topic] };
    }

    const posts = await Post.find(query);

    // No matching posts → clean 404 instead of 500
    if (!posts.length) {
      return res.status(404).json({
        message: 'No active posts found for this topic',
        topic: topic || null,
      });
    }

    // Compute "interest": likes + dislikes (+ comments as extra signal)
    const scoredPosts = posts.map((post) => {
      const likes = Array.isArray(post.likes) ? post.likes.length : 0;
      const dislikes = Array.isArray(post.dislikes) ? post.dislikes.length : 0;
      const comments = Array.isArray(post.comments) ? post.comments.length : 0;

      return {
        post,
        // spec says "likes and dislikes"; comments included as extra weight
        interest: likes + dislikes + comments,
      };
    });

    // Picks the post with the highest interest score
    const top = scoredPosts.reduce(
      (max, current) => (current.interest > max.interest ? current : max),
      scoredPosts[0]
    );

    return res.status(200).json({
      message: 'Top interest post found',
      topic: topic || null,
      interestScore: top.interest,
      post: top.post,
    });
  } catch (err) {
    console.error('top-interest error:', err);
    return res.status(500).json({ message: 'Server error getting post' });
  }
});


// Gets a single post with details
// GET /api/posts/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    res.json({
      post,
      timeLeftSeconds: timeLeftSeconds(post),
      status: isExpired(post) ? 'Expired' : 'Live',
    });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ message: 'Server error getting post' });
  }
});


//Like a post
// POST /api/posts/:id/like
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (isExpired(post)) {
      return res.status(400).json({ message: 'Post is expired; cannot like' });
    }

    if (post.owner.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Post owner cannot like their own post' });
    }

    // removes any existing dislike from this user
    post.dislikes = post.dislikes.filter(
      (d) => d.user.toString() !== req.user.userId
    );

    //Checks if already liked
    const alreadyLiked = post.likes.some(
      (l) => l.user.toString() === req.user.userId
    );
    if (!alreadyLiked) {
      const user = await User.findById(req.user.userId);
      post.likes.push({ user: user._id, name: user.name });
    }

    await post.save();

    res.json({
      message: 'Like registered',
      likes: post.likes.length,
      dislikes: post.dislikes.length,
    });
  } catch (err) {
    console.error('Like post error:', err);
    res.status(500).json({ message: 'Server error liking post' });
  }
});

// Dislike a post
// POST /api/posts/:id/dislike
router.post('/:id/dislike', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (isExpired(post)) {
      return res.status(400).json({ message: 'Post is expired; cannot dislike' });
    }

    if (post.owner.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Post owner cannot dislike their own post' });
    }

    // removes any existing like from this user
    post.likes = post.likes.filter(
      (l) => l.user.toString() !== req.user.userId
    );

    const alreadyDisliked = post.dislikes.some(
      (d) => d.user.toString() === req.user.userId
    );
    if (!alreadyDisliked) {
      const user = await User.findById(req.user.userId);
      post.dislikes.push({ user: user._id, name: user.name });
    }

    await post.save();

    res.json({
      message: 'Dislike registered',
      likes: post.likes.length,
      dislikes: post.dislikes.length,
    });
  } catch (err) {
    console.error('Dislike post error:', err);
    res.status(500).json({ message: 'Server error disliking post' });
  }
});


// Comment on a post
// POST /api/posts/:id/comments
// Body: { text }
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // optional: block comments on expired posts
    if (isExpired(post)) {
      return res
        .status(400)
        .json({ message: 'Post is expired; cannot comment' });
    }

    const user = await User.findById(req.user.userId);

    post.comments.push({
      user: user._id,
      name: user.name,
      text,
    });

    await post.save();

    return res.status(201).json({
      message: 'Comment added',
      comments: post.comments,
    });
  } catch (err) {
    console.error('Comment error:', err);
    return res
      .status(500)
      .json({ message: 'Server error adding comment' });
  }
});


module.exports = router;
