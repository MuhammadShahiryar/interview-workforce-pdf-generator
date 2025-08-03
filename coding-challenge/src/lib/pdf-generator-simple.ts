import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { UserSubmission } from "@prisma/client";
import { ApplicationError } from "./file-utils";

export async function generateSimplePDF(
  submission: UserSubmission
): Promise<string> {
  try {
    const pdfDoc = await PDFDocument.create();

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText("Application Summary", {
      x: 50,
      y: height - 50,
      size: 24,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    const info = [
      `Name: ${submission.firstName} ${submission.lastName}`,
      `Email: ${submission.email}`,
      `Phone: ${submission.phone || "Not provided"}`,
      `Application Date: ${new Date(
        submission.createdAt
      ).toLocaleDateString()}`,
    ];

    let yPosition = height - 100;
    for (const line of info) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 12,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
    }

    yPosition -= 20;
    page.drawText("Job Description:", {
      x: 50,
      y: yPosition,
      size: 16,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });

    yPosition -= 30;
    page.drawText(submission.jobDescription, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helvetica,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();

    if (pdfBytes.length === 0) {
      throw new ApplicationError("Generated PDF is empty", 500);
    }

    const generatedDir = path.join(process.cwd(), "uploads", "generated");
    await mkdir(generatedDir, { recursive: true });

    const pdfFileName = `application-${submission.id}.pdf`;
    const pdfPath = path.join(generatedDir, pdfFileName);
    await writeFile(pdfPath, pdfBytes);

    return pdfPath;
  } catch (error) {

    if (error instanceof ApplicationError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApplicationError(
        `Simple PDF generation failed: ${error.message}`,
        500
      );
    }

    throw new ApplicationError("Simple PDF generation failed", 500);
  }
}
