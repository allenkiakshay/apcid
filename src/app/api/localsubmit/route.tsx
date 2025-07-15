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

export async function saveFile(
  folderPath: string,
  file: File,
  hallticketNo: string
) {
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const hash = createHash("sha256")
    .update(fileBuffer)
    .update(hallticketNo)
    .digest("hex");

  const ext = path.extname(file.name);
  const hashedFileName = `${hash}${ext}`;

  const filePath = path.join(folderPath, hashedFileName);

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

    const excelFileData = await saveFile(
      originalfolderPath,
      excelfile,
      fetched_user.hallticket
    );
    const wordFileData = await saveFile(
      originalfolderPath,
      wordfile,
      fetched_user.hallticket
    );
    const pptFileData = await saveFile(
      originalfolderPath,
      pptfile,
      fetched_user.hallticket
    );
    const textFileData = await saveFile(
      originalfolderPath,
      textfile,
      fetched_user.hallticket
    );

    const excelpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      excelFileData,
      fetched_user.hallticket
    );
    const wordpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      wordFileData,
      fetched_user.hallticket
    );
    const pptpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      pptFileData,
      fetched_user.hallticket
    );
    const textpdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      textFileData,
      fetched_user.hallticket
    );

    // Merge all PDFs into one
    const { PDFDocument, rgb } = await import("pdf-lib");
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

    // Add a new empty page with custom content
    const newPage = mergedPdf.addPage();

    const leftLogoPath = path.join(process.cwd(), "public", "ap_police.png");
    const rightLogoPath = path.join(process.cwd(), "public", "ap.png");

    if (!fs.existsSync(leftLogoPath)) {
      throw new Error(`Left logo file not found: ${leftLogoPath}`);
    }

    if (!fs.existsSync(rightLogoPath)) {
      throw new Error(`Right logo file not found: ${rightLogoPath}`);
    }

    const leftLogoBytes = fs.readFileSync(leftLogoPath);
    const rightLogoBytes = fs.readFileSync(rightLogoPath);

    const leftLogoImage = await mergedPdf.embedPng(leftLogoBytes);
    const rightLogoImage = await mergedPdf.embedPng(rightLogoBytes);

    const leftLogoWidth = 50; // Fixed width for left logo
    const leftLogoHeight = 50; // Fixed height for left logo
    const rightLogoWidth = 50; // Fixed width for right logo
    const rightLogoHeight = 50; // Fixed height for right logo

    const leftLogoXOffset = 50; // Distance from the left
    const leftLogoYOffset = newPage.getHeight() - leftLogoHeight - 20; // Distance from the top

    const rightLogoXOffset = newPage.getWidth() - rightLogoWidth - 50; // Distance from the right
    const rightLogoYOffset = newPage.getHeight() - rightLogoHeight - 20; // Distance from the top

    // Draw the left logo
    newPage.drawImage(leftLogoImage, {
      x: leftLogoXOffset,
      y: leftLogoYOffset,
      width: leftLogoWidth,
      height: leftLogoHeight,
    });

    // Draw the right logo
    newPage.drawImage(rightLogoImage, {
      x: rightLogoXOffset,
      y: rightLogoYOffset,
      width: rightLogoWidth,
      height: rightLogoHeight,
    });
    const yOffset = 50; // Distance from the bottom
    const xOffset = 50; // Distance from the left

    // Draw the provided signature
    const signatureWidth = 150; // Fixed width
    const signatureHeight = 50; // Fixed height
    const signatureImageBytes = fs.readFileSync(
      path.join(process.cwd(), "public", "sign.png")
    ); // Replace with actual path
    const signatureImage = await mergedPdf.embedPng(signatureImageBytes);
    newPage.drawImage(signatureImage, {
      x: xOffset,
      y: yOffset,
      width: signatureWidth,
      height: signatureHeight,
    });

    // Add names and designations side by side below the signature on the page
    const fontSize = 18;
    const textYOffset = yOffset - 20; // Position below the signature
    const spacing = 200; // Horizontal spacing between name-designation pairs

    const entries = [
      { name: "DGP" },
      { name: "Invigilator" },
      { name: "Candidate" },
    ];

    entries.forEach((entry, index) => {
      const xPosition = xOffset + index * spacing;
      newPage.drawText(entry.name, {
        x: xPosition,
        y: textYOffset,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
    });

    const mergedPdfBytes = await mergedPdf.save();
    const mergedPdfFileName = `merged_${fetched_user.hallticket}.pdf`;
    const mergedPdfFilePath = path.join(mergedPdfPath, mergedPdfFileName);

    fs.writeFileSync(mergedPdfFilePath, mergedPdfBytes);

    // Verify all the files were saved correctly

    if (
      !fs.existsSync(excelFileData) ||
      !fs.existsSync(wordFileData) ||
      !fs.existsSync(pptFileData) ||
      !fs.existsSync(textFileData) ||
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
        oexcelurl: excelFileData,
        oppturl: pptFileData,
        owordurl: wordFileData,
        otexturl: textFileData,
        pexcelurl: excelpdfpath,
        pppturl: pptpdfpath,
        pwordurl: wordpdfpath,
        ptexturl: textpdfpath,
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
