import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const execAsync = promisify(exec);

export async function localConvertToPDFWithSignatures(
  folderPath: string,
  inputPath1: string,
  hallticketNo: string
): Promise<string> {
  const signaturePath = path.join(process.cwd(), "public", "sign.png");

  if (!fs.existsSync(signaturePath)) {
    throw new Error(`Signature file not found: ${signaturePath}`);
  }

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  if (!fs.existsSync(inputPath1)) {
    throw new Error(`Input file not found: ${inputPath1}`);
  }

  const command = `libreoffice --headless --convert-to pdf --outdir "${folderPath}" "${inputPath1}"`;
  const { stderr } = await execAsync(command);
  if (stderr && !stderr.includes("SyntaxWarning")) {
    throw new Error(`Failed to convert file to PDF: ${stderr}`);
  }

  const fileName = path
    .basename(inputPath1)
    .replace(/\.(docx?|xlsx?|txt?|ppt?|pptx?|xls?|doc)$/, ".pdf");

  const pdfPath = path.join(folderPath, fileName);

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

    const leftLogoImage = await pdfDoc.embedPng(leftLogoBytes);
    const rightLogoImage = await pdfDoc.embedPng(rightLogoBytes);

    const leftLogoWidth = 50; // Fixed width for left logo
    const leftLogoHeight = 50; // Fixed height for left logo
    const rightLogoWidth = 50; // Fixed width for right logo
    const rightLogoHeight = 50; // Fixed height for right logo

    const leftLogoXOffset = 50; // Distance from the left
    const leftLogoYOffset = page.getHeight() - leftLogoHeight - 20; // Distance from the top

    const rightLogoXOffset = page.getWidth() - rightLogoWidth - 50; // Distance from the right
    const rightLogoYOffset = page.getHeight() - rightLogoHeight - 20; // Distance from the top

    // Draw the left logo
    page.drawImage(leftLogoImage, {
      x: leftLogoXOffset,
      y: leftLogoYOffset,
      width: leftLogoWidth,
      height: leftLogoHeight,
    });

    // Draw the right logo
    page.drawImage(rightLogoImage, {
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

  // Generate a hash of the modified PDF content
  const hash = crypto
    .createHash("sha256")
    .update(modifiedPdfBytes)
    .update(hallticketNo)
    .digest("hex");
  const hashedFileName = `${hash}.pdf`;
  const hashedPdfPath = path.join(folderPath, hashedFileName);

  fs.writeFileSync(hashedPdfPath, modifiedPdfBytes);

  // Remove the original file
  fs.unlinkSync(pdfPath);

  return hashedPdfPath;
}
