# Anonymous Thoughts Sharing Web Platform

A simple web application that allows users to share their thoughts anonymously. Built with Node.js, Express, MongoDB, and Docker.

## 🌍 Live Demos
- **Production:** [www.anonymshares.com](https://www.anonymshares.com)
- **Staging:** [stage1001.anonymshares.com](https://stage1001.anonymshares.com)

## Features

- 📝 Anonymous post creation
- 🔗 Unique URL for each post
- 📚 Paginated list of posts
- 🔍 Sort by latest or most viewed
- 🎨 Clean, responsive UI with Tailwind CSS
- 🐫 Docker support for multi-environment deployment
- 🔒 MongoDB authentication
- 🌍 Environment-specific configurations (staging & production)
- 💿 Persistent data storage
- 🏥 Health checks for all services

---

## 🚀 Quick Start
### **1️⃣ Clone the Repository**
```bash
git clone https://github.com/hajiparvaneh/anonym-shares.git
cd anonym-shares
```

### **2️⃣ Setup Environment Variables**
Secrets are managed in **GitHub Actions** and injected automatically.

For running **staging** or **production** locally in Docker, set a temporary MongoDB username and password in `.env.staging` and `.env.production`, but **do not commit them**.

Example:
```env
MONGO_USER=temp_user
MONGO_PASSWORD=temp_password
```

### **3️⃣ Start the Application**
```bash
docker compose up --build
```
For **staging or production**, use:
```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```
---

## 🔒 GitHub Secrets
Before deploying, **add these secrets to your GitHub repository**:

| Secret Name             | Description |
|-------------------------|------------|
| `GH_PAT`               | GitHub Personal Access Token |
| `STAGING_HOST`         | Staging server host |
| `STAGING_USERNAME`     | SSH username for staging |
| `STAGING_SSH_KEY`      | SSH private key for staging |
| `STAGING_MONGO_USER`   | Staging database username |
| `STAGING_MONGO_PASSWORD` | Staging database password |
| `STAGING_MONGODB_URI`  | Full MongoDB connection URI for staging |
| `PROD_HOST`            | Production server host |
| `PROD_USERNAME`        | SSH username for production |
| `PROD_SSH_KEY`         | SSH private key for production |
| `PROD_MONGO_USER`      | Production database username |
| `PROD_MONGO_PASSWORD`  | Production database password |
| `PROD_MONGODB_URI`     | Full MongoDB connection URI for production |

---

## 🏰 Project Structure
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
├── docker-compose.yml               # Development configuration
├── docker-compose.staging.yml       # Staging configuration
├── docker-compose.production.yml     # Production configuration
├── .env.staging                      # Staging (no secrets, managed in GH Actions)
├── .env.production                    # Production (no secrets, managed in GH Actions)
└── server.js          # Application entry point
```
---

## API Endpoints

- `GET /` - Home page with recent posts
- `POST /share` - Submit a new anonymous post
- `GET /search/:query?` - Search for posts
- `GET /land/:query` - Search posts related to land (like tag)
- `GET /tag/:query` - Search posts by tag
- `GET /browse/:section?` - Browse posts (`latest` or `popular`)
- `GET /api/search?q=<query>` - API endpoint for searching posts
- `GET /:slugId` - View a specific post

---

## 🏥 Health Checks

The application includes health checks for both the application and MongoDB:

- Application: `http://localhost:<PORT>/health`
  - Development: Port `3000`
  - Staging: Port `3001`
  - Production: Port `3002`
- MongoDB: Internal health check every 10 seconds

---

## 🛠 Docker Commands

### **Development**
```bash
# Start development environment
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### **Staging**
```bash
# Start staging environment
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d

# View logs
docker compose -f docker-compose.staging.yml --env-file .env.staging logs -f

# Stop services
docker compose -f docker-compose.staging.yml --env-file .env.staging down
```

### **Production**
```bash
# Start production environment
docker compose -f docker-compose.production.yml --env-file .env.production up -d

# View logs
docker compose -f docker-compose.production.yml --env-file .env.production logs -f

# Stop services
docker compose -f docker-compose.production.yml --env-file .env.production down
```

---

## ⚠️ Security Best Practices

- **Secrets should only be set via GitHub Secrets.**  
- **Never commit `.env` files with sensitive data.**  
- **Use different credentials for staging and production.**  
- **Enable MongoDB authentication in all environments.**  
- **Rotate credentials periodically.**

---

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

---

## 📞 License
MIT License - feel free to use this project for your own purposes.

---
