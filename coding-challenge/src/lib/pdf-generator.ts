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
    console.log(`Starting PDF generation for submission ${submission.id}`);

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Add a page
    const page = pdfDoc.addPage([
      PDF_CONFIG.PAGE_WIDTH,
      PDF_CONFIG.PAGE_HEIGHT,
    ]);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Load fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Initialize context
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

    // Generate PDF content
    addTitle(context, "Application Summary");
    addSection(
      context,
      "Applicant Information",
      generateApplicantInfo(submission)
    );
    addSection(context, "Current Job Description", submission.jobDescription);
    addSection(context, "Uploaded Document", generateDocumentInfo(submission));

    // Try to embed uploaded PDF if it exists and is accessible
    if (submission.uploadedFilePath) {
      await embedUploadedPDF(context, submission.uploadedFilePath);
    }

    // Validate PDF before saving
    const pdfBytes = await pdfDoc.save();
    if (pdfBytes.length === 0) {
      throw new ApplicationError("Generated PDF is empty", 500);
    }

    // Create generated PDFs directory
    const generatedDir = path.join(process.cwd(), "uploads", "generated");
    await mkdir(generatedDir, { recursive: true });

    // Save PDF file
    const pdfFileName = `application-${submission.id}.pdf`;
    const pdfPath = path.join(generatedDir, pdfFileName);
    await writeFile(pdfPath, pdfBytes);

    // Verify file was written correctly
    try {
      await access(pdfPath);
      const stats = await readFile(pdfPath);
      if (stats.length === 0) {
        throw new ApplicationError("Saved PDF file is empty", 500);
      }
    } catch (verificationError) {
      console.error("PDF verification failed:", verificationError);
      throw new ApplicationError("PDF file verification failed", 500);
    }

    console.log(`PDF generated successfully: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    console.error("PDF generation error:", error);

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
  // Sanitize title to ensure WinAnsi compatibility
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
  // Check if we need a new page
  if (context.currentY < context.margin + 100) {
    context.page = context.doc.addPage([context.pageWidth, context.pageHeight]);
    context.currentY = context.pageHeight - context.margin;
  }

  // Sanitize heading to ensure WinAnsi compatibility
  const cleanHeading = heading.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g,
    ""
  );

  // Add heading
  context.page.drawText(cleanHeading, {
    x: context.margin,
    y: context.currentY,
    size: PDF_CONFIG.HEADING_SIZE,
    font: context.fonts.bold,
    color: rgb(0, 0, 0),
  });
  context.currentY -= PDF_CONFIG.HEADING_SIZE + 10;

  // Sanitize content and add with text wrapping
  const cleanContent = content.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g,
    ""
  );
  const lines = wrapText(cleanContent, context);

  for (const line of lines) {
    if (context.currentY < context.margin + 20) {
      // Create new page if needed
      context.page = context.doc.addPage([
        context.pageWidth,
        context.pageHeight,
      ]);
      context.currentY = context.pageHeight - context.margin;
    }

    // Skip empty lines or lines that would cause encoding issues
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
        console.warn(`Skipping line due to encoding error: ${line}`, drawError);
      }
    }
    context.currentY -= PDF_CONFIG.LINE_HEIGHT;
  }

  context.currentY -= 20; // Section spacing
}

function wrapText(text: string, context: PDFGenerationContext): string[] {
  // First, handle newlines by splitting them into separate lines
  const paragraphs = text.split(/\r?\n/);
  const allLines: string[] = [];

  const maxWidth = context.pageWidth - 2 * context.margin;

  for (const paragraph of paragraphs) {
    // If paragraph is empty, add an empty line
    if (!paragraph.trim()) {
      allLines.push("");
      continue;
    }

    const words = paragraph.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      // Clean the word of any remaining special characters that WinAnsi can't handle
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
        // If we still get encoding errors, skip this word
        console.warn(
          `Skipping word due to encoding error: ${cleanWord}`,
          encodingError
        );
        continue;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    // Add all lines from this paragraph
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
    console.log(`Attempting to embed PDF from: ${filePath}`);

    // Check if file exists and is accessible
    await access(filePath);
    console.log(`File exists and is accessible: ${filePath}`);

    // Read and embed the uploaded PDF
    const uploadedPdfBytes = await readFile(filePath);
    console.log(`Read ${uploadedPdfBytes.length} bytes from uploaded PDF`);

    if (uploadedPdfBytes.length === 0) {
      console.warn("Uploaded PDF file is empty, skipping embedding");
      addSection(
        context,
        "Attached Document",
        "Document file was empty and could not be processed."
      );
      return;
    }

    // Try to load the PDF with better error handling
    let uploadedPdf: PDFDocument;
    try {
      uploadedPdf = await PDFDocument.load(uploadedPdfBytes, {
        ignoreEncryption: true,
        parseSpeed: 1,
        throwOnInvalidObject: false,
      });
      console.log(`Successfully loaded uploaded PDF`);
    } catch (loadError) {
      console.error("Failed to load uploaded PDF:", loadError);
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
    console.log(`Uploaded PDF has ${pageCount} pages`);

    if (pageCount === 0) {
      console.warn("Uploaded PDF has no pages, skipping embedding");
      addSection(
        context,
        "Attached Document",
        "Document file contains no pages and could not be processed."
      );
      return;
    }

    // Try to copy pages with error handling
    try {
      const pageIndices = uploadedPdf.getPageIndices();
      console.log(`Copying pages: ${pageIndices.join(", ")}`);

      const copiedPages = await context.doc.copyPages(uploadedPdf, pageIndices);
      console.log(`Successfully copied ${copiedPages.length} pages`);

      // Add section divider
      addSection(
        context,
        "Attached Resume/Document",
        `The following ${pageCount} page(s) contain the uploaded document:`
      );

      // Add all copied pages
      copiedPages.forEach((copiedPage, index) => {
        context.doc.addPage(copiedPage);
        console.log(`Added page ${index + 1} to final PDF`);
      });

      console.log(`Successfully embedded ${pageCount} pages from uploaded PDF`);
    } catch (copyError) {
      console.error("Failed to copy pages from uploaded PDF:", copyError);
      addSection(
        context,
        "Attached Document",
        `Document "${path.basename(
          filePath
        )}" was uploaded but pages could not be copied. The file may have restrictions or be corrupted.`
      );
    }
  } catch (error) {
    console.error("Error embedding uploaded PDF:", error);
    // Don't throw error, just add a note that embedding failed
    addSection(
      context,
      "Attached Document",
      `Document was uploaded but could not be embedded in this PDF. Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
