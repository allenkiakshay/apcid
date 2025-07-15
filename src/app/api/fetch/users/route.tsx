"use server";

import { PrismaClient } from "@/generated/prisma";
import { NextResponse } from "next/server";
import { extractDataFromToken } from "@/lib/jwttoken";

export async function GET(req: Request) {
  const prisma = new PrismaClient();
  try {
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
      where: { email: user.email },
      select: { role: true, examroom: true },
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

    if (fetched_user.role === "ADMIN") {
      const enrichedSubmittedUsers = await prisma.user.findMany({
        where: { role: "USER", examroom: fetched_user.examroom },
        select: {
          id: true,
          name: true,
          email: true,
          hallticket: true,
          submittedAt: true,
          role: true,
          logedInAt: true,
          examslot: true,
          isSubmitted: true,
          examdate: true,
          examroom: true,
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
          oexcelurl: true,
          owordurl: true,
          oppturl: true,
          otexturl: true,
          pexcelurl: true,
          pwordurl: true,
          pppturl: true,
          ptexturl: true,
          mergedurl: true,
          typingspeed: true,
        },
      });

      const submissionMap = submissionData.reduce((acc, submission) => {
        acc[submission.userId] = submission;
        return acc;
      }, {} as Record<string, (typeof submissionData)[0]>);

      const submittedUsers = enrichedSubmittedUsers.map((user) => ({
        ...user,
        ...submissionMap[user.id],
      }));

      return NextResponse.json(
        { message: "Fetched successfully.", submittedUsers },
        { status: 200 }
      );
    }

    const enrichedSubmittedUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        hallticket: true,
        submittedAt: true,
        role: true,
        logedInAt: true,
        examslot: true,
        isSubmitted: true,
        examdate: true,
        examroom: true,
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
        oexcelurl: true,
        owordurl: true,
        oppturl: true,
        otexturl: true,
        pexcelurl: true,
        pwordurl: true,
        pppturl: true,
        ptexturl: true,
        mergedurl: true,
        typingspeed: true,
      },
    });

    const submissionMap = submissionData.reduce((acc, submission) => {
      acc[submission.userId] = submission;
      return acc;
    }, {} as Record<string, (typeof submissionData)[0]>);

    const submittedUsers = enrichedSubmittedUsers.map((user) => ({
      ...user,
      ...submissionMap[user.id],
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
