import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import path from "path";
import { UserSubmission } from "@prisma/client";
import { PDF_CONFIG, ERROR_MESSAGES } from "./constants";
import { ApplicationError } from "./file-utils";

interface PDFGenerationContext {
  doc: PDFDocument;
  page: PDFPage;
  fonts: {
    bold: PDFFont;
    regular: PDFFont;
  };
  currentY: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
}

export async function generatePDF(submission: UserSubmission): Promise<string> {
  let context: PDFGenerationContext | null = null;

  try {

    const pdfDoc = await PDFDocument.create();

    const page = pdfDoc.addPage([
      PDF_CONFIG.PAGE_WIDTH,
      PDF_CONFIG.PAGE_HEIGHT,
    ]);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    context = {
      doc: pdfDoc,
      page,
      fonts: {
        bold: helveticaBold,
        regular: helvetica,
      },
      currentY: pageHeight - PDF_CONFIG.MARGIN,
      pageWidth,
      pageHeight,
      margin: PDF_CONFIG.MARGIN,
    };

    addTitle(context, "Application Summary");
    addSection(
      context,
      "Applicant Information",
      generateApplicantInfo(submission)
    );
    addSection(context, "Current Job Description", submission.jobDescription);
    addSection(context, "Uploaded Document", generateDocumentInfo(submission));

    if (submission.uploadedFilePath) {
      await embedUploadedPDF(context, submission.uploadedFilePath);
    }

    const pdfBytes = await pdfDoc.save();
    if (pdfBytes.length === 0) {
      throw new ApplicationError("Generated PDF is empty", 500);
    }

    const generatedDir = path.join(process.cwd(), "uploads", "generated");
    await mkdir(generatedDir, { recursive: true });

    const pdfFileName = `application-${submission.id}.pdf`;
    const pdfPath = path.join(generatedDir, pdfFileName);
    await writeFile(pdfPath, pdfBytes);

    try {
      await access(pdfPath);
      const stats = await readFile(pdfPath);
      if (stats.length === 0) {
        throw new ApplicationError("Saved PDF file is empty", 500);
      }
    } catch (verificationError) {
      throw new ApplicationError("PDF file verification failed", 500);
    }

    return pdfPath;
  } catch (error) {

    if (error instanceof ApplicationError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApplicationError(
        `PDF generation failed: ${error.message}`,
        500
      );
    }

    throw new ApplicationError(ERROR_MESSAGES.PDF_GENERATION_FAILED, 500);
  }
}

function addTitle(context: PDFGenerationContext, title: string): void {
  const cleanTitle = title.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g,
    ""
  );

  context.page.drawText(cleanTitle, {
    x: context.margin,
    y: context.currentY,
    size: PDF_CONFIG.TITLE_SIZE,
    font: context.fonts.bold,
    color: rgb(0, 0, 0),
  });
  context.currentY -= PDF_CONFIG.TITLE_SIZE + 20;
}

function addSection(
  context: PDFGenerationContext,
  heading: string,
  content: string
): void {
  if (context.currentY < context.margin + 100) {
    context.page = context.doc.addPage([context.pageWidth, context.pageHeight]);
    context.currentY = context.pageHeight - context.margin;
  }

  const cleanHeading = heading.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g,
    ""
  );

  context.page.drawText(cleanHeading, {
    x: context.margin,
    y: context.currentY,
    size: PDF_CONFIG.HEADING_SIZE,
    font: context.fonts.bold,
    color: rgb(0, 0, 0),
  });
  context.currentY -= PDF_CONFIG.HEADING_SIZE + 10;

  const cleanContent = content.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g,
    ""
  );
  const lines = wrapText(cleanContent, context);

  for (const line of lines) {
    if (context.currentY < context.margin + 20) {
      context.page = context.doc.addPage([
        context.pageWidth,
        context.pageHeight,
      ]);
      context.currentY = context.pageHeight - context.margin;
    }

    if (line.trim()) {
      try {
        context.page.drawText(line, {
          x: context.margin,
          y: context.currentY,
          size: PDF_CONFIG.TEXT_SIZE,
          font: context.fonts.regular,
          color: rgb(0, 0, 0),
        });
      } catch (drawError) {
      }
    }
    context.currentY -= PDF_CONFIG.LINE_HEIGHT;
  }

  context.currentY -= 20;
}

function wrapText(text: string, context: PDFGenerationContext): string[] {
  const paragraphs = text.split(/\r?\n/);
  const allLines: string[] = [];

  const maxWidth = context.pageWidth - 2 * context.margin;

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      allLines.push("");
      continue;
    }

    const words = paragraph.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const cleanWord = word.replace(
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g,
        ""
      );
      const testLine = currentLine ? `${currentLine} ${cleanWord}` : cleanWord;

      try {
        const textWidth = context.fonts.regular.widthOfTextAtSize(
          testLine,
          PDF_CONFIG.TEXT_SIZE
        );

        if (textWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = cleanWord;
        } else {
          currentLine = testLine;
        }
      } catch (encodingError) {
        continue;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    allLines.push(...lines);
  }

  return allLines;
}

function generateApplicantInfo(submission: UserSubmission): string {
  const info = [
    `Name: ${submission.firstName} ${submission.lastName}`,
    `Email: ${submission.email}`,
    `Phone: ${submission.phone || "Not provided"}`,
    `Application Date: ${new Date(submission.createdAt).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`,
    `Status: ${submission.status}`,
  ];

  return info.join("\n");
}

function generateDocumentInfo(submission: UserSubmission): string {
  if (!submission.uploadedFileName) {
    return "No document uploaded";
  }

  return `Uploaded File: ${submission.uploadedFileName}\nFile processed and attached to this PDF.`;
}

async function embedUploadedPDF(
  context: PDFGenerationContext,
  filePath: string
): Promise<void> {
  try {
    await access(filePath);

    const uploadedPdfBytes = await readFile(filePath);

    if (uploadedPdfBytes.length === 0) {
      addSection(
        context,
        "Attached Document",
        "Document file was empty and could not be processed."
      );
      return;
    }

    let uploadedPdf: PDFDocument;
    try {
      uploadedPdf = await PDFDocument.load(uploadedPdfBytes, {
        ignoreEncryption: true,
        parseSpeed: 1,
        throwOnInvalidObject: false,
      });
    } catch (loadError) {
      addSection(
        context,
        "Attached Document",
        `Document "${path.basename(
          filePath
        )}" was uploaded but could not be processed. The file may be corrupted or encrypted.`
      );
      return;
    }

    const pageCount = uploadedPdf.getPageCount();

    if (pageCount === 0) {
      addSection(
        context,
        "Attached Document",
        "Document file contains no pages and could not be processed."
      );
      return;
    }

    try {
      const pageIndices = uploadedPdf.getPageIndices();

      const copiedPages = await context.doc.copyPages(uploadedPdf, pageIndices);

      addSection(
        context,
        "Attached Resume/Document",
        `The following ${pageCount} page(s) contain the uploaded document:`
      );

      copiedPages.forEach((copiedPage, index) => {
        context.doc.addPage(copiedPage);
      });

    } catch (copyError) {
      addSection(
        context,
        "Attached Document",
        `Document "${path.basename(
          filePath
        )}" was uploaded but pages could not be copied. The file may have restrictions or be corrupted.`
      );
    }
  } catch (error) {
    addSection(
      context,
      "Attached Document",
      `Document was uploaded but could not be embedded in this PDF. Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
