import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { extractDataFromToken } from "@/lib/jwttoken";
import { PrismaClient } from "@/generated/prisma";
import { localConvertToPDFWithSignatures } from "@/lib/localFileConvert";

const prisma = new PrismaClient();

async function validateRequest(req: Request) {
  const formData = await req.formData();
  const excelfile = formData.get("excelfile") as File;
  const wordfile = formData.get("wordfile") as File;
  const pptfile = formData.get("pptfile") as File;
  const textfile = formData.get("textfile") as File;
  const typingSpeedValue = formData.get("typingspeed");
  

  if (
    !excelfile ||
    !wordfile ||
    !pptfile ||
    !textfile ||
    !typingSpeedValue
  ) {
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

async function saveFile(folderPath: string, file: File) {
  const filePath = path.join(folderPath, file.name);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  fs.writeFileSync(filePath, fileBuffer);

  return filePath;
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

    const excelpath = await saveFile(originalfolderPath, excelfile);
    const wordpath = await saveFile(originalfolderPath, wordfile);
    const pptpath = await saveFile(originalfolderPath, pptfile);
    const textpath = await saveFile(originalfolderPath, textfile);

    const excelpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      excelpath
    );
    const wordpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      wordpath
    );
    const pptpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      pptpath
    );
    const textpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      textpath
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
      !fs.existsSync(excelpath) ||
      !fs.existsSync(wordpath) ||
      !fs.existsSync(pptpath) ||
      !fs.existsSync(textpath) ||
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

    await prisma.user.update({
      where: { email: user.email },
      data: {
      isSubmitted: true,
      typingspeed: Math.floor(parseFloat(typingSpeedValue as string)),
      ppturl: pptpdfpath,
      wordurl: wordpdfpath,
      excelurl: excelpdfpath,
      texturl: textpdfpath,
      submittedAt: istDate,
      mergedurl: mergedPdfFilePath,
      updatedAt: istDate,
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
