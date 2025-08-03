# Request Flow Documentation

## Overview

This document describes the complete request flow for the job application submission process, from form submission to PDF generation and download.

## Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Client    │────▶│ Next.js App  │────▶│  Database   │────▶│ File System  │
│  (/apply)   │     │   Routes     │     │  (SQLite)   │     │  (./uploads) │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
      │                    │                     │                    │
      │                    ▼                     ▼                    ▼
      │            ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
      └───────────▶│   API Route  │────▶│   Prisma    │────▶│ PDF Generator│
                   │ (/api/submit)│     │    ORM      │     │  (pdf-lib)   │
                   └──────────────┘     └─────────────┘     └──────────────┘
```

## Detailed Request Flow

### 1. Form Submission (Client → Server)

**Endpoint**: `POST /api/submit`

**Request**:

```typescript
// FormData structure
{
  firstName: string
  lastName: string
  email: string
  phone?: string
  jobDescription: string
  file: File (PDF)
}
```

**Steps**:

1. User fills out form at `/apply`
2. Client-side validation using react-hook-form + Zod
3. Form data and file sent as multipart/form-data
4. Request hits Next.js API route handler

### 2. Server Processing

**File**: `src/app/api/submit/route.ts`

**Process**:

```typescript
1. Parse FormData from request
2. Validate fields with Zod schema
3. Validate file type (must be PDF)
4. Save file to ./uploads directory
5. Create database record (status: 'processing')
6. Generate PDF with user data
7. Update database record (status: 'completed')
8. Return success response with PDF URL
```

### 3. File Upload Handling

**Location**: `./uploads/[timestamp]-[sanitized-filename].pdf`

**Security**:

- File type validation (PDF only)
- Filename sanitization
- Size limits (default Next.js limit)
- Unique timestamp prefix to prevent collisions

### 4. Database Operations

**Using Prisma ORM**:

```typescript
// Create submission
const submission = await prisma.userSubmission.create({
  data: {
    firstName,
    lastName,
    email,
    phone,
    jobDescription,
    uploadedFilePath,
    uploadedFileName,
    status: "processing",
  },
});

// Update after PDF generation
await prisma.userSubmission.update({
  where: { id: submission.id },
  data: {
    generatedPdfPath,
    status: "completed",
  },
});
```

### 5. PDF Generation

**Library**: pdf-lib

**Process**:

1. Create new PDF document
2. Add applicant information page
3. Format and add job description
4. Reference uploaded file
5. Embed uploaded PDF pages (if possible)
6. Save to `./uploads/generated/application-[id].pdf`

### 6. PDF Download

**Endpoint**: `GET /api/pdf/[id]`

**Process**:

1. Receive submission ID
2. Query database for submission
3. Read PDF file from filesystem
4. Return file with appropriate headers

**Response Headers**:

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="application-[name].pdf"
```

## Error Handling

### Client-Side Errors

- Form validation errors → Display inline
- Network errors → Show alert message
- File type errors → Prevent upload

### Server-Side Errors

- Validation failures → 400 Bad Request
- File system errors → 500 Internal Server Error
- Database errors → 500 Internal Server Error
- PDF generation errors → Update status to 'failed'

## API Endpoints

### POST /api/submit

- **Purpose**: Handle form submission and file upload
- **Input**: FormData (multipart)
- **Output**: JSON with submission ID and PDF URL
- **Status Codes**:
  - 200: Success
  - 400: Validation error
  - 500: Server error

### GET /api/pdf/[id]

- **Purpose**: Download generated PDF
- **Input**: Submission ID (URL parameter)
- **Output**: PDF file
- **Status Codes**:
  - 200: Success (PDF file)
  - 404: Submission not found
  - 500: Server error

## State Management

### Submission States

```typescript
type SubmissionStatus = "pending" | "processing" | "completed" | "failed";
```

### State Transitions

1. **pending**: Initial state (form submitted)
2. **processing**: PDF generation started
3. **completed**: PDF generated successfully
4. **failed**: Error during processing

## Performance Considerations

1. **File Upload**: Handled synchronously (could be async with job queue)
2. **PDF Generation**: Synchronous operation (takes 1-3 seconds)
3. **Database Queries**: Optimized with proper indexes
4. **File Storage**: Local filesystem (S3 for production)

## Security Measures

1. **Input Validation**: Zod schemas on all inputs
2. **File Type Validation**: Only PDF accepted
3. **Path Traversal Protection**: Sanitized filenames
4. **SQL Injection Prevention**: Prisma parameterized queries
5. **XSS Protection**: React automatic escaping
