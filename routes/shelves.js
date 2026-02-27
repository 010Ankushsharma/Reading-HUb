/**
 * Shelf Routes
 * Handles all CRUD operations for shelves/collections
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Shelf = require('../models/Shelf');
const Book = require('../models/Book');

// Validation rules
const shelfValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Shelf name is required')
        .isLength({ max: 100 }).withMessage('Shelf name cannot exceed 100 characters'),
    body('description')
        .trim()
        .optional()
        .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('color')
        .trim()
        .optional()
        .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Please enter a valid hex color code'),
    body('icon')
        .trim()
        .optional()
        .isIn(['book', 'books', 'bookmark', 'heart', 'star', 'folder', 'archive', 'graduation-cap', 'university', 'library'])
        .withMessage('Invalid icon selection')
];

/**
 * GET /shelves - List all shelves
 */
router.get('/', async (req, res) => {
    try {
        const shelves = await Shelf.find().sort({ createdAt: -1 });
        
        // Update book counts for each shelf
        for (let shelf of shelves) {
            shelf.bookCount = await Book.countDocuments({ shelf: shelf._id });
        }
        
        res.render('shelves/index', {
            title: 'My Shelves',
            shelves
        });
    } catch (err) {
        console.error('Error fetching shelves:', err);
        req.flash('error', 'Failed to load shelves. Please try again.');
        res.render('shelves/index', {
            title: 'My Shelves',
            shelves: []
        });
    }
});

/**
 * GET /shelves/new - Show form to create new shelf
 */
router.get('/new', (req, res) => {
    res.render('shelves/new', {
        title: 'Create New Shelf',
        shelf: null,
        errors: []
    });
});

/**
 * POST /shelves - Create new shelf
 */
router.post('/', shelfValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('shelves/new', {
                title: 'Create New Shelf',
                shelf: req.body,
                errors: errors.array()
            });
        }

        const shelf = new Shelf({
            name: req.body.name,
            description: req.body.description,
            color: req.body.color || '#6366f1',
            icon: req.body.icon || 'book'
        });

        await shelf.save();
        req.flash('success', 'Shelf created successfully!');
        res.redirect('/shelves');
    } catch (err) {
        console.error('Error creating shelf:', err);
        req.flash('error', 'Failed to create shelf. Please try again.');
        res.redirect('/shelves/new');
    }
});

/**
 * GET /shelves/:id - Show single shelf with books
 */
router.get('/:id', async (req, res) => {
    try {
        const shelf = await Shelf.findById(req.params.id);
        
        if (!shelf) {
            req.flash('error', 'Shelf not found');
            return res.redirect('/shelves');
        }

        // Get all books in this shelf
        const books = await Book.find({ shelf: shelf._id }).sort({ createdAt: -1 });
        
        // Update book count
        shelf.bookCount = books.length;
        await shelf.save();

        res.render('shelves/show', {
            title: shelf.name,
            shelf,
            books
        });
    } catch (err) {
        console.error('Error fetching shelf:', err);
        req.flash('error', 'Failed to load shelf details.');
        res.redirect('/shelves');
    }
});

/**
 * GET /shelves/:id/edit - Show edit form
 */
router.get('/:id/edit', async (req, res) => {
    try {
        const shelf = await Shelf.findById(req.params.id);
        
        if (!shelf) {
            req.flash('error', 'Shelf not found');
            return res.redirect('/shelves');
        }

        res.render('shelves/edit', {
            title: `Edit: ${shelf.name}`,
            shelf,
            errors: []
        });
    } catch (err) {
        console.error('Error fetching shelf for edit:', err);
        req.flash('error', 'Failed to load shelf for editing.');
        res.redirect('/shelves');
    }
});

/**
 * PUT /shelves/:id - Update shelf
 */
router.put('/:id', shelfValidation, async (req, res) => {
    try {
        const shelf = await Shelf.findById(req.params.id);
        
        if (!shelf) {
            req.flash('error', 'Shelf not found');
            return res.redirect('/shelves');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('shelves/edit', {
                title: `Edit: ${shelf.name}`,
                shelf: { ...shelf.toObject(), ...req.body },
                errors: errors.array()
            });
        }

        shelf.name = req.body.name;
        shelf.description = req.body.description;
        shelf.color = req.body.color || '#6366f1';
        shelf.icon = req.body.icon || 'book';

        await shelf.save();
        req.flash('success', 'Shelf updated successfully!');
        res.redirect(`/shelves/${shelf._id}`);
    } catch (err) {
        console.error('Error updating shelf:', err);
        req.flash('error', 'Failed to update shelf. Please try again.');
        res.redirect(`/shelves/${req.params.id}/edit`);
    }
});

/**
 * DELETE /shelves/:id - Delete shelf
 */
router.delete('/:id', async (req, res) => {
    try {
        // Check delete password
        const deletePassword = req.body.deletePassword;
        if (deletePassword !== process.env.DELETE_PASSWORD) {
            req.flash('error', 'Invalid delete password. Shelf was not deleted.');
            return res.redirect('back');
        }

        const shelf = await Shelf.findById(req.params.id);
        
        if (!shelf) {
            req.flash('error', 'Shelf not found');
            return res.redirect('/shelves');
        }

        // Remove shelf reference from all books in this shelf
        await Book.updateMany(
            { shelf: shelf._id },
            { $set: { shelf: null } }
        );

        await Shelf.findByIdAndDelete(req.params.id);
        req.flash('success', 'Shelf deleted successfully!');
        res.redirect('/shelves');
    } catch (err) {
        console.error('Error deleting shelf:', err);
        req.flash('error', 'Failed to delete shelf. Please try again.');
        res.redirect('/shelves');
    }
});

/**
 * POST /shelves/:id/add-book - Add book to shelf
 */
router.post('/:id/add-book', async (req, res) => {
    try {
        const shelf = await Shelf.findById(req.params.id);
        const book = await Book.findById(req.body.bookId);
        
        if (!shelf || !book) {
            req.flash('error', 'Shelf or book not found');
            return res.redirect('back');
        }

        book.shelf = shelf._id;
        await book.save();

        // Update book count
        shelf.bookCount = await Book.countDocuments({ shelf: shelf._id });
        await shelf.save();

        req.flash('success', `Book added to "${shelf.name}" successfully!`);
        res.redirect('back');
    } catch (err) {
        console.error('Error adding book to shelf:', err);
        req.flash('error', 'Failed to add book to shelf.');
        res.redirect('back');
    }
});

/**
 * POST /shelves/:id/remove-book - Remove book from shelf
 */
router.post('/:id/remove-book', async (req, res) => {
    try {
        const shelf = await Shelf.findById(req.params.id);
        const book = await Book.findById(req.body.bookId);
        
        if (!shelf || !book) {
            req.flash('error', 'Shelf or book not found');
            return res.redirect('back');
        }

        book.shelf = null;
        await book.save();

        // Update book count
        shelf.bookCount = await Book.countDocuments({ shelf: shelf._id });
        await shelf.save();

        req.flash('success', `Book removed from "${shelf.name}" successfully!`);
        res.redirect('back');
    } catch (err) {
        console.error('Error removing book from shelf:', err);
        req.flash('error', 'Failed to remove book from shelf.');
        res.redirect('back');
    }
});

module.exports = router;
