"use client";
import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";

const DashboardPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [examslot, setExamSlot] = useState<string | null>(null);
  const [examdate, setExamDate] = useState<string | null>(null);
  const { data: session } = useSession();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setFile(selectedFile || null);
  };

  const handleFileUpload = async () => {
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    if (!session?.user) {
      alert("User session is not available. Please log in.");
      return;
    }

    const formData = new FormData();
    formData.append("userfile", file);

    try {
      const token = generateToken({ user: session.user }, 60);

      const response = await fetch("/api/addusers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || "Failed to upload file."}`);
        return;
      }

      const result = await response.json();
      alert(result.message || "File uploaded successfully.");
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("An unexpected error occurred while uploading the file.");
    }
  };

  const handleQuestionPaperUpload = async () => {
    if (!questionPaper) {
      alert("Please select a question paper to upload.");
      return;
    }

    if (!examslot || !examdate) {
      alert("Please select an exam slot and date.");
      return;
    }

    if (!session?.user) {
      alert("User session is not available. Please log in.");
      return;
    }

    const formData = new FormData();
    formData.append("questionpaper", questionPaper);
    formData.append("examslot", examslot || "");
    formData.append("examdate", examdate || "");

    try {
      const token = generateToken({ user: session.user }, 60);

      const response = await fetch("/api/uploadqp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(
          `Error: ${errorData.error || "Failed to upload question paper."}`
        );
        setQuestionPaper(null); // Reset the question paper state after upload
        setExamSlot(null); // Reset the exam slot state after upload
        setExamDate(null); // Reset the exam date state after upload
        return;
      }

      const result = await response.json();
      alert(result.message || "Question paper uploaded successfully.");
      setQuestionPaper(null); // Reset the question paper state after upload
      setExamSlot(null); // Reset the exam slot state after upload
      setExamDate(null); // Reset the exam date state after upload
    } catch (error) {
      console.error("Error uploading question paper:", error);
      alert("An unexpected error occurred while uploading the question paper.");
      setQuestionPaper(null); // Reset the question paper state after upload
      setExamSlot(null); // Reset the exam slot state after upload
      setExamDate(null); // Reset the exam date state after upload
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">
            Please Log In
          </h2>
          <p className="text-gray-600 mb-6">
            You need to log in to access the dashboard.
          </p>
          <a
            href="/login"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (session.user.role !== "SUPER_ADMIN") {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">
              Access Denied
            </h2>
            <p className="text-gray-700 mb-6">
              You do not have permission to access this page.
            </p>
            <a
              href="/login"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Login as Super Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Super Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Upload Users */}
          <section className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Upload Users
            </h2>
            <div className="flex flex-col space-y-4">
              <input
                type="file"
                accept=".csv"
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={handleFileChange}
                id="uploadUsersInput"
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                onClick={handleFileUpload}
              >
                Upload Users
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Sample CSV format: &nbsp;
              <a
                href="https://docs.google.com/spreadsheets/d/1r_R0L1PxA2Wol3Hmp0LMo7MbADo9f4bW8hV8J2kImhg/edit?usp=sharing"
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                View Sample
              </a>
            </div>
          </section>

          {/* Section 2: Upload Question Papers */}
          <section className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Upload Question Papers
            </h2>
            <div className="flex flex-col space-y-4">
              <input
                type="file"
                accept=".pdf"
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="uploadQuestionPapersInput"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  setQuestionPaper(selectedFile || null);
                }}
              />
              <select
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={examslot || ""}
                onChange={(e) => setExamSlot(e.target.value)}
              >
                <option value="" disabled>
                  Select Exam Slot
                </option>
                <option value="FN">FN</option>
                <option value="AN">AN</option>
              </select>

              <select
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={examdate || ""}
                onChange={(e) => setExamDate(e.target.value)}
              >
                <option value="" disabled>
                  Select Exam Date
                </option>
                <option value="2025-07-18">2025-07-18</option>
                <option value="2025-07-19">2025-07-19</option>
                <option value="2025-07-20">2025-07-20</option>
              </select>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                onClick={() => handleQuestionPaperUpload()}
              >
                Upload Question Papers
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
