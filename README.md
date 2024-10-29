# Anonymous Thoughts Sharing Platform

A simple web application that allows users to share their thoughts anonymously. Built with Node.js, Express, MongoDB, and Docker.

## Features

- 📝 Anonymous post creation
- 🔗 Unique URL for each post
- 📖 Paginated list of posts
- 🔍 Sort by latest or most viewed
- 🎨 Clean, responsive UI with Tailwind CSS
- 🐳 Docker support for easy deployment

## Prerequisites

- Docker and Docker Compose
- Node.js 20.x (for local development)
- MongoDB (for local development)

## Quick Start with Docker

1. Clone the repository:

```bash
git clone <repository-url>
cd anonymous-thoughts
```

2. Start the application using Docker Compose:

```bash
docker-compose up --build
```

3. Access the application at `http://localhost:3000`

## Local Development Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```bash
MONGODB_URI=mongodb://localhost:27017/anonymous-sharing
PORT=3000
```

3. Start MongoDB locally (if not using Docker)

4. Run the development server:

```bash
npm run dev
```

## Project Structure

```
anonymous-sharing/
├── config/
│   └── db.js           # Database configuration
├── models/
│   └── Post.js         # Post model definition
├── routes/
│   └── posts.js        # Route handlers
├── views/
│   ├── create.ejs      # Create post page
│   ├── view.ejs        # View single post
│   └── list.ejs        # List all posts
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker services configuration
└── server.js          # Application entry point
```

## API Endpoints

- `GET /` - Home page with post creation form
- `POST /post` - Create a new post
- `GET /view/:uuid` - View a specific post
- `GET /list` - List all posts with pagination
  - Query params:
    - `page`: Page number (default: 1)
    - `sort`: 'latest' or 'views' (default: 'latest')
    - `search`: Search term (optional)

## Docker Commands

```bash
# Start containers
docker-compose up

# Start containers in background
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up --build
```

## Development Commands

```bash
# Start development server with nodemon
npm run dev

# Start production server
npm start
```

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your own purposes.
