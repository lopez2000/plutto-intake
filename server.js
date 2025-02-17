// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const routes = require('./routes');

const app = express();

// Serve static files (CSS, images) from "public" folder
app.use(express.static('public'));

// Middleware for form & JSON parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Mount routes
app.use('/', routes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});