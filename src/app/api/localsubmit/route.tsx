import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { extractDataFromToken } from "@/lib/jwttoken";
import { PrismaClient } from "@/generated/prisma";
import { localConvertToPDFWithSignatures } from "@/lib/localFileConvert";
import { createHash } from "crypto";

const prisma = new PrismaClient();

async function validateRequest(req: Request) {
  const formData = await req.formData();
  const excelfile = formData.get("excelfile") as File;
  const wordfile = formData.get("wordfile") as File;
  const pptfile = formData.get("pptfile") as File;
  const textfile = formData.get("textfile") as File;
  const typingSpeedValue = formData.get("typingspeed");

  if (!excelfile || !wordfile || !pptfile || !textfile || !typingSpeedValue) {
    return {
      error: "Missing required fields or invalid typingSpeed",
      status: 400,
    };
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized", status: 401 };
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return { error: "Token is required", status: 401 };
  }

  const tokenData = extractDataFromToken(token);

  if (!tokenData) {
    return { error: "Invalid token", status: 401 };
  }

  const user =
    typeof tokenData === "object" && "user" in tokenData
      ? tokenData.user
      : null;

  if (!user) {
    return { error: "User not found", status: 404 };
  }

  return { excelfile, wordfile, pptfile, textfile, typingSpeedValue, user };
}

export async function saveFile(folderPath: string, file: File) {
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // 🔒 Step 1: Create a SHA-256 hash of the file content
  const hash = createHash("sha256").update(fileBuffer).digest("hex");

  // Optional: Use hash in filename
  const ext = path.extname(file.name);
  const hashedFileName = `${hash}${ext}`;

  const filePath = path.join(folderPath, hashedFileName);

  // 🔧 Step 2: Ensure folder exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // 💾 Step 3: Save file to disk
  fs.writeFileSync(filePath, fileBuffer);

  // 🧾 Step 4: Return file path and hash
  return {
    filePath,
    hash,
    originalName: file.name,
    storedName: hashedFileName,
  };
}

export async function POST(req: Request) {
  try {
    const validationResult = await validateRequest(req);

    if ("error" in validationResult) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.status }
      );
    }

    const { excelfile, wordfile, pptfile, textfile, user, typingSpeedValue } =
      validationResult;

    const fetched_user = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!fetched_user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (fetched_user.isSubmitted === true) {
      return NextResponse.json(
        { error: "Data already submitted" },
        { status: 400 }
      );
    }

    const originalfolderPath = path.join(
      process.cwd(),
      "uploads",
      fetched_user.hallticket,
      "original"
    );

    const pdfFolderPath = path.join(
      process.cwd(),
      "uploads",
      fetched_user.hallticket,
      "pdf"
    );

    const mergedPdfPath = path.join(
      process.cwd(),
      "uploads",
      fetched_user.hallticket
    );

    const excelFileData = await saveFile(originalfolderPath, excelfile);
    const wordFileData = await saveFile(originalfolderPath, wordfile);
    const pptFileData = await saveFile(originalfolderPath, pptfile);
    const textFileData = await saveFile(originalfolderPath, textfile);

    const excelpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      excelFileData.filePath
    );
    const wordpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      wordFileData.filePath
    );
    const pptpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      pptFileData.filePath
    );
    const textpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      textFileData.filePath
    );

    // Merge all PDFs into one
    const { PDFDocument } = await import("pdf-lib");
    const mergedPdf = await PDFDocument.create();
    const pdfFiles = [excelpdfpath, wordpdfpath, pptpdfpath, textpdfpath];
    for (const pdfFile of pdfFiles) {
      const pdfBytes = fs.readFileSync(pdfFile);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(
        pdfDoc,
        pdfDoc.getPageIndices()
      );
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    const mergedPdfBytes = await mergedPdf.save();
    const mergedPdfFileName = `merged_${fetched_user.hallticket}.pdf`;
    const mergedPdfFilePath = path.join(mergedPdfPath, mergedPdfFileName);

    fs.writeFileSync(mergedPdfFilePath, mergedPdfBytes);

    // Verify all the files were saved correctly

    if (
      !fs.existsSync(excelFileData.filePath) ||
      !fs.existsSync(wordFileData.filePath) ||
      !fs.existsSync(pptFileData.filePath) ||
      !fs.existsSync(textFileData.filePath) ||
      !fs.existsSync(excelpdfpath) ||
      !fs.existsSync(wordpdfpath) ||
      !fs.existsSync(pptpdfpath) ||
      !fs.existsSync(textpdfpath) ||
      !fs.existsSync(mergedPdfFilePath)
    ) {
      return NextResponse.json(
        { error: "Failed to save one or more files resubmit the files" },
        { status: 500 }
      );
    }

    // Update user submission status
    const istDate = new Date();
    istDate.setMinutes(istDate.getMinutes() + 330); // Convert UTC to IST (UTC+5:30)

    const upload = await prisma.submission.create({
      data: {
        userId: fetched_user.id,
        excelurl: excelpdfpath,
        ppturl: pptpdfpath,
        wordurl: wordpdfpath,
        texturl: textpdfpath,
        mergedurl: mergedPdfFilePath,
        typingspeed: parseInt(typingSpeedValue as string, 10),
      },
    });

    await prisma.user.update({
      where: { id: upload.userId },
      data: {
        isSubmitted: true,
        submittedAt: istDate,
      },
    });

    return NextResponse.json(
      {
        message: "File uploaded successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
