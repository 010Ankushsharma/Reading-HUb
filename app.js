/**
 * Web Reading Hub - Main Application
 * MongoDB Atlas + GridFS (Single Connection Version)
 */

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');

// Routes
const bookRoutes = require('./routes/books');
const shelfRoutes = require('./routes/shelves');

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// MongoDB Atlas Connection
// ================================

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully');
})
.catch((err) => {
    console.error('❌ MongoDB Atlas connection error:', err.message);
});

// Connection Monitoring
mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ Mongoose disconnected');
});

// ================================
// GridFS Setup (Using Same Connection)
// ================================

let gfs, gridfsBucket;

mongoose.connection.once('open', () => {
    gridfsBucket = new mongoose.mongo.GridFSBucket(
        mongoose.connection.db,
        { bucketName: 'uploads' }
    );

    gfs = gridfsBucket;
    console.log('✅ GridFS initialized successfully');
});

// ================================
// Multer + GridFS Storage
// ================================

const storage = new GridFsStorage({
    db: mongoose.connection,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) return reject(err);

                const filename =
                    buf.toString('hex') + path.extname(file.originalname);

                resolve({
                    filename: filename,
                    bucketName: 'uploads',
                    metadata: {
                        originalname: file.originalname,
                        uploadDate: new Date(),
                        contentType: file.mimetype,
                    },
                });
            });
        });
    },
});

// File Filter
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'pdfFile') {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    } else if (file.fieldname === 'coverImageFile') {
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
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Make available globally
app.locals.upload = upload;
app.locals.gfs = () => gfs;
app.locals.gridfsBucket = () => gridfsBucket;

// ================================
// Express Setup
// ================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Sessions
app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            'reading-hub-secret-key-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

app.use(flash());

// Global Variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.currentPath = req.path;
    next();
});

// ================================
// GridFS File Retrieval
// ================================

app.get('/files/:filename', async (req, res) => {
    try {
        if (!gfs) {
            return res
                .status(503)
                .json({ error: 'GridFS not initialized yet' });
        }

        const file = await mongoose.connection.db
            .collection('uploads.files')
            .findOne({ filename: req.params.filename });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.set(
            'Content-Type',
            file.metadata?.contentType || 'application/octet-stream'
        );

        const readStream =
            gridfsBucket.openDownloadStreamByName(req.params.filename);

        readStream.pipe(res);
    } catch (err) {
        console.error('Error retrieving file:', err);
        res.status(500).json({ error: 'Error retrieving file' });
    }
});

// ================================
// Routes
// ================================

app.use('/books', bookRoutes);
app.use('/shelves', shelfRoutes);

app.get('/', (req, res) => {
    res.redirect('/books');
});

// 404
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            req.flash(
                'error',
                'File size too large. Maximum size is 50MB.'
            );
            return res.redirect('back');
        }
    }

    req.flash('error', err.message || 'Something went wrong!');
    res.redirect('back');
});

// ================================
// Start Server
// ================================

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});