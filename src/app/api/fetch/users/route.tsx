"use server";

import { PrismaClient } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { extractDataFromToken } from "@/lib/jwttoken";

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
      where: { hallticket: user.hallticket },
      select: { role: true, examroom: true, examslot: true },
    });

    if (
      !fetched_user ||
      (fetched_user.role !== "ADMIN" && fetched_user.role !== "SUPER_ADMIN")
    ) {
      return NextResponse.json(
        { error: "Unauthorized access. Admins only." },
        { status: 403 }
      );
    }

    // ✅ Role-based filtering
    let userFilter: any = { role: "USER" };

    if (fetched_user.role === "ADMIN") {
      if (!fetched_user.examroom || !fetched_user.examslot) {
        return NextResponse.json(
          { error: "Examroom and examslot must be set for ADMIN" },
          { status: 400 }
        );
      }
      userFilter.examroom = fetched_user.examroom;
      userFilter.examslot = fetched_user.examslot;
    }

    const enrichedSubmittedUsers = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        name: true,
        hallticket: true,
        isSubmitted: true,
        logedInAt: true,
        examroom: true,
        examdate: true,
        examslot: true,
      },
    });

    const submissionData = await prisma.submission.findMany({
      where: {
        userId: {
          in: enrichedSubmittedUsers.map((user) => user.id),
        },
      },
      select: {
        userId: true,
        mergedPdfUrl: true,
      },
    });

    const submissionMap = submissionData.reduce((acc, submission) => {
      acc[submission.userId] = submission.mergedPdfUrl || "";
      return acc;
    }, {} as Record<string, string>);

    const submittedUsers = enrichedSubmittedUsers.map((user) => ({
      id: user.id,
      name: user.name,
      hallticket: user.hallticket,
      isSubmitted: user.isSubmitted,
      logedInAt: user.logedInAt,
      examroom: user.examroom,
      mergedPdfUrl: submissionMap[user.id] || null,
      examslot: user.examslot,
      examdate: user.examdate,
    }));

    return NextResponse.json(
      { message: "Fetched successfully.", submittedUsers },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}