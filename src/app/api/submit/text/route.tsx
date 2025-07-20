"use server";

import { PrismaClient } from "@/generated/prisma";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { localConvertToPDFWithSignatures } from "@/lib/localFileConvert";

export async function saveFile(folderPath: string, file: File) {
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const filePath = path.join(folderPath, file.name);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  fs.writeFileSync(filePath, fileBuffer);

  return filePath;
}

export async function POST(request: Request) {
  const prisma = new PrismaClient();

  try {
    const authHeader = request.headers.get("Authorization");
    const body = await request.formData();
    const textFile = body.get("textfile") as File;
    const typingSpeed = body.get("typingspeed");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!textFile) {
      return NextResponse.json(
        { message: "Text file is required" },
        { status: 400 }
      );
    }

    if (!typingSpeed || isNaN(Number(typingSpeed))) {
      return NextResponse.json(
        { message: "Typing speed is required" },
        { status: 400 }
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tokenData = JSON.parse(atob(token.split(".")[1]));

    if (!tokenData || !tokenData.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { user } = tokenData;

    const fetched_user = await prisma.user.findUnique({
      where: { hallticket: user.hallticket },
    });

    if (!fetched_user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
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

    const originalpath = await saveFile(originalfolderPath, textFile);

    const pdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      originalpath,
      fetched_user.hallticket
    );

    const formData = new FormData();
    const candidateText = fs.readFileSync(originalpath, "utf-8");
    const referenceTextPath = path.join(process.cwd(), "uploads/QPS/REF.txt");
    const referenceText = fs.readFileSync(referenceTextPath, "utf-8");

    formData.append("candidate_text", candidateText);
    formData.append("reference_text", referenceText);
    formData.append("typing_speed", typingSpeed);

    const response = await fetch(
      "https://exam-management-system-2ed1.onrender.com/api/evaluate",
      {
        method: "POST",
        body: formData,
      }
    );

    const responseData = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { message: "Failed to upload file to external API" },
        { status: 500 }
      );
    }

    await prisma.textFile.create({
      data: {
        userId: fetched_user.id,
        otexturl: originalpath,
        ptexturl: pdfpath,
        typingspeed: Number(typingSpeed),
        score: responseData.report.total,
        typingScore: responseData.report.typing_speed.score,
      },
    });

    await prisma.submission.create({
      data: {
        userId: fetched_user.id,
        textSubmitted: true,
      },
    });

    return NextResponse.json(
      { message: "Text submitted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting text:", error);
    return NextResponse.json(
      { message: "Failed to submit text" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
