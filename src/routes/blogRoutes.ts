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

// SPECIFIC ROUTES FIRST (before dynamic /:slug)

// GET /api/v1/blogs/all - Get ALL blogs without pagination
router.get('/all', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📚 Fetching ALL blogs without pagination');

    const blogs = await Blog.find({})
      .select('title excerpt author tags publishedAt createdAt readTime slug image published')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${blogs.length} total blogs`);

    res.json({
      status: 'success',
      data: {
        blogs,
        total: blogs.length,
        meta: {
          filter: 'all',
          sortBy: 'createdAt',
          sortOrder: 'desc',
          pagination: false
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching all blogs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch all blogs'
    });
  }
});

// TEMP - Simple blog creation without image upload
router.post('/simple', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🧪 SIMPLE ENDPOINT - No image upload');
    console.log('Request body:', req.body);

    const { title, content, author } = req.body;

    if (!title || !content || !author) {
      res.status(400).json({
        status: 'error',
        message: 'Title, content, and author are required'
      });
      return;
    }

    // Generate slug manually as backup
    const slug = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim()
      .replace(/^-+|-+$/g, '') || 'blog-post';

    const blog = new Blog({
      title,
      content,
      author,
      slug, // Explicitly set slug
      image: '', // No image
      excerpt: content ? content.substring(0, 200) + '...' : '',
      tags: [],
      published: false
    });

    const savedBlog = await blog.save();
    console.log('✅ Simple blog saved:', savedBlog._id);

    res.status(201).json({
      status: 'success',
      message: 'Simple blog created successfully',
      data: { blog: savedBlog }
    });
  } catch (error) {
    console.error('❌ Simple endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Simple blog creation failed',
      error: (error as Error).message
    });
  }
});

// TEST endpoint to debug issues
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🧪 TEST ENDPOINT - Received request');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    res.status(200).json({
      status: 'success',
      message: 'Test endpoint working',
      data: {
        body: req.body,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Test endpoint failed',
      error: (error as Error).message
    });
  }
});

// GET /api/v1/blogs - Get all blogs with pagination (before /:slug)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt((req.query as any).page as string) || 1;
    const limit = parseInt((req.query as any).limit as string) || 20; // Default 20 blogs per page
    const skip = (page - 1) * limit;
    
    // Query parameters
    const showAll = (req.query as any).all === 'true'; // ?all=true to show all blogs
    const publishedOnly = (req.query as any).published !== 'false'; // Default to published only
    
    // Build filter
    const filter: any = {};
    if (!showAll && publishedOnly) {
      filter.published = true;
    }

    console.log('📚 Fetching blogs with filter:', filter, 'Page:', page, 'Limit:', limit);

    const blogs = await Blog.find(filter)
      .select('title excerpt author tags publishedAt createdAt readTime slug image published') // Include image and all necessary fields
      .sort({ createdAt: -1 }) // Sort by creation date (newest first)
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    console.log(`✅ Found ${blogs.length} blogs (${total} total)`);

    res.json({
      status: 'success',
      data: {
        blogs,
        pagination: {
          currentPage: page,
          totalPages,
          totalBlogs: total,
          blogsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null
        },
        meta: {
          filter: showAll ? 'all' : 'published-only',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching blogs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch blogs'
    });
  }
});

// GET /api/v1/blogs/:slugOrId - Get single blog by slug OR ID (LAST - after all specific routes)
router.get('/:slugOrId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slugOrId } = req.params;
    const publishedOnly = (req.query as any).published !== 'false'; // Default to published only
    
    console.log(`🔍 Looking for blog with slugOrId: "${slugOrId}", publishedOnly: ${publishedOnly}`);

    // Determine if the parameter is an ObjectId or a slug
    const isObjectId = slugOrId && mongoose.Types.ObjectId.isValid(slugOrId) && slugOrId.length === 24;
    
    // Build filter based on whether it's ID or slug
    let filter: any = {};
    if (isObjectId) {
      filter._id = slugOrId;
      console.log(`📋 Searching by ID: ${slugOrId}`);
    } else {
      filter.slug = slugOrId;
      console.log(`🏷️ Searching by slug: ${slugOrId}`);
    }
    
    // Add published filter if needed
    if (publishedOnly) {
      filter.published = true;
    }

    const blog = await Blog.findOne(filter);

    if (!blog) {
      console.log(`❌ Blog not found with ${isObjectId ? 'ID' : 'slug'}: "${slugOrId}" and filter:`, filter);
      res.status(404).json({
        status: 'error',
        message: 'Blog not found',
        debug: {
          slugOrId,
          searchType: isObjectId ? 'ID' : 'slug',
          publishedOnly,
          filter
        }
      });
      return;
    }

    console.log(`✅ Blog found by ${isObjectId ? 'ID' : 'slug'}: "${blog.title}" (ID: ${blog._id})`);
    res.json({
      status: 'success',
      data: { blog }
    });
  } catch (error) {
    console.error('❌ Error fetching blog by slug/ID:', error);
    console.error('SlugOrId:', req.params.slugOrId);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch blog',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// POST /api/v1/blogs - Create new blog
router.post('/', upload.single('image'),blogValidation, async (req: Request, res: Response): Promise<void> => {
  // Add at the top of your POST route
try{
  console.log('🔧 Environment check:', {
  cloudinary_name: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing',
  cloudinary_key: process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing',
  cloudinary_secret: process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing',
  mongodb_uri: process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'
});
  
const errors = validationResult(req);
if (!errors.isEmpty()) {
  res.status(400).json({
    status: 'error',
    message: 'Validation failed',
    errors: errors.array()
  });
  return;
}

    const {title, content, author } = req.body;

    console.log('✅ Validation passed');
    console.log('🔄 Processing image...');

    let imageUrl = '';
    // Handle image upload if file is provided    
    if (req.file) {
      console.log(' File uploaded:', req.file.originalname);
      try{
        imageUrl = await uploadToCloudinary(req.file.buffer);
        console.log('✅Image uploaded to Cloudinary:', imageUrl);
      } catch (cloudinaryError) {
        console.error('❌Error uploading image to Cloudinary:', cloudinaryError);
        throw cloudinaryError;
      }
    }
    console.log(" Saving to database...");
    
    const blog = new Blog({
      title,
      content,
      author,
      image: imageUrl,
      excerpt: content ? content.substring(0,200) + '...' : '',
      tags: [],
      published: true
    });
    const savedBlog = await blog.save();
    console.log('✅ Blog saved:', savedBlog._id);

    res.status(201).json({
      status: 'success',
      message: 'Blog created successfully',
      data: { blog: savedBlog }
    });
  } catch (error) {
    console.error('Error creating blog:');
    console.error('Error name:', (error as Error).name);
    console.error('Error message:', (error as Error).message);
    console.error('Error stack:', (error as Error).stack);
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
      message: 'Failed to create blog',
      debug: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined  
    });
  }
});

// PUT /api/v1/blogs/:id - Update blog
router.put('/:id', upload.single('image'), blogValidation, async (req: Request, res: Response): Promise<void> => {
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
    
    // Safe tags parsing
    if (tags) {
      try {
        updateData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        console.log('Tags parsing failed, using empty array');
        updateData.tags = [];
      }
    }
    
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