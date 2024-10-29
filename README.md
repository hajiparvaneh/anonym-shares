# Anonymous Thoughts Sharing Platform

A simple web application that allows users to share their thoughts anonymously. Built with Node.js, Express, MongoDB, and Docker.

## Features

- 📝 Anonymous post creation
- 🔗 Unique URL for each post
- 📖 Paginated list of posts
- 🔍 Sort by latest or most viewed
- 🎨 Clean, responsive UI with Tailwind CSS
- 🐳 Docker support for multi-environment deployment
- 🔒 MongoDB authentication
- 🌍 Environment-specific configurations
- 💾 Persistent data storage
- 🏥 Health checks for all services

## Prerequisites

- Docker and Docker Compose
- Node.js 20.x (for local development)
- MongoDB (for local development)

## Environment Setup

The application supports three environments: development, staging, and production.

### Development Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd anonymous-thoughts
```

2. Create a `.env` file:

```env
NODE_ENV=development
PORT=3000
COMPOSE_PROJECT_NAME=anonymous-sharing-dev

# MongoDB Configuration
DB_NAME=anonymous-sharing
MONGO_USER=dev_user
MONGO_PASSWORD=dev_password
MONGODB_URI=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@db:27017/${DB_NAME}?authSource=admin

# Application Configuration
LOG_LEVEL=debug
```

3. Start the development environment:

```bash
docker compose up --build
```

### Staging Setup

1. Create `.env.staging`:

```env
NODE_ENV=staging
PORT=3001
COMPOSE_PROJECT_NAME=anonymous-sharing-staging
COMPOSE_FILE=docker-compose.staging.yml

# MongoDB Configuration
DB_NAME=anonymous-sharing-staging
MONGO_USER=staging_user
MONGO_PASSWORD=your_strong_staging_password
MONGODB_URI=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@db:27017/${DB_NAME}?authSource=admin

# Application Configuration
LOG_LEVEL=debug

# Resource Limits
MEMORY_LIMIT=512M
CPU_LIMIT=0.5
```

2. Start staging environment:

```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d
```

### Production Setup

1. Create `.env.production`:

```env
NODE_ENV=production
PORT=3002
COMPOSE_PROJECT_NAME=anonymous-sharing-prod
COMPOSE_FILE=docker-compose.production.yml

# MongoDB Configuration
DB_NAME=anonymous-sharing-prod
MONGO_USER=prod_user
MONGO_PASSWORD=your_very_strong_production_password
MONGODB_URI=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@db:27017/${DB_NAME}?authSource=admin&retryWrites=true&w=majority

# Application Configuration
LOG_LEVEL=error

# Resource Limits
MEMORY_LIMIT=1G
CPU_LIMIT=1
```

2. Start production environment:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

## Project Structure

```
anonymous-sharing/
├── config/
│   └── db.js           # Database configuration with environment support
├── models/
│   └── Post.js         # Post model definition
├── routes/
│   └── posts.js        # Route handlers
├── views/
│   ├── create.ejs      # Create post page
│   ├── view.ejs        # View single post
│   └── list.ejs        # List all posts
├── docker-compose.yml              # Development configuration
├── docker-compose.staging.yml      # Staging configuration
├── docker-compose.production.yml    # Production configuration
├── .env                # Development environment variables
├── .env.staging       # Staging environment variables
├── .env.production    # Production environment variables
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

### Development

```bash
# Start development environment
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Staging

```bash
# Start staging environment
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d

# View logs
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f

# Stop services
docker compose -f docker-compose.staging.yml --env-file .env.staging down
```

### Production

```bash
# Start production environment
docker compose -f docker-compose.production.yml --env-file .env.production up -d

# View logs
docker compose -f docker-compose.production.yml --env-file .env.production logs -f

# Stop services
docker compose -f docker-compose.production.yml --env-file .env.production down
```

## Health Checks

The application includes health checks for both the application and MongoDB:

- Application: `http://localhost:<PORT>/health`
  - Development: Port 3000
  - Staging: Port 3001
  - Production: Port 3002
- MongoDB: Internal health check every 10 seconds

## Resource Limits

### Development

- App: 0.5 CPU, 512MB RAM
- MongoDB: Default

### Staging

- App: 0.5 CPU, 512MB RAM
- MongoDB: Default with authentication

### Production

- App: 1 CPU, 1GB RAM
- MongoDB: Default with authentication and improved reliability

## Security Considerations

1. Environment Variables:

   - Use strong passwords in staging and production
   - Never commit .env files to version control
   - Rotate MongoDB credentials regularly
   - Use different ports for each environment to avoid conflicts

2. MongoDB Security:
   - Authentication enabled in all environments
   - Separate users for each environment
   - Different database names for each environment

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your own purposes.
