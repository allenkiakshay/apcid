import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { extractDataFromToken } from "@/lib/jwttoken";
import { PrismaClient } from "@/generated/prisma";

export async function POST(req: Request) {
  const prisma = new PrismaClient();
  try {
    const formData = await req.formData();
    const excelfile = formData.get("excelfile") as File;
    const wordfile = formData.get("wordfile") as File;
    const pptfile = formData.get("pptfile") as File;
    const textfile = formData.get("textfile") as File;
    const typingSpeed = formData.get("typingspeed") as string;

    if (!excelfile || !wordfile || !pptfile || !textfile || !typingSpeed) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 401 });
    }

    const tokenData = extractDataFromToken(token);

    if (!tokenData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user =
      typeof tokenData === "object" && "user" in tokenData
        ? tokenData.user
        : null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    // Save files to the public/uploads directory
    const folderPath = path.join(
      process.cwd(),
      "uploads",
      fetched_user.hallticket
    );
    const excelfilePath = path.join(folderPath, excelfile.name);
    const excelfileBuffer = Buffer.from(await excelfile.arrayBuffer());
    const wordfilePath = path.join(folderPath, wordfile.name);
    const wordfileBuffer = Buffer.from(await wordfile.arrayBuffer());
    const pptfilePath = path.join(folderPath, pptfile.name);
    const pptfileBuffer = Buffer.from(await pptfile.arrayBuffer());
    const textfilePath = path.join(folderPath, textfile.name);
    const textfileBuffer = Buffer.from(await textfile.arrayBuffer());

    fs.writeFileSync(excelfilePath, excelfileBuffer);
    fs.writeFileSync(wordfilePath, wordfileBuffer);
    fs.writeFileSync(pptfilePath, pptfileBuffer);
    fs.writeFileSync(textfilePath, textfileBuffer);

    return NextResponse.json({
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}