"use server";

import { PrismaClient } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { extractDataFromToken } from "@/lib/jwttoken";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  const prisma = new PrismaClient();
  try {
    const body = await req.formData();
    const userfile = body.get("questionpaper") as File;
    const examslot = body.get("examslot") as string;
    const examdate = body.get("examdate") as string;
    const password = body.get("password") as string;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { error: "Unauthorized", status: 401 };
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return { error: "Token is required", status: 401 };
    }

    const tokenData = extractDataFromToken(token);

    if (!tokenData) {
      return { error: "Invalid token", status: 401 };
    }

    const user =
      typeof tokenData === "object" && "user" in tokenData
        ? tokenData.user
        : null;

    if (!user) {
      return { error: "User not found", status: 404 };
    }

    const fetched_user = await prisma.user.findUnique({
      where: { hallticket: user.hallticket },
      select: { role: true },
    });

    if (!fetched_user || fetched_user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized access. Admins only." },
        { status: 403 }
      );
    }

    if (!userfile) {
      return NextResponse.json(
        { error: "No file uploaded or invalid file type." },
        { status: 400 }
      );
    }

    if (!examslot || !examdate) {
      return NextResponse.json(
        { error: "Examslot and examdate are required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (!userfile.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed." },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "QPS");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, userfile.name);
    const fileStream = fs.createWriteStream(filePath);

    const reader = userfile.stream().getReader();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (value) {
        fileStream.write(Buffer.from(value));
      }
      done = readerDone;
    }

    fileStream.end();

    const hashedOtp = bcrypt.hashSync(password, 10);

    const prevqp = await prisma.questionPaper.findFirst({
      where: {
        examslot,
        examdate,
      },
    });

    if (prevqp) {
      await prisma.questionPaper.update({
        where: { id: prevqp.id },
        data: {
          fileUrl: filePath,
          ...(password ? { password: hashedOtp } : {}),
        },
      });

      return NextResponse.json(
        { message: "Question Paper updated successfully." },
        { status: 200 }
      );
    }

    await prisma.questionPaper.create({
      data: {
        fileUrl: filePath,
        examslot,
        examdate,
        password: hashedOtp,
      },
    });

    return NextResponse.json(
      { message: "Question Paper Added successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "An error occurred while processing the request." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
