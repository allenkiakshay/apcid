import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { extractDataFromToken } from "@/lib/jwttoken";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = extractDataFromToken(token);
    // console.log(decoded);
    
    if (!decoded || !("user" in decoded)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const { user } = decoded as { user: { id: string } };

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

      const formatDateToYYYYMMDD = (dateStr: string): string => {
        const [dd, mm, yyyy] = dateStr.split("-");
        return `${yyyy}-${mm}-${dd}`;
      };

    const qp = await prisma.questionPaper.findFirst({
      where: {
        examslot: dbUser.examslot,
        examdate: formatDateToYYYYMMDD(dbUser.examdate),
        display: true,
      },
    });

    if (!qp || !qp.fileUrl) {
      return NextResponse.json({ error: "Question paper not found" }, { status: 404 });
    }

    const filePath = qp.fileUrl;

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="question-paper.pdf"',
      },
    });
  } catch (error) {
    console.error("Error fetching question paper:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
