Library Management API
A RESTful API for managing library books and authors with full CRUD operations.

Base URL
text
https://book-collection-api-0vgp.onrender.com
Endpoints
Books Collection
Get All Books
URL: /api/books

Method: GET

Response:

json
{
  "success": true,
  "data": [...],
  "count": 10
}
Get Book by ID
URL: /api/books/:id

Method: GET

Create New Book
URL: /api/books

Method: POST

Body:

json
{
  "title": "Book Title",
  "author": "Author Name",
  "isbn": "1234567890",
  "publicationYear": 2023,
  "genre": "Fiction",
  "publisher": "Publisher Name",
  "pageCount": 300,
  "description": "Optional description",
  "language": "English"
}
Update Book
URL: /api/books/:id

Method: PUT

Delete Book
URL: /api/books/:id

Method: DELETE

Authors Collection
Get All Authors
URL: /api/authors

Method: GET

Get Author by ID
URL: /api/authors/:id

Method: GET

Create New Author
URL: /api/authors

Method: POST

Body:

json
{
  "name": "Author Name",
  "birthYear": 1965,
  "nationality": "Nationality",
  "bio": "Optional biography",
  "website": "https://example.com"
}
Update Author
URL: /api/authors/:id

Method: PUT

Delete Author
URL: /api/authors/:id

Method: DELETE

Data Validation
Book Validation Rules:
Title: Required, max 200 chars

Author: Required, max 100 chars

ISBN: Required, unique, 10-13 digits

Publication Year: Required, 1000-current year

Genre: Required, from predefined list

Publisher: Required, max 100 chars

Page Count: Required, min 1

Author Validation Rules:
Name: Required, max 100 chars

Birth Year: Required, 1000-current year

Nationality: Required, max 50 chars

Website: Must be valid URL format

Error Responses
All errors follow this format:

json
{
  "success": false,
  "message": "Error description",
  "errors": ["Validation errors..."],
  "error": "Detailed error message"
}
Status Codes
200: Success

201: Created

400: Bad Request (Validation)

404: Not Found

500: Internal Server Error

Health Check
URL: /health

Method: GET

Response:

json
{
  "status": "OK",
  "timestamp": "2024-11-20T16:30:00.000Z",
  "database": "Connected",
  "uptime": 123.45
}
