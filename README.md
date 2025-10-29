# Blog App

A TypeScript-based blog application built with Express.js, MongoDB, and modern development tools.

## Features

- 📝 Create, read, update, and delete blog posts
- 🔐 User authentication with JWT
- 🏷️ Tagging system for blog posts
- 📱 RESTful API design
- 🔍 Blog search and filtering
- ⚡ TypeScript for type safety
- 🛡️ Security middleware (Helmet, CORS)
- 📊 Request logging with Morgan
- ✅ Input validation with express-validator
- 🧪 Testing setup with Jest

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Testing**: Jest
- **Linting**: ESLint
- **Security**: Helmet, bcryptjs
- **Development**: ts-node-dev for hot reloading

## Project Structure

```
blog-app/
├── src/
│   ├── config/
│   │   └── database.ts          # Database connection configuration
│   ├── middleware/
│   │   └── errorHandler.ts      # Global error handling middleware
│   ├── models/
│   │   └── Blog.ts              # Blog data model
│   ├── routes/
│   │   ├── authRoutes.ts        # Authentication routes
│   │   └── blogRoutes.ts        # Blog CRUD routes
│   └── index.ts                 # Application entry point
├── dist/                        # Compiled JavaScript files
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── .eslintrc.json              # ESLint configuration
├── jest.config.js              # Jest testing configuration
├── package.json                # Project dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── README.md                   # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or remote)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blog-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/blog-app
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system

5. **Run the application**
   
   For development (with hot reloading):
   ```bash
   npm run dev
   ```
   
   For production:
   ```bash
   npm run build
   npm start
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build the TypeScript code
- `npm start` - Start the production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user info (requires token)

### Blogs
- `GET /api/v1/blogs` - Get all published blogs (with pagination)
- `GET /api/v1/blogs/:slug` - Get single blog by slug
- `POST /api/v1/blogs` - Create new blog
- `PUT /api/v1/blogs/:id` - Update blog
- `DELETE /api/v1/blogs/:id` - Delete blog

### Health Check
- `GET /health` - API health status

## Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create a new blog post
```bash
curl -X POST http://localhost:3000/api/v1/blogs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Blog Post",
    "content": "This is the content of my first blog post. It contains useful information about TypeScript development.",
    "author": "John Doe",
    "tags": ["typescript", "nodejs", "programming"],
    "published": true
  }'
```

### Get all published blogs
```bash
curl http://localhost:3000/api/v1/blogs?page=1&limit=10
```

## Testing

Run tests with:
```bash
npm test
```

For test coverage:
```bash
npm run test -- --coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Support

If you have any questions or run into issues, please open an issue on GitHub.