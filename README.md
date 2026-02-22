# Web Reading Hub

A complete full-stack web application for managing and reading books online. Built with Node.js, Express.js, MongoDB, Mongoose, and EJS templating engine.

## Features

### Core Features
- **Add New Book**: Upload PDF files with book details (title, author, description, genre, cover image)
- **View All Books**: Browse books in a beautiful card layout with search and pagination
- **View Single Book**: Read books with embedded PDF viewer and download option
- **Edit Book**: Update book details and replace PDF files
- **Delete Book**: Remove books with automatic file cleanup

### Extra Features
- **Search**: Search books by title, author, or genre
- **Pagination**: Navigate through large book collections
- **Dark Mode**: Toggle between light and dark themes
- **Flash Messages**: Success/error notifications
- **Form Validation**: Client-side and server-side validation
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Download Counter**: Track how many times each book is downloaded

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Template Engine**: EJS
- **File Upload**: Multer
- **CSS**: Custom CSS with CSS Variables
- **Icons**: Font Awesome
- **Fonts**: Inter, Playfair Display (Google Fonts)

## Project Structure

```
reading-hub/
├── models/
│   └── Book.js              # Mongoose Book schema
├── routes/
│   └── books.js             # Book routes (CRUD operations)
├── views/
│   ├── books/
│   │   ├── index.ejs        # List all books
│   │   ├── new.ejs          # Add new book form
│   │   ├── show.ejs         # Single book details
│   │   ├── edit.ejs         # Edit book form
│   │   └── form.ejs         # Reusable form partial
│   ├── partials/
│   │   ├── header.ejs       # HTML head section
│   │   ├── footer.ejs       # Footer section
│   │   └── navbar.ejs       # Navigation bar
│   └── error.ejs            # Error page
├── public/
│   ├── css/
│   │   └── style.css        # Main stylesheet
│   ├── js/
│   │   └── main.js          # Client-side JavaScript
│   └── images/              # Static images
├── uploads/                 # PDF storage folder
├── app.js                   # Main application entry
├── package.json             # Dependencies
├── .env                     # Environment variables
└── .env.example             # Example environment file
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. **Clone or download the project**
   ```bash
   cd reading-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/reading-hub
   NODE_ENV=development
   ```

4. **Ensure MongoDB is running**
   
   If using local MongoDB:
   ```bash
   mongod
   ```
   
   Or use MongoDB Atlas for cloud database.

5. **Start the application**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Access the application**
   
   Open your browser and navigate to: `http://localhost:3000`

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/books` | List all books (with pagination & search) |
| GET | `/books/new` | Show add book form |
| POST | `/books` | Create new book |
| GET | `/books/:id` | Show single book details |
| GET | `/books/:id/edit` | Show edit book form |
| PUT | `/books/:id` | Update book |
| DELETE | `/books/:id` | Delete book |
| GET | `/books/:id/download` | Download PDF |

## Book Schema

```javascript
{
  title: String (required),
  author: String (required),
  description: String,
  genre: String,
  coverImage: String,
  pdfFile: String (required),
  downloadCount: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

## Usage Guide

### Adding a Book
1. Click "Add New Book" button on the home page
2. Fill in the required fields (Title, Author)
3. Upload a PDF file
4. Optionally add a cover image (URL or file upload)
5. Click "Add Book" to save

### Reading a Book
1. Click on any book card or the "View" button
2. The PDF will be displayed in an embedded viewer
3. Use the fullscreen button for better reading experience
4. Click "Download PDF" to save the file locally

### Searching Books
1. Use the search bar on the home page
2. Search by title, author, or genre
3. Results update automatically

### Editing a Book
1. Click "Edit" on any book card or the edit button on the book details page
2. Update the desired fields
3. Optionally replace the PDF or cover image
4. Click "Update Book" to save changes

### Deleting a Book
1. Click the "Delete" button on a book card or details page
2. Confirm the deletion
3. The book and associated files will be permanently removed

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search input
- `Escape` - Close mobile menu

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

### Running in Development Mode
```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/reading-hub |
| NODE_ENV | Environment mode | development |

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running locally
- Check your `MONGODB_URI` in `.env`
- For MongoDB Atlas, ensure your IP is whitelisted

### File Upload Issues
- Check that the `uploads/` folder exists and is writable
- Ensure PDF files are under 50MB
- Verify file permissions

### Port Already in Use
- Change the `PORT` in `.env`
- Or kill the process using the port: `npx kill-port 3000`

## License

MIT License

## Credits

Built with:
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Mongoose](https://mongoosejs.com/)
- [EJS](https://ejs.co/)
- [Multer](https://github.com/expressjs/multer)
