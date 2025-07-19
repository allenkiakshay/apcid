"use server";

import { PrismaClient } from "@/generated/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { extractDataFromToken } from "@/lib/jwttoken";

export async function POST(req: Request) {
  const prisma = new PrismaClient();
  try {
    const body = await req.formData();
    const userfile = body.get("userfile") as File;
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

    if (!userfile.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files are allowed." },
        { status: 400 }
      );
    }

    const fileContent = await userfile.text();
    const lines = fileContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty." },
        { status: 400 }
      );
    }

    const users = lines.map((line) => {
      const [name, dob, hallticket, examslot, exadate, examroom] =
        line.split(",").map((field) => field.trim());
      return { name, dob, hallticket, examslot, exadate, examroom };
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: "No valid user data found in the CSV file." },
        { status: 400 }
      );
    }

    var message = `Adding ${users.length - 1} users from the CSV file.`;
    var addedUsers = 0;

    for (const user of users.slice(1)) {
      if (!user.dob || !user.name || !user.hallticket) {
        message =
          message +
          `\nSkipping user with incomplete data: ${JSON.stringify(user)}`;
        continue;
      }

      const existingUser = await prisma.user.findUnique({
        where: { hallticket: user.hallticket },
      });

      if (existingUser) {
        message =
          message + `\nUser with hallticket ${user.hallticket} already exists. Skipping.`;
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.dob, 10);

      const adduser = await prisma.user.create({
        data: {
          hallticket: user.hallticket,
          dob: hashedPassword,
          name: user.name,
          examslot: user.examslot,
          examdate: user.exadate,
          examroom: user.examroom,
        },
      });

      if (!adduser) {
        message =
          message + `\nFailed to add user: ${JSON.stringify(user.hallticket)}`;
        continue;
      }

      addedUsers++;
    }

    message =
      message + `\nSuccessfully added ${addedUsers} users from the CSV file.`;

    return NextResponse.json(
      { message: "Users parsed successfully.", details: message },
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
