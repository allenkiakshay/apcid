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
    const hallticket = formData.get("hallticket") as string;

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

    const path = require("path");
    const sanitizedFilePath = path.normalize(filePath);
    if (!fs.existsSync(sanitizedFilePath)) {
      return new Response("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(sanitizedFilePath);
    const headers = new Headers();

    // Determine the content type based on the file extension
    const fileExtension = path.extname(sanitizedFilePath).toLowerCase();
    let contentType = "application/octet-stream"; // Default content type

    switch (fileExtension) {
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".xlsx":
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case ".pptx":
        contentType = "application/vnd.ms-powerpoint";
        break;
      case ".txt":
        contentType = "text/plain";
        break;
      case ".docx":
        contentType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      default:
        contentType = "application/octet-stream";
    }

    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `inline; filename="${hallticket}_${fileExtension}"`
    );

    return new Response(fileBuffer, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error("Error fetching the file:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
