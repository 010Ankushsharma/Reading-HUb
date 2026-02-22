/**
 * Shelf Model
 * Mongoose schema for storing book collections/shelves
 */
const mongoose = require('mongoose');

// Define the Shelf schema
const shelfSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Shelf name is required'],
        trim: true,
        maxlength: [100, 'Shelf name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    color: {
        type: String,
        default: '#6366f1', // Default primary color
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code']
    },
    icon: {
        type: String,
        default: 'book',
        enum: ['book', 'books', 'bookmark', 'heart', 'star', 'folder', 'archive', 'graduation-cap', 'university', 'library']
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    bookCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
shelfSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual populate to get all books in this shelf
shelfSchema.virtual('books', {
    ref: 'Book',
    localField: '_id',
    foreignField: 'shelf'
});

// Method to update book count
shelfSchema.methods.updateBookCount = async function() {
    const Book = mongoose.model('Book');
    this.bookCount = await Book.countDocuments({ shelf: this._id });
    await this.save();
};

// Create and export the Shelf model
module.exports = mongoose.model('Shelf', shelfSchema);
