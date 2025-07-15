import path from "path";
import fs from "fs";
import { extractDataFromToken } from "@/lib/jwttoken";
import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

export async function GET(req: Request) {
  const prisma = new PrismaClient();
  try {
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
      where: { id: user.id },
    });

    if (!fetched_user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const qp = await prisma.questionPaper.findFirst({
      where: {
        examslot: fetched_user.examslot,
        examdate: fetched_user.examdate,
      },
    });

    if (!qp || !qp.fileUrl) {
      return NextResponse.json(
        { error: "Question paper not found" },
        { status: 400 }
      );
    }

    const fileBuffer = fs.readFileSync(qp?.fileUrl || "");
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", 'inline; filename="Question Paper.pdf"');
    return new Response(fileBuffer, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error("Error fetching the file:", error);
    return new Response("Internal Server Error", { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
