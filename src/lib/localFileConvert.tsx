import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export async function localConvertToPDFWithSignatures(
  folderPath: string,
  inputPath1: string
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
  const { stdout, stderr } = await execAsync(command, {
    env: {
      ...process.env,
      HOME: "/tmp", // Important: set a valid writable HOME
      USER: "ubuntu", // or your VM username
    },
  });

  if (stderr) {
    throw new Error(`LibreOffice error: ${stderr}`);
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

  return pdfPath;
}
