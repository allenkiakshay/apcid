import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { extractDataFromToken } from "@/lib/jwttoken";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = extractDataFromToken(token);
    if (!decoded || decoded.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const formData = await req.formData();
    const examSlot = formData.get("examslot")?.toString();
    const examDate = formData.get("examdate")?.toString();

    if (!examSlot || !examDate) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const updated = await prisma.questionPaper.updateMany({
      where: {
        examslot: examSlot,
        examdate: examDate,
      },
      data: {
        display: true, 
      },
    });

    return NextResponse.json({
      message: `${updated.count} question paper(s) released.`,
    });
  } catch (error) {
    console.error("Error releasing question paper:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
