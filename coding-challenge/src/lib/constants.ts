// File upload constraints
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_MIME_TYPES: ["application/pdf"],
  ALLOWED_EXTENSIONS: [".pdf"],
} as const;

// Form validation constraints
export const FORM_CONSTRAINTS = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 50,
  JOB_DESCRIPTION_MIN_LENGTH: 10,
  JOB_DESCRIPTION_MAX_LENGTH: 2000,
  EMAIL_MAX_LENGTH: 255,
  PHONE_REGEX: /^[\d\s\-\+\(\)]+$/,
} as const;

// PDF generation settings
export const PDF_CONFIG = {
  PAGE_WIDTH: 595.28, // A4 width in points
  PAGE_HEIGHT: 841.89, // A4 height in points
  MARGIN: 50,
  TITLE_SIZE: 24,
  HEADING_SIZE: 16,
  TEXT_SIZE: 12,
  LINE_HEIGHT: 18,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: "File size exceeds 10MB limit",
  INVALID_FILE_TYPE: "Only PDF files are allowed",
  FILE_UPLOAD_FAILED: "Failed to upload file",
  PDF_GENERATION_FAILED: "Failed to generate PDF",
  DATABASE_ERROR: "Database operation failed",
  VALIDATION_ERROR: "Invalid form data",
  SUBMISSION_NOT_FOUND: "Submission not found",
  SERVER_ERROR: "Internal server error",
} as const;

// Status messages
export const STATUS_MESSAGES = {
  UPLOADING: "Uploading file...",
  PROCESSING: "Processing your application...",
  GENERATING_PDF: "Generating PDF...",
  COMPLETED: "Application submitted successfully!",
} as const;
