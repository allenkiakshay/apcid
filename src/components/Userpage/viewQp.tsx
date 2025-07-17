"use client";
import { useState } from "react";
import { generateToken } from "@/lib/jwttoken";

export default function QPViewer({ session }: { session: any }) {
  const [url, setUrl] = useState<string | null>(null);
  const [otp, setOtp] = useState<string>("");
  const [popup, setPopup] = useState<boolean>(false);
  const [message, setMessage] = useState("");

  const fetchQuestionPaper = async () => {
    if (!otp || otp.length !== 6) {
      setMessage("Invalid OTP. It must be 6 digits/characters.");
      return;
    }

    try {
      const token = generateToken({ user: session.user, otp }, 60);
      const res = await fetch("/api/fetch/qp", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        setMessage(errorData.error || "Failed to fetch question paper.");
        return;
      }

      const blob = await res.blob();
      setUrl(URL.createObjectURL(blob));
      setMessage("");
    } catch (e) {
      setMessage("Error fetching paper.");
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtp(e.target.value);
  };

  return (
    <div className="flex-1 flex justify-center items-center border-r border-gray-300">
      {url ? (
        <iframe src={url} className="w-full h-full" />
      ) : (
        <div className="text-center">
          <p className="text-gray-600">
            {message || "Question paper not available."}
          </p>
          {popup ? (
            <div className="mt-3">
              <input
                type="text"
                value={otp}
                onChange={handleOtpChange}
                placeholder="Enter OTP"
                className="border px-3 py-2 rounded-lg"
              />
              <button
                onClick={fetchQuestionPaper}
                className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg"
              >
                Submit
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPopup(true)}
              className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg"
            >
              Fetch Question Paper
            </button>
          )}
        </div>
      )}
    </div>
  );
}
