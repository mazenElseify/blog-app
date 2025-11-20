import mongoose, { Document, Schema } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  content: string;
  author: string;
  tags: string[];
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  slug: string;
  excerpt?: string;
  readTime?: number;
  image?: string;
}

const blogSchema = new Schema<IBlog>({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  image: {
    type: String,
    required: false // Make it optional
  },
  content: {
    type: String,
    required: [true, 'Blog content is required'],
    minlength: [10, 'Content must be at least 10 characters long']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  published: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date,
    default: null
  },
  slug: {
    type: String,
    required: false, // Let middleware handle this
    unique: true,
    trim: true,
    lowercase: true
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  readTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create indexes
blogSchema.index({ slug: 1 });
blogSchema.index({ published: 1, publishedAt: -1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ author: 1 });

// Pre-save middleware to generate slug and calculate read time
blogSchema.pre('save', function(next) {
  // Always generate slug for new documents or when title changes
  if (this.isNew || this.isModified('title') || !this.slug) {
    // Create slug from title
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    
    // Remove any leading/trailing dashes
    baseSlug = baseSlug.replace(/^-+|-+$/g, '');
    
    // Ensure slug is not empty
    if (!baseSlug) {
      baseSlug = 'blog-post';
    }
    
    this.slug = baseSlug;
  }

  // Calculate read time
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
  }

  // Set published date
  if (this.published && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

export const Blog = mongoose.model<IBlog>('Blog', blogSchema);