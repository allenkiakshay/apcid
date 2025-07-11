import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

// Create S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function uploadFileToS3(
  file: File,
  fileType1: string,
  fileType2: string,
  filename: string,
): Promise<string> {
  if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
    throw new Error("AWS environment variables are not properly configured.");
  }

  const timestamp = Date.now();
  const filepath =
    fileType2 === "qp"
      ? `apcid/Question Paper.pdf`
      : `apcid/${fileType1}/${fileType2}/${filename}`;

  // Ensure the file is a valid Blob or Buffer
  const buffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(buffer);

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: filepath,
    Body: fileBuffer, // Convert File to Buffer
    ContentType: file.type, // Optional: Ensure correct MIME type
  };

  const command = new PutObjectCommand(params);

  try {
    const data = await s3Client.send(command);

    if (data.$metadata.httpStatusCode !== 200) {
      throw new Error("Failed to upload file");
    }

    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/apcid/${fileType1}/${fileType2}/${filename}`;
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error uploading file:", err.message);
      throw new Error(err.message || "File upload failed");
    } else {
      console.error("Error uploading file:", err);
      throw new Error("File upload failed");
    }
  }
}
