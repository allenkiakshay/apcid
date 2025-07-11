"use server";
import { PrismaClient } from "@/generated/prisma";
import { convertToPDFWithSignatures } from "@/lib/convertToPDF";
import { extractDataFromToken } from "@/lib/jwttoken";
import { mergePDFsAndDownload } from "@/lib/mergePdf";
import { NextResponse } from "next/server";
import path from "path";

export async function POST(request: Request) {
  const prisma = new PrismaClient();
  try {
    const body = await request.json();
    const { excelurl, wordurl, ppturl, texturl,typingspeed } = body;

    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 401 });
    }

    if (!excelurl || !wordurl || !ppturl || !texturl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const tokenData = extractDataFromToken(token);

    if (!tokenData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const user =
      typeof tokenData === "object" && "user" in tokenData
        ? tokenData.user
        : null;

    const fetched_user = await prisma.user.findUnique({
      where: { email: user?.email },
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

    const signaturePath = path.join(process.cwd(), "public", "sign.png"); // Replace with actual signature path

    const pdfexcelurl = await convertToPDFWithSignatures(
      excelurl,
      signaturePath,
      "xlsx",
      fetched_user.hallticket
    );

    if (!pdfexcelurl) {
      return NextResponse.json(
        { error: "Failed to convert Excel to PDF" },
        { status: 500 }
      );
    }

    const pdfwordurl = await convertToPDFWithSignatures(
      wordurl,
      signaturePath,
      "docx",
      fetched_user.hallticket
    );

    if (!pdfwordurl) {
      return NextResponse.json(
        { error: "Failed to convert Word to PDF" },
        { status: 500 }
      );
    }

    const pdfppturl = await convertToPDFWithSignatures(
      ppturl,
      signaturePath,
      "pptx",
      fetched_user.hallticket
    );

    if (!pdfppturl) {
      return NextResponse.json(
        { error: "Failed to convert PPT to PDF" },
        { status: 500 }
      );
    }

    const texturlWithSignature = await convertToPDFWithSignatures(
      texturl,
      signaturePath,
      "txt",
      fetched_user.hallticket
    );

    if (!texturlWithSignature) {
      return NextResponse.json(
        { error: "Failed to convert Text to PDF" },
        { status: 500 }
      );
    }

    const mergedurl = await mergePDFsAndDownload(
      [pdfexcelurl, pdfwordurl, pdfppturl, texturlWithSignature],
      fetched_user.hallticket
    );

    if (!mergedurl) {
      return NextResponse.json(
        { error: "Failed to merge PDFs" },
        { status: 500 }
      );
    }

    await prisma.user.update({
      where: { email: user.email },
      data: {
        excelurl,
        wordurl,
        ppturl,
        texturl,
        typingspeed,
        mergedurl: String(mergedurl),
        isSubmitted: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Data submitted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
