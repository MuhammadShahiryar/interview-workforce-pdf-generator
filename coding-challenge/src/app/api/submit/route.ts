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
    const formData = await request.formData();

    const formFields = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string | null,
      jobDescription: formData.get("jobDescription") as string,
    };

    const validatedData = applicationFormSchema.parse(formFields);

    const file = formData.get("file") as File;
    if (!file) {
      throw new ApplicationError("No file uploaded", 400);
    }

    const fileValidation = validateFile(file);
    if (!fileValidation.isValid) {
      throw new ApplicationError(
        fileValidation.error || ERROR_MESSAGES.INVALID_FILE_TYPE,
        400
      );
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = generateSafeFileName(file.name);
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    const submission = await prisma.$transaction(async (tx) => {
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

    let pdfPath: string;
    try {
      pdfPath = await generatePDF(submission);
    } catch (pdfError) {
      await prisma.userSubmission.update({
        where: { id: submission.id },
        data: { status: SubmissionStatus.FAILED },
      });
      throw new ApplicationError(
        `PDF generation failed: ${
          pdfError instanceof Error ? pdfError.message : "Unknown error"
        }`,
        500
      );
    }

    await prisma.userSubmission.update({
      where: { id: submission.id },
      data: {
        generatedPdfPath: pdfPath,
        status: SubmissionStatus.COMPLETED,
      },
    });

    const processingTime = Date.now() - startTime;

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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
