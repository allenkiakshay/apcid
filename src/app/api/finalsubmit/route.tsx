import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { extractDataFromToken } from "@/lib/jwttoken";
import { PrismaClient } from "@/generated/prisma";
import { localConvertToPDFWithSignatures } from "@/lib/localFileConvert";
import { createHash } from "crypto";

const prisma = new PrismaClient();

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

export async function GET(req: Request) {
  try {
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

    const { user } = tokenData as { user: { email: string } };

    if (!user) {
      return { error: "User not found", status: 404 };
    }

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

    const excelfile = await prisma.excelFile.findFirst({
      where: { userId: fetched_user.id },
      orderBy: { createdAt: "desc" },
    });

    const pptfile = await prisma.pptFile.findFirst({
      where: { userId: fetched_user.id },
      orderBy: { createdAt: "desc" },
    });

    const wordfile = await prisma.wordFile.findFirst({
      where: { userId: fetched_user.id },
      orderBy: { createdAt: "desc" },
    });

    const textfile = await prisma.textFile.findFirst({
      where: { userId: fetched_user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!excelfile || !pptfile || !wordfile || !textfile) {
      return NextResponse.json(
        { error: "All files must be uploaded before final submission" },
        { status: 400 }
      );
    }

    const exceloriginalPath = excelfile.oexcelurl;
    const pptoriginalPath = pptfile.oppturl;
    const wordoriginalPath = wordfile.owordurl;
    const textoriginalPath = textfile.otexturl;
    const excelpdfpath = excelfile.pexcelurl;
    const pptpdfpath = pptfile.pppturl;
    const wordpdfpath = wordfile.pwordurl;
    const textpdfpath = textfile.ptexturl;

    const mergedPdfPath = path.join(
      process.cwd(),
      "uploads",
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

    // wite context in the page from starting from 50px from left and 50px from bottom
    // Add a page heading
    const headingYOffset = newPage.getHeight() - 150; // Position below the logos
    newPage.drawText("Submission Report", {
      x: xOffset,
      y: headingYOffset,
      size: 28,
      color: rgb(0, 0, 0),
    });

    // Add word file details
    const wordFileName = wordoriginalPath.split("/").pop();
    const wordFileHash = (wordpdfpath.split("/").pop() ?? "").split(".")[0];

    newPage.drawText(`Word File: ${wordFileName}`, {
      x: xOffset,
      y: headingYOffset - 40,
      size: 10,
      color: rgb(0, 0, 0),
    });
    newPage.drawText(`Word File Hash: ${wordFileHash}`, {
      x: xOffset,
      y: headingYOffset - 70,
      size: 10,
      color: rgb(0, 0, 0),
    });

    // Add excel file details
    const excelFileName = path.basename(exceloriginalPath);
    const excelFileHash = (excelpdfpath.split("/").pop() ?? "").split(".")[0];

    newPage.drawText(`Excel File: ${excelFileName}`, {
      x: xOffset,
      y: headingYOffset - 100,
      size: 10,
      color: rgb(0, 0, 0),
    });
    newPage.drawText(`Excel File Hash: ${excelFileHash}`, {
      x: xOffset,
      y: headingYOffset - 130,
      size: 10,
      color: rgb(0, 0, 0),
    });

    // Add PPT file details
    const pptFileName = path.basename(pptoriginalPath);
    const pptFileHash = (pptpdfpath.split("/").pop() ?? "").split(".")[0];

    newPage.drawText(`PPT File: ${pptFileName}`, {
      x: xOffset,
      y: headingYOffset - 160,
      size: 10,
      color: rgb(0, 0, 0),
    });
    newPage.drawText(`PPT File Hash: ${pptFileHash}`, {
      x: xOffset,
      y: headingYOffset - 190,
      size: 10,
      color: rgb(0, 0, 0),
    });

    // Add text file details
    const textFileName = path.basename(textoriginalPath);
    const textFileHash = (textpdfpath.split("/").pop() ?? "").split(".")[0];

    newPage.drawText(`Text File: ${textFileName}`, {
      x: xOffset,
      y: headingYOffset - 220,
      size: 10,
      color: rgb(0, 0, 0),
    });
    newPage.drawText(`Text File Hash: ${textFileHash}`, {
      x: xOffset,
      y: headingYOffset - 250,
      size: 10,
      color: rgb(0, 0, 0),
    });

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
      !fs.existsSync(exceloriginalPath) ||
      !fs.existsSync(pptoriginalPath) ||
      !fs.existsSync(wordoriginalPath) ||
      !fs.existsSync(textoriginalPath) ||
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

    await prisma.submission.update({
      where: { userId: fetched_user.id },
      data: {
        mergedPdfUrl: mergedPdfFilePath,
        filesSubmitted: true,
      },
    });

    await prisma.user.update({
      where: { id: fetched_user.id },
      data: {
        isSubmitted: true,
        submittedAt: istDate,
      },
    });

    if (!fs.existsSync(mergedPdfFilePath)) {
      return new Response("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(mergedPdfFilePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fetched_user.hallticket}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
