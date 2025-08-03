-- CreateTable
CREATE TABLE
    "UserSubmission" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "jobDescription" TEXT NOT NULL,
        "uploadedFilePath" TEXT,
        "uploadedFileName" TEXT,
        "generatedPdfPath" TEXT,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
    );