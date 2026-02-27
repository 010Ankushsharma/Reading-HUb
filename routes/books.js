/**
 * Book Routes
 * Handles all CRUD operations for books with GridFS storage
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Shelf = require('../models/Shelf');

// Get GridFS bucket from app locals
const getGfs = (req) => req.app.locals.gridfsBucket();
const getGfsFiles = async (req, filename) => {
    const conn = mongoose.connection;
    return await conn.db.collection('uploads.files').findOne({ filename });
};

// File filter to accept only PDFs and images
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

// Validation rules
const bookValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('author')
        .trim()
        .notEmpty().withMessage('Author is required')
        .isLength({ max: 100 }).withMessage('Author name cannot exceed 100 characters'),
    body('description')
        .trim()
        .optional()
        .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
    body('genre')
        .trim()
        .optional()
        .isLength({ max: 50 }).withMessage('Genre cannot exceed 50 characters'),
    body('coverImage')
        .trim()
        .optional()
        .isURL().withMessage('Cover image must be a valid URL')
];

/**
 * GET /books - List all books with pagination and search
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        let query = {};
        
        // Search functionality
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { author: { $regex: search, $options: 'i' } },
                    { genre: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Get total count for pagination
        const totalBooks = await Book.countDocuments(query);
        const totalPages = Math.ceil(totalBooks / limit);

        // Get books with pagination
        const books = await Book.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('books/index', {
            title: search ? `Search: ${search}` : 'All Books',
            books,
            currentPage: page,
            totalPages,
            totalBooks,
            limit,
            search,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        });
    } catch (err) {
        console.error('Error fetching books:', err);
        req.flash('error', 'Failed to load books. Please try again.');
        res.render('books/index', {
            title: 'All Books',
            books: [],
            currentPage: 1,
            totalPages: 0,
            totalBooks: 0,
            limit: 12,
            search: '',
            hasNextPage: false,
            hasPrevPage: false,
            nextPage: 2,
            prevPage: 0
        });
    }
});

/**
 * GET /books/new - Show form to add new book
 */
router.get('/new', async (req, res) => {
    try {
        const shelves = await Shelf.find().sort({ name: 1 });
        res.render('books/new', {
            title: 'Add New Book',
            book: null,
            shelves,
            errors: []
        });
    } catch (err) {
        console.error('Error fetching shelves:', err);
        res.render('books/new', {
            title: 'Add New Book',
            book: null,
            shelves: [],
            errors: []
        });
    }
});

/**
 * POST /books - Create new book
 */
router.post('/', 
    (req, res, next) => {
        const upload = req.app.locals.upload;
        upload.fields([
            { name: 'pdfFile', maxCount: 1 },
            { name: 'coverImageFile', maxCount: 1 }
        ])(req, res, next);
    },
    bookValidation,
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const shelves = await Shelf.find().sort({ name: 1 });
                return res.render('books/new', {
                    title: 'Add New Book',
                    book: req.body,
                    shelves,
                    errors: errors.array()
                });
            }

            // Check if PDF file was uploaded
            if (!req.files || !req.files.pdfFile) {
                const shelves = await Shelf.find().sort({ name: 1 });
                return res.render('books/new', {
                    title: 'Add New Book',
                    book: req.body,
                    shelves,
                    errors: [{ msg: 'PDF file is required' }]
                });
            }

            // Create new book
            const bookData = {
                title: req.body.title,
                author: req.body.author,
                description: req.body.description,
                genre: req.body.genre,
                pdfFile: req.files.pdfFile[0].filename,
                shelf: req.body.shelf || null
            };

            // Handle cover image (URL or uploaded file)
            if (req.files.coverImageFile && req.files.coverImageFile[0]) {
                bookData.coverImage = req.files.coverImageFile[0].filename;
            } else if (req.body.coverImage) {
                bookData.coverImage = req.body.coverImage;
            }

            const book = new Book(bookData);
            await book.save();

            req.flash('success', 'Book added successfully!');
            res.redirect('/books');
        } catch (err) {
            console.error('Error creating book:', err);
            req.flash('error', 'Failed to add book. Please try again.');
            res.redirect('/books/new');
        }
    }
);

/**
 * GET /books/:id - Show single book details
 */
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        
        if (!book) {
            req.flash('error', 'Book not found');
            return res.redirect('/books');
        }

        res.render('books/show', {
            title: book.title,
            book
        });
    } catch (err) {
        console.error('Error fetching book:', err);
        req.flash('error', 'Failed to load book details.');
        res.redirect('/books');
    }
});

/**
 * GET /books/:id/edit - Show edit form
 */
router.get('/:id/edit', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        const shelves = await Shelf.find().sort({ name: 1 });
        
        if (!book) {
            req.flash('error', 'Book not found');
            return res.redirect('/books');
        }

        res.render('books/edit', {
            title: `Edit: ${book.title}`,
            book,
            shelves,
            errors: []
        });
    } catch (err) {
        console.error('Error fetching book for edit:', err);
        req.flash('error', 'Failed to load book for editing.');
        res.redirect('/books');
    }
});

