// import { PDFDocument } from "pdf-lib";
// import { uploadFileToS3 } from "./ImageUpload";

// export async function mergePDFsAndDownload(
//   pdfUrls: string[],
//   user: string
// ): Promise<String | undefined> {
//   try {
//     console.log("Merging PDFs:", pdfUrls);
//     const mergedPdf = await PDFDocument.create();

//     for (const url of pdfUrls) {
//       const response = await fetch(url);
//       const arrayBuffer = await response.arrayBuffer();

//       const pdf = await PDFDocument.load(arrayBuffer);
//       const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
//       copiedPages.forEach((page) => mergedPdf.addPage(page));
//     }

//     const mergedPdfBytes = await mergedPdf.save();

//     const FormData = require("form-data");
//     const formData = new FormData();
//     formData.append("file", Buffer.from(mergedPdfBytes), {
//       filename: "merged.pdf",
//     });

//     console.log("Uploading to S3...");
//     const resurl = await uploadFileToS3(formData, "merged", "pdf", `MergedPDF_${user}.pdf`);
//     console.log("Upload successful!");

//     return resurl;
//   } catch (error) {
//     console.error("Error merging PDFs:", error);
//   }
// }

import PDFMerger from "pdf-merger-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function mergePDFsAndDownload(
  pdfUrls: string[],
  user: string
): Promise<String | undefined> {
  var merger = new PDFMerger();
  try {
    const filepath = `apcid/mergedpdf/${user}.pdf`;

    for (const url of pdfUrls) {
      console.log("Adding PDF URL:", url);
      await merger.add(url);
    }

    await merger.setMetadata({
      title: `Merged PDF of ${user}`,
      author: user,
    });

    const mergedPdfPath = `public/merged_${user}.pdf`;
    await merger.save(mergedPdfPath);

    console.log("Uploading to S3...");
    const fs = require("fs");

    const mergedPdfBytes = fs.readFileSync(mergedPdfPath);

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: filepath,
      Body: mergedPdfBytes, // Buffer containing the modified PDF
      ContentType: "application/pdf", // Correct MIME type for PDF files
    };

    const uploadcommand = new PutObjectCommand(params);

    try {
      const data = await s3Client.send(uploadcommand);
      if (data.$metadata.httpStatusCode !== 200) {
        throw new Error("Failed to upload PDF file to S3");
      }

      return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filepath}`;
    } catch (err) {
      console.error("Error uploading PDF file to S3:", err);
      return undefined;
    }
  } catch (error) {
    console.error("Error merging PDFs:", error);
  }
}
