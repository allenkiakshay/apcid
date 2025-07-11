import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const execAsync = promisify(exec);

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function downloadFile(
  fileUrl: string,
  outputPath: string
): Promise<void> {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`Failed to download: ${fileUrl}`);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(outputPath, buffer);
}

export async function convertToPDFWithSignatures(
  inputPath: string,
  signaturePath: string,
  s3filepath: string,
  s3fileName: string
): Promise<string> {
  const publicDir = path.join(process.cwd(), "public", `upload_${Date.now()}`);
  fs.mkdirSync(publicDir, { recursive: true });

  const inputPath1 = path.join(publicDir, `${s3fileName}.${s3filepath}`);

  await downloadFile(inputPath, inputPath1);

  const command = `libreoffice --headless --convert-to pdf --outdir "${publicDir}" "${inputPath1}"`;
  const { stderr } = await execAsync(command);
  if (stderr) {
    throw new Error(`Failed to convert file to PDF: ${stderr}`);
  }

  const fileName = path
    .basename(inputPath1)
    .replace(/\.(docx?|xlsx?|txt?|ppt?|pptx?|xls?|doc)$/, ".pdf");
  const pdfPath = path.join(publicDir, fileName);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found after conversion: ${pdfPath}`);
  }

  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdfBytes = fs.readFileSync(pdfPath);

  // Validate PDF header
  if (!pdfBytes.toString("utf8", 0, 5).startsWith("%PDF-")) {
    throw new Error(`Invalid PDF file: ${pdfPath}`);
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);

  const signatureBytes = fs.readFileSync(signaturePath);
  const signatureImage = await pdfDoc.embedPng(signatureBytes);

  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);

    const yOffset = 50; // Distance from the bottom
    const xOffset = 50; // Distance from the left

    // Draw the provided signature
    const signatureWidth = 150; // Fixed width
    const signatureHeight = 50; // Fixed height
    page.drawImage(signatureImage, {
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
      page.drawText(entry.name, {
        x: xPosition,
        y: textYOffset,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
    });
  }

  const modifiedPdfBytes = await pdfDoc.save();
  fs.writeFileSync(pdfPath, modifiedPdfBytes);

  const filepath = `apcid/pdf/${s3filepath}/${s3fileName}.pdf`;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: filepath,
    Body: modifiedPdfBytes, // Buffer containing the modified PDF
    ContentType: "application/pdf", // Correct MIME type for PDF files
  };

  const uploadcommand = new PutObjectCommand(params);

  try {
    const data = await s3Client.send(uploadcommand);
    if (data.$metadata.httpStatusCode !== 200) {
      throw new Error("Failed to upload PDF file to S3");
    }

    fs.rmSync(publicDir, { recursive: true, force: true });

    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/apcid/pdf/${s3filepath}/${s3fileName}.pdf`;
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error uploading PDF file to S3:", err.message);
      throw new Error(err.message || "PDF file upload failed");
    } else {
      console.error("Error uploading PDF file to S3:", err);
      throw new Error("PDF file upload failed");
    }
  }
}
