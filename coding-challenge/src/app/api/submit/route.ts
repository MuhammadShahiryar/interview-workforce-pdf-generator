import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { applicationFormSchema } from "@/lib/validations";
import { generatePDF } from "@/lib/pdf-generator";
import { SubmitResponse, SubmissionStatus } from "@/types";
import {
  validateFile,
  generateSafeFileName,
  ApplicationError,
  handleApiError,
} from "@/lib/file-utils";
import { ERROR_MESSAGES } from "@/lib/constants";

export async function POST(
  request: NextRequest
): Promise<NextResponse<SubmitResponse>> {
  const startTime = Date.now();

  try {
    // Parse form data
    const formData = await request.formData();

    // Extract and validate form fields
    const formFields = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string | null,
      jobDescription: formData.get("jobDescription") as string,
    };

    // Validate form data with Zod
    const validatedData = applicationFormSchema.parse(formFields);

    // Handle file upload
    const file = formData.get("file") as File;
    if (!file) {
      throw new ApplicationError("No file uploaded", 400);
    }

    // Validate file
    const fileValidation = validateFile(file);
    if (!fileValidation.isValid) {
      throw new ApplicationError(
        fileValidation.error || ERROR_MESSAGES.INVALID_FILE_TYPE,
        400
      );
    }

    // Check if email already has a recent submission (rate limiting)
    // TEMPORARILY DISABLED FOR TESTING
    // const recentSubmission = await prisma.userSubmission.findFirst({
    //   where: {
    //     email: validatedData.email,
    //     createdAt: {
    //       gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    //     },
    //   },
    // });

    // if (recentSubmission) {
    //   throw new ApplicationError(
    //     "Please wait 5 minutes before submitting again",
    //     429
    //   );
    // }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Process and save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate file checksum for integrity (could be stored for file integrity checks)
    // const checksum = getFileChecksum(buffer);

    // Generate safe filename
    const fileName = generateSafeFileName(file.name);
    const filePath = path.join(uploadsDir, fileName);

    // Save file to disk
    await writeFile(filePath, buffer);

    // Create database entry with transaction
    const submission = await prisma.$transaction(async (tx) => {
      // Create submission record
      const newSubmission = await tx.userSubmission.create({
        data: {
          ...validatedData,
          uploadedFilePath: filePath,
          uploadedFileName: file.name,
          status: SubmissionStatus.PROCESSING,
        },
      });

      return newSubmission;
    });

    // Generate PDF (with error handling)
    let pdfPath: string;
    try {
      pdfPath = await generatePDF(submission);
    } catch (pdfError) {
      // Update status to failed if PDF generation fails
      await prisma.userSubmission.update({
        where: { id: submission.id },
        data: { status: SubmissionStatus.FAILED },
      });

      console.error("PDF generation failed:", pdfError);
      console.error("PDF error details:", {
        message: pdfError instanceof Error ? pdfError.message : "Unknown error",
        stack: pdfError instanceof Error ? pdfError.stack : "No stack trace",
        submissionId: submission.id,
      });
      throw new ApplicationError(
        `PDF generation failed: ${
          pdfError instanceof Error ? pdfError.message : "Unknown error"
        }`,
        500
      );
    }

    // Update submission with PDF path
    await prisma.userSubmission.update({
      where: { id: submission.id },
      data: {
        generatedPdfPath: pdfPath,
        status: SubmissionStatus.COMPLETED,
      },
    });

    // Log processing time
    const processingTime = Date.now() - startTime;
    console.log(`Submission ${submission.id} processed in ${processingTime}ms`);

    // Return success response
    return NextResponse.json<SubmitResponse>({
      success: true,
      submissionId: submission.id,
      pdfUrl: `/api/pdf/${submission.id}`,
    });
  } catch (error) {
    const { message, statusCode } = handleApiError(error);

    return NextResponse.json<SubmitResponse>(
      { success: false, error: message },
      { status: statusCode }
    );
  }
}

// Set max request size (Next.js 13+ way)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
