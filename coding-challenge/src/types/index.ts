export interface ApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobDescription: string;
}

export interface SubmitResponse {
  success: boolean;
  submissionId?: string;
  pdfUrl?: string;
  error?: string;
}

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

export enum SubmissionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}
