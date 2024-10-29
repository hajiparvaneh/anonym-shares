const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const postRoutes = require('./routes/posts');

const app = express();

// Connect Database
connectDB();

// View engine setup
app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.use('/', postRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));