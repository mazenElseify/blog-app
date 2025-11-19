import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Blog, IBlog } from '../models/Blog';
import { upload, uploadToCloudinary} from '../middleware/uploadMiddleware';

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
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt((req.query as any).page as string) || 1;
    const limit = parseInt((req.query as any).limit as string) || 10;
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
router.post('/', upload.single('image'),blogValidation, async (req: Request, res: Response): Promise<void> => {
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

    const {title, content, author, tags, published } = req.body;
    let imageUrl = '';
    // Handle image upload if file is provided    
    if (req.file) {
      console.log(' File uploaded:', req.file.originalname);
      try{
        imageUrl = await uploadToCloudinary(req.file.buffer);
        console.log('Image uploaded to Cloudinary:', imageUrl);
      } catch (uploadError) {
        console.error('Error uploading image to Cloudinary:', uploadError);
        throw new Error(' Image upload failed');
      }
    }
    
    // Generate excerpt if not provided
    const excerpt = req.body.excerpt || (content ? content.substring(0, 200) + '...' : 'No excerpt available');

    let parsedTags = [];
    let parsedPublished = false;
    try {
      parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];
    } catch (e) {
      console.log('Tags parsing failed, using empty array');
      parsedTags = [];
    }
    try {
      parsedPublished = published ? (typeof published === 'string' ? JSON.parse(published) : published) : false;
    } catch (e) {
      console.log('published parsed failed, using false');
      parsedPublished = false;
    }

      



    const blog = new Blog({
      title,
      content,
      author,
      image: imageUrl,
      excerpt,
      tags: parsedTags,
      published: parsedPublished
    });
    const savedBlog = await blog.save();

    res.status(201).json({
      status: 'success',
      message: 'Blog created successfully',
      data: { blog: savedBlog }
    });
  } catch (error) {
    console.error('Error creating blog:');
    console.error('Error message:', (error as Error).message);
    console.error('Error stack:', (error as Error).message);
    console.log('Request body:', req.body);
    console.log('Request file:' , req.file ? {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'No file uploaded');

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
router.put('/:id', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
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

    const { id } = req.params;
    
    // Check if ID exists
    if (!id) {
      res.status(400).json({
        status: 'error',
        message: 'Blog ID is required'
      });
      return;
    }
    
    // Enhanced ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(id) || id.length !== 24) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid blog ID format'
      });
      return;
    }

    const { title, content, author, tags, published, excerpt } = req.body;
    const updateData: any = { title, content, author };

    if (excerpt) updateData.excerpt = excerpt;
    if (tags) updateData.tags = JSON.parse(tags);
    if (published !== undefined) updateData.published = typeof published === 'string' ? JSON.parse(published) : published;

    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.buffer);
      updateData.image = imageUrl;
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      updateData,
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
    console.error('Error updating blog:', {
      error: error instanceof Error ? error.message : error,
      blogId: req.params.id
    });
    
    // Handle specific Mongoose CastError
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({
        status: 'error',
        message: 'Invalid blog ID format'
      });
      return;
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update blog',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    });
  }
});

// DELETE /api/v1/blogs/:id - Delete blog
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if ID exists
    if (!id) {
      res.status(400).json({
        status: 'error',
        message: 'Blog ID is required'
      });
      return;
    }
    
    // Enhanced ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(id) || id.length !== 24) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid blog ID format'
      });
      return;
    }

    console.log(`Attempting to delete blog with ID: ${id}`);
    
    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      console.log(`Blog not found with ID: ${id}`);
      res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
      return;
    }

    console.log(`Blog deleted successfully: ${blog.title} (ID: ${id})`);
    res.json({
      status: 'success',
      message: 'Blog deleted successfully',
      data: {
        deletedBlog: {
          id: blog._id,
          title: blog.title
        }
      }
    });
  } catch (error) {
    console.error('Error deleting blog:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      blogId: req.params.id
    });
    
    // Handle specific Mongoose CastError
    if (error instanceof Error && error.name === 'CastError') {
      res.status(400).json({
        status: 'error',
        message: 'Invalid blog ID format'
      });
      return;
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete blog',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    });
  }
});

export default router;