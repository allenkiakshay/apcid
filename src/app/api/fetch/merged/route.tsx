import path from "path";
import fs from "fs";
import { extractDataFromToken } from "@/lib/jwttoken";

export async function GET(req: Request) {
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

    const filePath = path.join(
      process.cwd(),
      "uploads",
      user.hallticket,
      `merged_${user.hallticket}.pdf`
    );

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
