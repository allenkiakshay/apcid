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

    // Fetch all available files (some might be null)
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

    // Create arrays of available files only
    const availableFiles = [];
    const availableOriginalPaths = [];
    const availablePdfPaths = [];
    const availableFileNames = [];

    if (
      excelfile &&
      fs.existsSync(excelfile.oexcelurl) &&
      fs.existsSync(excelfile.pexcelurl)
    ) {
      availableFiles.push({ type: "Excel", file: excelfile });
      availableOriginalPaths.push(excelfile.oexcelurl);
      availablePdfPaths.push(excelfile.pexcelurl);
      availableFileNames.push(path.basename(excelfile.oexcelurl));
    }

    if (
      pptfile &&
      fs.existsSync(pptfile.oppturl) &&
      fs.existsSync(pptfile.pppturl)
    ) {
      availableFiles.push({ type: "PowerPoint", file: pptfile });
      availableOriginalPaths.push(pptfile.oppturl);
      availablePdfPaths.push(pptfile.pppturl);
      availableFileNames.push(path.basename(pptfile.oppturl));
    }

    if (
      wordfile &&
      fs.existsSync(wordfile.owordurl) &&
      fs.existsSync(wordfile.pwordurl)
    ) {
      availableFiles.push({ type: "Word", file: wordfile });
      availableOriginalPaths.push(wordfile.owordurl);
      availablePdfPaths.push(wordfile.pwordurl);
      availableFileNames.push(path.basename(wordfile.owordurl));
    }

    if (
      textfile &&
      fs.existsSync(textfile.otexturl) &&
      fs.existsSync(textfile.ptexturl)
    ) {
      availableFiles.push({ type: "Text", file: textfile });
      availableOriginalPaths.push(textfile.otexturl);
      availablePdfPaths.push(textfile.ptexturl);
      availableFileNames.push(path.basename(textfile.otexturl));
    }

    // Check if at least one file is available for submission
    if (availableFiles.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid files found for submission. Please upload at least one file.",
        },
        { status: 400 }
      );
    }

    console.log(
      `Submitting ${availableFiles.length} files for user ${fetched_user.hallticket}:`
    );
    availableFiles.forEach((file) => console.log(`- ${file.type}`));

    const mergedPdfPath = path.join(
      process.cwd(),
      "uploads",
      fetched_user.hallticket
    );

    // Get local IP address
    const localIP = getLocalIPAddress();

    // Merge all available PDFs into one
    const { PDFDocument, rgb } = await import("pdf-lib");
    const mergedPdf = await PDFDocument.create();

    for (const [index, pdfFile] of availablePdfPaths.entries()) {
      try {
        const pdfBytes = fs.readFileSync(pdfFile);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(
          pdfDoc,
          pdfDoc.getPageIndices()
        );

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

        const timestampText = `Generated: ${currentTime}`;

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

        logoPage.drawText(
          `IP: ${localIP} | Name: ${
            fetched_user.name || "N/A"
          } | Hall Ticket: ${fetched_user.hallticket}`,
          {
            x: 50,
            y: logoPage.getHeight() - 20,
            size: 8,
            color: rgb(0.3, 0.3, 0.3), // Gray color
          }
        );

        const leftLogoPath = path.join(
          process.cwd(),
          "public",
          "ap_police.png"
        );
        const rightLogoPath = path.join(process.cwd(), "public", "ap.png");

        // Check if logo files exist before trying to use them
        let leftLogoImage, rightLogoImage;

        if (fs.existsSync(leftLogoPath)) {
          try {
            const leftLogoBytes = fs.readFileSync(leftLogoPath);
            leftLogoImage = await mergedPdf.embedPng(leftLogoBytes);
          } catch (error) {
            console.warn("Failed to embed left logo:", error);
          }
        }

        if (fs.existsSync(rightLogoPath)) {
          try {
            const rightLogoBytes = fs.readFileSync(rightLogoPath);
            rightLogoImage = await mergedPdf.embedPng(rightLogoBytes);
          } catch (error) {
            console.warn("Failed to embed right logo:", error);
          }
        }

        const logoWidth = 50;
        const logoHeight = 50;
        const leftLogoXOffset = 50;
        const leftLogoYOffset = logoPage.getHeight() - logoHeight - 20;
        const rightLogoXOffset = logoPage.getWidth() - logoWidth - 50;
        const rightLogoYOffset = logoPage.getHeight() - logoHeight - 20;

        // Draw logos if they were successfully loaded
        if (leftLogoImage) {
          logoPage.drawImage(leftLogoImage, {
            x: leftLogoXOffset,
            y: leftLogoYOffset,
            width: logoWidth,
            height: logoHeight,
          });
        }

        if (rightLogoImage) {
          logoPage.drawImage(rightLogoImage, {
            x: rightLogoXOffset,
            y: rightLogoYOffset,
            width: logoWidth,
            height: logoHeight,
          });
        }

        const yOffset = 50;
        const xOffset = 50;

        // Add a page heading
        const headingYOffset = logoPage.getHeight() - 150;
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

        // Add file type and names
        const fileType = availableFiles[index].type;
        const originalFileName = availableFileNames[index];
        const pdfFileName = path.basename(pdfFile);

        logoPage.drawText(`File Type: ${fileType}`, {
          x: xOffset,
          y: headingYOffset - 130,
          size: 10,
          color: rgb(0, 0, 0),
        });
        logoPage.drawText(`Original File: ${originalFileName}`, {
          x: xOffset,
          y: headingYOffset - 150,
          size: 10,
          color: rgb(0, 0, 0),
        });
        logoPage.drawText(`PDF File: ${pdfFileName}`, {
          x: xOffset,
          y: headingYOffset - 170,
          size: 10,
          color: rgb(0, 0, 0),
        });

        // Add summary of submitted files
        logoPage.drawText(`Total Files Submitted: ${availableFiles.length}`, {
          x: xOffset,
          y: headingYOffset - 200,
          size: 10,
          color: rgb(0, 0, 0),
        });

        const fileTypesList = availableFiles.map((f) => f.type).join(", ");
        logoPage.drawText(`File Types: ${fileTypesList}`, {
          x: xOffset,
          y: headingYOffset - 220,
          size: 10,
          color: rgb(0, 0, 0),
        });

        logoPage.drawText(timestampText, {
          x: logoPage.getWidth() - 200,
          y: 10,
          size: 6,
          color: rgb(0.5, 0.5, 0.5),
        });

        // Draw the provided signature
        const signatureWidth = 150; // Fixed width
        const signatureHeight = 50; // Fixed height
        const signaturePath = path.join(process.cwd(), "public", "sign.png");
        const signatureBytes = fs.readFileSync(signaturePath);
        const signatureImage = await mergedPdf.embedPng(signatureBytes);
        logoPage.drawImage(signatureImage, {
          x: xOffset,
          y: yOffset,
          width: signatureWidth,
          height: signatureHeight,
        });

        // Add names and designations side by side below the signature on every page
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
          logoPage.drawText(entry.name, {
            x: xPosition,
            y: textYOffset,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
        });
      } catch (pdfError) {
        console.error(`Error processing PDF file ${pdfFile}:`, pdfError);
        // Continue with other files even if one fails
      }
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

    // Verify the merged PDF was saved correctly
    if (!fs.existsSync(mergedPdfFilePath)) {
      return NextResponse.json(
        { error: "Failed to save merged PDF file" },
        { status: 500 }
      );
    }

    // Update user submission status
    const istDate = new Date();
    istDate.setMinutes(istDate.getMinutes() + 330); // Convert UTC to IST (UTC+5:30)

    // Update or create submission record
    const existingSubmission = await prisma.submission.findFirst({
      where: { userId: fetched_user.id },
    });

    if (existingSubmission) {
      await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          mergedPdfUrl: mergedPdfFilePath,
          filesSubmitted: true,
        },
      });
    } else {
      await prisma.submission.create({
        data: {
          userId: fetched_user.id,
          mergedPdfUrl: mergedPdfFilePath,
          filesSubmitted: true,
          textSubmitted: !!textfile,
        },
      });
    }

    await prisma.user.update({
      where: { id: fetched_user.id },
      data: {
        isSubmitted: true,
        submittedAt: istDate,
      },
    });

    // Decrypt and return the PDF
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
    console.error("Error in final submission:", error);
    return NextResponse.json(
      { 
        error: "Failed to process final submission", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
