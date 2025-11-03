import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Blog, IBlog } from '../models/Blog';

const router = express.Router();

// Validation middleware
const blogValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters long'),
  body('author')
    .notEmpty()
    .withMessage('Author is required'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('published')
    .optional()
    .isBoolean()
    .withMessage('Published must be a boolean')
];

// GET /api/v1/blogs - Get all published blogs
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ published: true })
      .select('title excerpt author tags publishedAt readTime slug')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments({ published: true });
    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      data: {
        blogs,
        pagination: {
          currentPage: page,
          totalPages,
          totalBlogs: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch blogs'
    });
  }
});

// GET /api/v1/blogs/:slug - Get single blog by slug
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const blog = await Blog.findOne({ 
      slug: req.params.slug, 
      published: true 
    });

    if (!blog) {
      res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
      return;
    }

    res.json({
      status: 'success',
      data: { blog }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch blog'
    });
  }
});

// POST /api/v1/blogs - Create new blog
router.post('/', blogValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const blogData = req.body;
    
    // Generate excerpt if not provided
    if (!blogData.excerpt && blogData.content) {
      blogData.excerpt = blogData.content.substring(0, 200) + '...';
    }

    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json({
      status: 'success',
      message: 'Blog created successfully',
      data: { blog }
    });
  } catch (error) {
    if ((error as any).code === 11000) {
      res.status(400).json({
        status: 'error',
        message: 'A blog with this title already exists'
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create blog'
    });
  }
});

// PUT /api/v1/blogs/:id - Update blog
router.put('/:id', blogValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!blog) {
      res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Blog updated successfully',
      data: { blog }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update blog'
    });
  }
});

// DELETE /api/v1/blogs/:id - Delete blog
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);

    if (!blog) {
      res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete blog'
    });
  }
});

export default router;