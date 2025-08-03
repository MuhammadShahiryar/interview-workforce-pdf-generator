import { FILE_UPLOAD_CONFIG, ERROR_MESSAGES } from "./constants";
import crypto from "crypto";
import path from "path";

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  if (file.size > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.FILE_TOO_LARGE,
    };
  }

  if (
    !FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(
      file.type as "application/pdf"
    )
  ) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_FILE_TYPE,
    };
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!FILE_UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(extension as ".pdf")) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_FILE_TYPE,
    };
  }

  return { isValid: true };
}

export function generateSafeFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString("hex");
  const extension = path.extname(originalName);
  const baseName = path
    .basename(originalName, extension)
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 50);

  return `${timestamp}-${randomString}-${baseName}${extension}`;
}

export function getFileChecksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export class ApplicationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export function handleApiError(error: unknown): {
  message: string;
  statusCode: number;
} {
  if (error instanceof ApplicationError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    if (error.message.includes("P2002")) {
      return {
        message: "A submission with this email already exists",
        statusCode: 409,
      };
    }

    if (error.name === "ZodError") {
      return {
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        statusCode: 400,
      };
    }
  }

  return {
    message: ERROR_MESSAGES.SERVER_ERROR,
    statusCode: 500,
  };
}
