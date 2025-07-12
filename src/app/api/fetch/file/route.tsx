"use server";
import fs from "fs";
import { extractDataFromToken } from "@/lib/jwttoken";
import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

export async function POST(req: Request) {
  const prisma = new PrismaClient();
  try {
    const authHeader = req.headers.get("Authorization");
    const formData = await req.formData();
    const filePath = formData.get("filePath") as string;

    console.log("Received file path:", filePath,formData);

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
      where: { email: user.email },
      select: { role: true },
    });

    if (!fetched_user || fetched_user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized access. Admins only." },
        { status: 403 }
      );
    }

    console.log("Fetching file:", filePath);

    if (!fs.existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
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
  }
}
