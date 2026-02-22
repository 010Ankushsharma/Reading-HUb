/**
 * Book Routes
 * Handles all CRUD operations for books
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const Book = require('../models/Book');
const Shelf = require('../models/Shelf');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'pdfFile') {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    } else if (file.fieldname === 'coverImage') {
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
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

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
    upload.fields([
        { name: 'pdfFile', maxCount: 1 },
        { name: 'coverImageFile', maxCount: 1 }
    ]),
    bookValidation,
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                // Clean up uploaded files if validation fails
                if (req.files) {
                    Object.values(req.files).forEach(fileArray => {
                        fileArray.forEach(file => {
                            fs.unlink(file.path, (err) => {
                                if (err) console.error('Error deleting file:', err);
                            });
                        });
                    });
                }
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
                bookData.coverImage = '/uploads/' + req.files.coverImageFile[0].filename;
            } else if (req.body.coverImage) {
                bookData.coverImage = req.body.coverImage;
            }

            const book = new Book(bookData);
            await book.save();

            req.flash('success', 'Book added successfully!');
            res.redirect('/books');
        } catch (err) {
            console.error('Error creating book:', err);
            
            // Clean up uploaded files on error
            if (req.files) {
                Object.values(req.files).forEach(fileArray => {
                    fileArray.forEach(file => {
                        fs.unlink(file.path, (err) => {
                            if (err) console.error('Error deleting file:', err);
                        });
                    });
                });
            }
            
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
    upload.fields([
        { name: 'pdfFile', maxCount: 1 },
        { name: 'coverImageFile', maxCount: 1 }
    ]),
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
                // Clean up uploaded files if validation fails
                if (req.files) {
                    Object.values(req.files).forEach(fileArray => {
                        fileArray.forEach(file => {
                            fs.unlink(file.path, (err) => {
                                if (err) console.error('Error deleting file:', err);
                            });
                        });
                    });
                }
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
                // Delete old cover if it was an uploaded file
                if (book.coverImage && book.coverImage.startsWith('/uploads/')) {
                    const oldCoverPath = path.join(__dirname, '..', book.coverImage);
                    fs.unlink(oldCoverPath, (err) => {
                        if (err) console.error('Error deleting old cover:', err);
                    });
                }
                book.coverImage = '/uploads/' + req.files.coverImageFile[0].filename;
            } else if (req.body.coverImage) {
                book.coverImage = req.body.coverImage;
            }

            // Handle PDF file update
            if (req.files.pdfFile && req.files.pdfFile[0]) {
                // Delete old PDF
                const oldPdfPath = path.join(__dirname, '..', 'uploads', book.pdfFile);
                fs.unlink(oldPdfPath, (err) => {
                    if (err) console.error('Error deleting old PDF:', err);
                });
                book.pdfFile = req.files.pdfFile[0].filename;
            }

            await book.save();

            req.flash('success', 'Book updated successfully!');
            res.redirect(`/books/${book._id}`);
        } catch (err) {
            console.error('Error updating book:', err);
            
            // Clean up uploaded files on error
            if (req.files) {
                Object.values(req.files).forEach(fileArray => {
                    fileArray.forEach(file => {
                        fs.unlink(file.path, (err) => {
                            if (err) console.error('Error deleting file:', err);
                        });
                    });
                });
            }
            
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
        const book = await Book.findById(req.params.id);
        
        if (!book) {
            req.flash('error', 'Book not found');
            return res.redirect('/books');
        }

        // Delete associated PDF file
        const pdfPath = path.join(__dirname, '..', 'uploads', book.pdfFile);
        fs.unlink(pdfPath, (err) => {
            if (err) console.error('Error deleting PDF file:', err);
        });

        // Delete associated cover image if it was uploaded
        if (book.coverImage && book.coverImage.startsWith('/uploads/')) {
            const coverPath = path.join(__dirname, '..', book.coverImage);
            fs.unlink(coverPath, (err) => {
                if (err) console.error('Error deleting cover image:', err);
            });
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

        const pdfPath = path.join(__dirname, '..', 'uploads', book.pdfFile);
        
        // Check if file exists
        if (!fs.existsSync(pdfPath)) {
            req.flash('error', 'PDF file not found');
            return res.redirect(`/books/${book._id}`);
        }

        // Send file for download
        res.download(pdfPath, `${book.title}.pdf`, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                req.flash('error', 'Failed to download file');
            }
        });
    } catch (err) {
        console.error('Error downloading book:', err);
        req.flash('error', 'Failed to download book.');
        res.redirect('/books');
    }
});

module.exports = router;