/**
 * PUT /books/:id - Update book
 */
router.put('/:id',
    (req, res, next) => {
        const upload = req.app.locals.upload;
        upload.fields([
            { name: 'pdfFile', maxCount: 1 },
            { name: 'coverImageFile', maxCount: 1 }
        ])(req, res, next);
    },
    bookValidation,
    async (req, res) => {
        try {
            const book = await Book.findById(req.params.id);
            
            if (!book) {
                req.flash('error', 'Book not found');
                return res.redirect('/books');
            }

            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const shelves = await Shelf.find().sort({ name: 1 });
                return res.render('books/edit', {
                    title: `Edit: ${book.title}`,
                    book: { ...book.toObject(), ...req.body },
                    shelves,
                    errors: errors.array()
                });
            }

            // Update book data
            book.title = req.body.title;
            book.author = req.body.author;
            book.description = req.body.description;
            book.genre = req.body.genre;
            book.shelf = req.body.shelf || null;

            // Handle cover image update
            if (req.files.coverImageFile && req.files.coverImageFile[0]) {
                // Delete old cover from GridFS if exists
                if (book.coverImage && !book.coverImage.startsWith('http')) {
                    try {
                        const oldFile = await getGfsFiles(req, book.coverImage);
                        if (oldFile) {
                            await getGfs(req).delete(oldFile._id);
                        }
                    } catch (err) {
                        console.error('Error deleting old cover:', err);
                    }
                }
                book.coverImage = req.files.coverImageFile[0].filename;
            } else if (req.body.coverImage) {
                book.coverImage = req.body.coverImage;
            }

            // Handle PDF file update
            if (req.files.pdfFile && req.files.pdfFile[0]) {
                // Delete old PDF from GridFS
                try {
                    const oldFile = await getGfsFiles(req, book.pdfFile);
                    if (oldFile) {
                        await getGfs(req).delete(oldFile._id);
                    }
                } catch (err) {
                    console.error('Error deleting old PDF:', err);
                }
                book.pdfFile = req.files.pdfFile[0].filename;
            }

            await book.save();

            req.flash('success', 'Book updated successfully!');
            res.redirect(`/books/${book._id}`);
        } catch (err) {
            console.error('Error updating book:', err);
            req.flash('error', 'Failed to update book. Please try again.');
            res.redirect(`/books/${req.params.id}/edit`);
        }
    }
);

/**
 * DELETE /books/:id - Delete book
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check delete password
        const deletePassword = req.body.deletePassword;
        if (deletePassword !== process.env.DELETE_PASSWORD) {
            req.flash('error', 'Invalid delete password. Book was not deleted.');
            return res.redirect('back');
        }

        const book = await Book.findById(req.params.id);
        
        if (!book) {
            req.flash('error', 'Book not found');
            return res.redirect('/books');
        }

        // Delete associated PDF file from GridFS
        try {
            const pdfFile = await getGfsFiles(req, book.pdfFile);
            if (pdfFile) {
                await getGfs(req).delete(pdfFile._id);
            }
        } catch (err) {
            console.error('Error deleting PDF from GridFS:', err);
        }

        // Delete associated cover image from GridFS if it's not a URL
        if (book.coverImage && !book.coverImage.startsWith('http')) {
            try {
                const coverFile = await getGfsFiles(req, book.coverImage);
                if (coverFile) {
                    await getGfs(req).delete(coverFile._id);
                }
            } catch (err) {
                console.error('Error deleting cover from GridFS:', err);
            }
        }

        // Delete book from database
        await Book.findByIdAndDelete(req.params.id);

        req.flash('success', 'Book deleted successfully!');
        res.redirect('/books');
    } catch (err) {
        console.error('Error deleting book:', err);
        req.flash('error', 'Failed to delete book. Please try again.');
        res.redirect('/books');
    }
});

/**
 * GET /books/:id/download - Download PDF
 */
router.get('/:id/download', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        
        if (!book) {
            req.flash('error', 'Book not found');
            return res.redirect('/books');
        }

        // Increment download count
        book.downloadCount += 1;
        await book.save();

        // Get file from GridFS
        const file = await getGfsFiles(req, book.pdfFile);
        
        if (!file) {
            req.flash('error', 'PDF file not found');
            return res.redirect(`/books/${book._id}`);
        }

        // Set headers for download
        res.set('Content-Type', file.metadata.contentType || 'application/pdf');
        res.set('Content-Disposition', `attachment; filename="${book.title}.pdf"`);
        
        // Create read stream and pipe to response
        const readStream = getGfs(req).openDownloadStreamByName(book.pdfFile);
        readStream.pipe(res);
    } catch (err) {
        console.error('Error downloading book:', err);
        req.flash('error', 'Failed to download book.');
        res.redirect('/books');
    }
});

module.exports = router;
