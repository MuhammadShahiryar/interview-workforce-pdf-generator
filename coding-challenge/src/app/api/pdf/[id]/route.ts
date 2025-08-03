import { NextRequest, NextResponse } from "next/server";
import { readFile, access } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { ApplicationError, handleApiError } from "@/lib/file-utils";
import { SubmissionStatus } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  try {
    if (!id || id.length < 10) {
      throw new ApplicationError("Invalid submission ID", 400);
    }

    const submission = await prisma.userSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        generatedPdfPath: true,
        status: true,
        createdAt: true,
      },
    });

    if (!submission) {
      throw new ApplicationError("Submission not found", 404);
    }

    if (submission.status === SubmissionStatus.PROCESSING) {
      throw new ApplicationError(
        "PDF is still being generated. Please try again in a moment.",
        202
      );
    }

    if (submission.status === SubmissionStatus.FAILED) {
      throw new ApplicationError(
        "PDF generation failed. Please contact support.",
        500
      );
    }

    if (!submission.generatedPdfPath) {
      throw new ApplicationError("PDF not available", 404);
    }

    try {
      await access(submission.generatedPdfPath);
    } catch (fileError) {
      throw new ApplicationError("PDF file not found on server", 404);
    }

    const pdfBuffer = await readFile(submission.generatedPdfPath);

    if (pdfBuffer.length === 0) {
      throw new ApplicationError("PDF file is empty", 500);
    }

    const safeFileName = `application-${submission.firstName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}-${submission.lastName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
        "Last-Modified": new Date(submission.createdAt).toUTCString(),
      },
    });
  } catch (error) {
    const { message, statusCode } = handleApiError(error);

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
