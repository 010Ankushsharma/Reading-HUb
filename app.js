/**
 * Web Reading Hub - Main Application
 * A full-stack application for managing and reading books
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const fs = require('fs');

// Import routes
const bookRoutes = require('./routes/books');
const shelfRoutes = require('./routes/shelves');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Create unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

// File filter to accept only PDFs and images
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'pdfFile') {
        // Accept only PDF files
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    } else if (file.fieldname === 'coverImage') {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for cover!'), false);
        }
    } else {
        cb(null, true);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit for PDFs
    }
});

// Make upload middleware available to routes
app.locals.upload = upload;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/reading-hub')
    .then(() => {
        console.log('Connected to MongoDB successfully');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.json()); // Parse JSON data
app.use(methodOverride('_method')); // Enable PUT and DELETE via forms
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// Session middleware (required for flash messages)
app.use(session({
    secret: process.env.SESSION_SECRET || 'reading-hub-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Flash messages middleware
app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.currentPath = req.path;
    next();
});

// Routes
app.use('/books', bookRoutes);
app.use('/shelves', shelfRoutes);

// Home route - redirect to books
app.get('/', (req, res) => {
    res.redirect('/books');
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Handle Multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            req.flash('error', 'File size too large. Maximum size is 50MB.');
            return res.redirect('back');
        }
    }
    
    req.flash('error', err.message || 'Something went wrong!');
    res.redirect('back');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
