import path from "path";
import fs from "fs";
import { extractDataFromToken } from "@/lib/jwttoken";
import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import bcrypt from "bcrypt";

export async function GET(req: Request) {
  const prisma = new PrismaClient();

  try {
    // Extract Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 401 });
    }

    // Validate token and extract data
    const tokenData = extractDataFromToken(token);
    if (!tokenData || typeof tokenData !== "object" || !("user" in tokenData)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { user } = tokenData as { user: { id: string } };

    if (!user || !user.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch user from database
    const fetchedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!fetchedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch question paper based on user's exam slot and date
    const questionPaper = await prisma.questionPaper.findFirst({
      where: {
        examslot: fetchedUser.examslot,
        examdate: fetchedUser.examdate,
      },
    });

    if (!questionPaper) {
      return NextResponse.json(
        { error: "Question paper not found" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(questionPaper.fileUrl)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read the file and return it as a response
    const fileBuffer = fs.readFileSync(questionPaper.fileUrl);
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", 'inline; filename="Question Paper.pdf"');

    return new Response(fileBuffer, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error("Error fetching the file:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
