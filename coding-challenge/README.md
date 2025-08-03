# Coding Challenge: Form to PDF Application

## Overview

This is a Next.js application that accepts job applications through a web form, stores the data in a SQLite database, and generates a professional PDF containing the applicant's information and uploaded resume.

## Features

- ✅ User-friendly application form at `/apply`
- ✅ Form validation with real-time error messages
- ✅ PDF file upload support
- ✅ SQLite database storage using Prisma ORM
- ✅ Automatic PDF generation with applicant information
- ✅ Secure file handling and storage
- ✅ Download generated PDFs

## Tech Stack

- **Framework**: Next.js 15.4.5 with TypeScript
- **Database**: SQLite with Prisma ORM
- **Form Handling**: React Hook Form + Zod validation
- **PDF Generation**: pdf-lib
- **Styling**: Tailwind CSS
- **File Storage**: Local filesystem

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd coding-challenge
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Run database migrations:

```bash
npx prisma migrate dev
```

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000/apply](http://localhost:3000/apply) in your browser

## Project Structure

```
coding-challenge/
├── src/
│   ├── app/
│   │   ├── apply/          # Application form page
│   │   └── api/
│   │       ├── submit/     # Form submission endpoint
│   │       └── pdf/[id]/   # PDF download endpoint
│   └── lib/
│       ├── prisma.ts       # Database client
│       ├── validations.ts  # Zod schemas
│       └── pdf-generator.ts # PDF creation logic
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── uploads/                # File storage
│   └── generated/          # Generated PDFs
├── data-model.md          # Database documentation
├── request-flow.md        # API flow documentation
└── README.md              # This file
```

## API Endpoints

### POST /api/submit

Handles form submission and file upload.

**Request**: Multipart form data with:

- `firstName` (string, required)
- `lastName` (string, required)
- `email` (string, required)
- `phone` (string, optional)
- `jobDescription` (string, required)
- `file` (PDF file, required)

**Response**:

```json
{
  "success": true,
  "submissionId": "clxyz123...",
  "pdfUrl": "/api/pdf/clxyz123..."
}
```

### GET /api/pdf/[id]

Downloads the generated PDF for a submission.

**Response**: PDF file with appropriate headers

## Database Schema

The application uses a single `UserSubmission` table:

```prisma
model UserSubmission {
  id               String   @id @default(cuid())
  firstName        String
  lastName         String
  email            String
  phone            String?
  jobDescription   String
  uploadedFilePath String?
  uploadedFileName String?
  generatedPdfPath String?
  status           String   @default("pending")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

## Development Notes

### File Upload Limits

- Only PDF files are accepted
- Default Next.js file size limit applies
- Files are stored in `./uploads` directory

### PDF Generation

- Uses pdf-lib for programmatic PDF creation
- Embeds uploaded PDF content when possible
- Generated files stored in `./uploads/generated`

### Security Considerations

- Input validation using Zod schemas
- Filename sanitization for uploaded files
- SQL injection prevention via Prisma
- XSS protection through React

## Testing the Application

1. Navigate to `/apply`
2. Fill out the form with:
   - Your personal information
   - A job description (minimum 10 characters)
   - Upload a PDF resume
3. Submit the form
4. Click the download link to get your generated PDF

## Troubleshooting

### Common Issues

1. **Database errors**: Run `npx prisma migrate reset` to reset the database
2. **File upload errors**: Ensure the `uploads` directory exists and is writable
3. **PDF generation errors**: Check console logs for detailed error messages

### Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Lint code
npm run lint

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

## Future Enhancements

- Add email notifications
- Implement async job processing
- Add progress indicators
- Support multiple file formats
- Add admin dashboard
- Implement user authentication

## Original Challenge Requirements

This project was built to satisfy the following requirements:

1. Form at `/apply` accepting personal details and job description
2. PDF file upload capability
3. Data persistence using SQLite/Prisma
4. PDF generation containing all submitted information
5. Download capability for generated PDFs

## License

This project is part of a coding challenge and is not licensed for production use.
