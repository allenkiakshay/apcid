"use client";
import { generateToken } from "@/lib/jwttoken";
import { signOut, useSession } from "next-auth/react";
import Navbar from "../Navbar";

export default function AlreadySubmitted({
  setMessage,
}: {
  setMessage: (message: string) => void;
}) {
  const { data: session } = useSession();
  const handleDownload = async () => {
    try {
      const token = generateToken(
        {
          user: session?.user,
        },
        60 // Token valid for 1 minute
      );

      const response = await fetch("/api/fetch/merged", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to fetch merged PDF: ${errorMessage}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error fetching merged PDF:", error);
      setMessage("Failed to download merged PDF. Please try again.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="h-[80vh] flex flex-col justify-center items-center bg-gray-100">
        <h1 className="text-3xl font-bold text-gray-800 mb-5">
          You have already submitted the files.
        </h1>
        <button
          onClick={handleDownload}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 mb-4"
        >
          Download Response Sheet
        </button>
        <button
          onClick={() => signOut()}
          className="bg-red-500 text-white px-6 py-3 rounded-lg shadow hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
