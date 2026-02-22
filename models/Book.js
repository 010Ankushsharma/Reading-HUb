/**
 * Book Model
 * Mongoose schema for storing book information
 */
const mongoose = require('mongoose');

// Define the Book schema
const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    author: {
        type: String,
        required: [true, 'Author is required'],
        trim: true,
        maxlength: [100, 'Author name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    genre: {
        type: String,
        trim: true,
        maxlength: [50, 'Genre cannot exceed 50 characters']
    },
    coverImage: {
        type: String,
        trim: true
    },
    pdfFile: {
        type: String,
        required: [true, 'PDF file is required']
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    shelf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shelf',
        default: null
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
bookSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create text index for search functionality
bookSchema.index({ title: 'text', author: 'text', description: 'text' });

// Create and export the Book model
module.exports = mongoose.model('Book', bookSchema);
