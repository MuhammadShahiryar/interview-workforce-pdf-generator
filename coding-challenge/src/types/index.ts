// Form submission types
export interface ApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobDescription: string;
}

// API response types
export interface SubmitResponse {
  success: boolean;
  submissionId?: string;
  pdfUrl?: string;
  error?: string;
}

// Database model types (matches Prisma schema)
export interface UserSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobDescription: string;
  uploadedFilePath: string | null;
  uploadedFileName: string | null;
  generatedPdfPath: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Submission status enum
export enum SubmissionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}
