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
    const pptfile = body.get("pptfile") as File;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!pptfile) {
      return NextResponse.json(
        { message: "ppt file is required" },
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

    const originalpath = await saveFile(originalfolderPath, pptfile);

    const pdfpath = await localConvertToPDFWithSignatures(
      pdfFolderPath,
      originalpath,
      fetched_user.hallticket
    );

    const formData = new FormData();
    const cfileBuffer = fs.readFileSync(originalpath);
    const cfileBlob = new Blob([cfileBuffer]);
    const ofilepath = path.join(process.cwd(), "uploads/QPS/REF.pptx");
    const ofileBlob = new Blob([cfileBuffer]);
    formData.append("candidate", ofileBlob, path.basename(ofilepath));
    formData.append("reference", cfileBlob, path.basename(originalpath));

    // const response = await fetch(
    //   "https://exam-management-system-2ed1.onrender.com/api/evaluate",
    //   {
    //     method: "POST",
    //     body: formData,
    //   }
    // );

    // const responseData = await response.json();

    // if (!response.ok) {
    //   return NextResponse.json(
    //     { message: "Failed to upload file to external API" },
    //     { status: 500 }
    //   );
    // }

    const fielEntryExists = await prisma.pptFile.findFirst({
      where: { userId: fetched_user.id },
      orderBy: { createdAt: "desc" },
    });

    if (fielEntryExists) {
      await prisma.pptFile.create({
        data: {
          userId: fetched_user.id,
          oppturl: originalpath,
          pppturl: pdfpath,
          // score: responseData.report.total
        },
      });
      return NextResponse.json(
        { message: "ppt File Updated Successfully" },
        { status: 200 }
      );
    }

    await prisma.pptFile.create({
      data: {
        userId: fetched_user.id,
        oppturl: originalpath,
        pppturl: pdfpath,
        // score: responseData.report.total
      },
    });

    return NextResponse.json(
      { message: "ppt File submitted successfully" },
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
