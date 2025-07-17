"use server";
import { PrismaClient } from "@/generated/prisma";
import { extractDataFromToken } from "@/lib/jwttoken";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const prisma = new PrismaClient();
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 401 });
    }

    const tokenData = extractDataFromToken(token);

    if (!tokenData || typeof tokenData !== "object" || !("user" in tokenData)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const fetched_user = await prisma.user.findUnique({
      where: { email: (tokenData as { user: { email: string } }).user.email },
    });

    if (!fetched_user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const excelfiles = await prisma.excelFile.findMany({
      where: { userId: fetched_user.id },
    });

    const pptfiles = await prisma.pptFile.findMany({
      where: { userId: fetched_user.id },
    });

    const Wordfiles = await prisma.wordFile.findMany({
      where: { userId: fetched_user.id },
    });

    const formattedData = {
      excel: excelfiles.map((file) => file.oexcelurl.split("/").pop()),
      word: Wordfiles.map((file) => file.owordurl.split("/").pop()),
      ppt: pptfiles.map((file) => file.oppturl.split("/").pop()),
    };

    if (excelfiles.length === 0) {
      return NextResponse.json(
        { message: "No Excel Files Uploaded", formattedData },
        { status: 400 }
      );
    }

    if (pptfiles.length === 0) {
      return NextResponse.json(
        { message: "No PPT Files Uploaded", formattedData },
        { status: 400 }
      );
    }

    if (Wordfiles.length === 0) {
      return NextResponse.json(
        { message: "No Word Files Uploaded", formattedData },
        { status: 400 }
      );
    }

    return NextResponse.json({ formattedData }, { status: 200 });
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
