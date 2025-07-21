import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { extractDataFromToken } from "@/lib/jwttoken";
import { PrismaClient } from "@/generated/prisma";
import { createCipheriv, createDecipheriv, createHash } from "crypto";
import os from "os";

const prisma = new PrismaClient();

// Function to get local IP address
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const networkInterface of interfaces[name] ?? []) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (networkInterface.family === "IPv4" && !networkInterface.internal) {
        return networkInterface.address;
      }
    }
  }
  return "localhost";
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

    const { user } = tokenData as { user: { hallticket: string } };

    if (!user) {
      return { error: "User not found", status: 404 };
    }

    const fetched_user = await prisma.user.findUnique({
      where: { hallticket: user.hallticket },
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

    // Get local IP address
    const localIP = getLocalIPAddress();

    // Merge all PDFs into one
    const { PDFDocument, rgb } = await import("pdf-lib");
    const mergedPdf = await PDFDocument.create();
    const oFiles = [
      exceloriginalPath,
      pptoriginalPath,
      wordoriginalPath,
      textoriginalPath,
    ];
    const pdfFiles = [excelpdfpath, wordpdfpath, pptpdfpath, textpdfpath];
    const originalFileNames = oFiles.map((filePath) => path.basename(filePath));

    // Add timestamp at bottom right
    const currentTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    for (const [index, pdfFile] of pdfFiles.entries()) {
      const pdfBytes = fs.readFileSync(pdfFile);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(
        pdfDoc,
        pdfDoc.getPageIndices()
      );

      for (const page of copiedPages) {
        // Add user details to each original document page
        page.drawText(
          `IP: ${localIP} | Name: ${
            fetched_user.name || "N/A"
          } | Hall Ticket: ${fetched_user.hallticket}`,
          {
            x: 50,
            y: page.getHeight() - 20,
            size: 8,
            color: rgb(0.3, 0.3, 0.3), // Gray color
          }
        );

        const timestampText = `Generated: ${currentTime}`;
        page.drawText(timestampText, {
          x: page.getWidth() - 200,
          y: 10,
          size: 6,
          color: rgb(0.5, 0.5, 0.5),
        });

        mergedPdf.addPage(page);
      }

      // Add a new page with logos and details after each PDF page
      const logoPage = mergedPdf.addPage();

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
      const leftLogoYOffset = logoPage.getHeight() - leftLogoHeight - 20; // Distance from the top

      const rightLogoXOffset = logoPage.getWidth() - rightLogoWidth - 50; // Distance from the right
      const rightLogoYOffset = logoPage.getHeight() - rightLogoHeight - 20; // Distance from the top

      // Draw the left logo
      logoPage.drawImage(leftLogoImage, {
        x: leftLogoXOffset,
        y: leftLogoYOffset,
        width: leftLogoWidth,
        height: leftLogoHeight,
      });

      // Draw the right logo
      logoPage.drawImage(rightLogoImage, {
        x: rightLogoXOffset,
        y: rightLogoYOffset,
        width: rightLogoWidth,
        height: rightLogoHeight,
      });

      const yOffset = 50; // Distance from the bottom
      const xOffset = 50; // Distance from the left

      // Add a page heading
      const headingYOffset = logoPage.getHeight() - 150; // Position below the logos
      logoPage.drawText("Submission Report", {
        x: xOffset,
        y: headingYOffset,
        size: 28,
        color: rgb(0, 0, 0),
      });

      // Add user details section
      logoPage.drawText(`Submitted by: ${fetched_user.name || "N/A"}`, {
        x: xOffset,
        y: headingYOffset - 50,
        size: 12,
        color: rgb(0, 0, 0),
      });
      logoPage.drawText(`Hall Ticket: ${fetched_user.hallticket}`, {
        x: xOffset,
        y: headingYOffset - 70,
        size: 12,
        color: rgb(0, 0, 0),
      });
      logoPage.drawText(`IP Address: ${localIP}`, {
        x: xOffset,
        y: headingYOffset - 90,
        size: 12,
        color: rgb(0, 0, 0),
      });
      logoPage.drawText(`Submission Time: ${currentTime}`, {
        x: xOffset,
        y: headingYOffset - 110,
        size: 10,
        color: rgb(0, 0, 0),
      });

      // Add original file name and PDF file name
      const originalFileName = originalFileNames[index];
      const pdfFileName = path.basename(pdfFile);

      logoPage.drawText(`Original File: ${originalFileName}`, {
        x: xOffset,
        y: headingYOffset - 140,
        size: 10,
        color: rgb(0, 0, 0),
      });
      logoPage.drawText(`PDF File: ${pdfFileName}`, {
        x: xOffset,
        y: headingYOffset - 160,
        size: 10,
        color: rgb(0, 0, 0),
      });

      // Add watermark-style user info at bottom
      logoPage.drawText(
        `IP: ${localIP} | ${fetched_user.name || "N/A"} | ${
          fetched_user.hallticket
        }`,
        {
          x: xOffset,
          y: 30,
          size: 8,
          color: rgb(0.3, 0.3, 0.3),
        }
      );
    }

    const mergedPdfBytes = await mergedPdf.save();
    const mergedPdfFileName = `merged_${fetched_user.hallticket}.pdf`;
    const mergedPdfFilePath = path.join(mergedPdfPath, mergedPdfFileName);

    // Encrypt the PDF bytes using provided encryption parameters
    const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");
    const encryptionIv = Buffer.from(process.env.ENCRYPTION_IV || "", "hex");
    const encryptionAlgorithm =
      process.env.ENCRYPTION_ALGORITHM || "aes-256-cbc";

    const cipher = createCipheriv(
      encryptionAlgorithm,
      encryptionKey,
      encryptionIv
    );
    const encryptedPdfBytes = Buffer.concat([
      cipher.update(mergedPdfBytes),
      cipher.final(),
    ]);

    fs.writeFileSync(mergedPdfFilePath, encryptedPdfBytes);

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

    const encryptedFileBuffer = fs.readFileSync(mergedPdfFilePath);

    const decipher = createDecipheriv(
      encryptionAlgorithm,
      encryptionKey,
      encryptionIv
    );
    const fileBuffer = Buffer.concat([
      decipher.update(encryptedFileBuffer),
      decipher.final(),
    ]);

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
