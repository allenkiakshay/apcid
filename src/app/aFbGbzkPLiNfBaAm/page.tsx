"use client";
import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";

const DashboardPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [otp, setOtp] = useState<string>("");
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [examSlot, setExamSlot] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("");
  const [popup, setPopup] = useState<boolean>(false);
  const [roomNo, setRoomNo] = useState<string>("");
  const { data: session } = useSession();
  const [submittedData, setSubmittedData] = useState<
    {
      id: string;
      name: string;
      email: string;
      mergedPdfUrl: string;
      hallticket: string;
      isSubmitted: boolean;
      logedInAt: string;
      examroom: string;
    }[]
  >([]);

  const [roomWiseData, setRoomWiseData] = useState<
    Record<
      string,
      {
        submitted: number;
        notlogedin: number;
        writingExam: number;
        entries: typeof submittedData;
      }
    >
  >({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
  };

  const handleFileUpload = async () => {
    if (!file) return alert("Please select a file to upload.");
    if (!session?.user)
      return alert("User session is not available. Please log in.");

    const formData = new FormData();
    formData.append("userfile", file);

    try {
      const token = generateToken({ user: session.user }, 60);
      const response = await fetch("/api/addusers", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok)
        return alert(`Error: ${result.error || "Failed to upload file."}`);
      alert(result.message || "File uploaded successfully.");
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("An unexpected error occurred while uploading the file.");
    }
  };

  const handleQuestionPaperUpload = async () => {
    if (!questionPaper)
      return alert("Please select a question paper to upload.");
    if (!examSlot || !examDate)
      return alert("Please select an exam slot and date.");
    if (!session?.user)
      return alert("User session is not available. Please log in.");

    const formData = new FormData();
    formData.append("questionpaper", questionPaper);
    formData.append("examslot", examSlot);
    formData.append("examdate", examDate);
    formData.append("otp", otp);

    try {
      const token = generateToken({ user: session.user }, 60);
      const response = await fetch("/api/uploadqp", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok)
        return alert(
          `Error: ${result.error || "Failed to upload question paper."}`
        );
      alert(result.message || "Question paper uploaded successfully.");
    } catch (error) {
      console.error("Error uploading question paper:", error);
      alert("An unexpected error occurred while uploading the question paper.");
    } finally {
      setQuestionPaper(null);
      setExamSlot("");
      setExamDate("");
      setOtp("");
    }
  };

  useEffect(() => {
    if (!session) return;

    const fetchSubmittedUsers = async () => {
      try {
        const token = generateToken({ user: session.user }, 60);
        const response = await fetch("/api/fetch/users", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await response.json();
        if (!response.ok || !Array.isArray(result.submittedUsers)) {
          console.error(
            "Error fetching submitted users:",
            result.error || "Invalid response format."
          );
          return;
        }

        setSubmittedData(result.submittedUsers);
        interface User {
          id: string;
          name: string;
          email: string;
          mergedPdfUrl: string;
          hallticket: string;
          isSubmitted: boolean;
          logedInAt: string;
          examroom: string;
        }

        interface RoomData {
          submitted: number;
          notlogedin: number;
          writingExam: number;
          entries: User[];
        }

        setRoomWiseData(
          result.submittedUsers.reduce(
            (acc: Record<string, RoomData>, user: User) => {
              const room = user.examroom;
              if (!acc[room]) {
                acc[room] = {
                  submitted: 0,
                  notlogedin: 0,
                  writingExam: 0,
                  entries: [],
                };
              }
              acc[room].submitted += user.isSubmitted ? 1 : 0;
              acc[room].notlogedin += user.logedInAt ? 0 : 1;
              acc[room].writingExam += user.logedInAt && !user.isSubmitted ? 1 : 0;
              acc[room].entries.push(user);
              return acc;
            },
            {} as Record<string, RoomData>
          )
        );
      } catch (error) {
        console.error("Error fetching submitted users:", error);
      }
    };

    fetchSubmittedUsers();
  }, [session]);

  const fetchFile = async (filePath: string, hallticket: string) => {
    const formData = new FormData();
    formData.append("filePath", filePath);
    formData.append("hallticket", hallticket);
    try {
      const token = generateToken(
        {
          user: session?.user,
        },
        60 // Token valid for 1 minute
      );

      const response = await fetch("/api/fetch/file", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to fetch file: ${errorMessage}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${hallticket}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error fetching file:", error);
      alert("Failed to Fetch File. Please try again.");
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
          {/* Upload Users */}
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
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                onClick={handleFileUpload}
              >
                Upload Users
              </button>
            </div>
            <a
              className="text-blue-600 hover:underline mt-4 block"
              href="https://docs.google.com/spreadsheets/d/1r_R0L1PxA2Wol3Hmp0LMo7MbADo9f4bW8hV8J2kImhg/edit?usp=sharing"
              target="_blank"
            >
              View Sample CSV
            </a>
          </section>

          {/* Upload Question Papers */}
          <section className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Upload Question Papers
            </h2>
            <div className="flex flex-col space-y-4">
              <input
                type="file"
                accept=".pdf"
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setQuestionPaper(e.target.files?.[0] || null)}
              />
              <select
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={examSlot}
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
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              >
                <option value="" disabled>
                  Select Exam Date
                </option>
                <option value="2025-07-18">2025-07-18</option>
                <option value="2025-07-19">2025-07-19</option>
                <option value="2025-07-20">2025-07-20</option>
              </select>
              <input
                onChange={(e) => setOtp(e.target.value)}
                type="text"
                value={otp}
                placeholder="Enter OTP"
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                onClick={handleQuestionPaperUpload}
              >
                Upload Question Papers
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">
          Room-wise Analytics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(roomWiseData).map(([room, counts], index) => (
            <div
              key={index}
              className="bg-white shadow-lg rounded-lg p-6 cursor-pointer"
              onClick={() => {
                setPopup(true);
                setRoomNo(room);
              }}
            >
              <h3 className="text-xl font-semibold mb-4 text-gray-700">
                Room: {room}
              </h3>
              <div className="text-gray-600 mb-2">
                <strong>Submitted:</strong> {counts.submitted}
              </div>
              <div className="text-gray-600 mb-2">
                <strong>Not Logged In:</strong> {counts.notlogedin}
              </div>
              <div className="text-gray-600">
                <strong>Writing Exam:</strong> {counts.writingExam}
              </div>
              <div className="mt-4">
                <strong>Total Count:</strong> {counts.entries.length}
              </div>
            </div>
          ))}
        </div>
      </div>

      {popup && (
        <div className="fixed inset-0 bg-gray-800/50 flex items-center justify-center text-center z-50">
          <div className="bg-white rounded-lg p-6 w-3/4">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Room: {roomNo}
            </h2>
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Email</th>
                  <th className="py-2 px-4 border-b">Hall Ticket</th>
                  <th className="py-2 px-4 border-b">Status</th>
                  <th className="py-2 px-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roomWiseData[roomNo]?.entries.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="py-2 px-4 border-b">{user.name}</td>
                    <td className="py-2 px-4 border-b">{user.email}</td>
                    <td className="py-2 px-4 border-b">{user.hallticket}</td>
                    <td className="py-2 px-4 border-b">
                      {user.isSubmitted
                        ? "Submitted"
                        : user.logedInAt
                        ? "Writing Exam"
                        : "Not Started"}
                    </td>
                    <td className="py-2 px-4 border-b">
                      <button
                        onClick={() =>
                          fetchFile(user.mergedPdfUrl, user.hallticket)
                        }
                        className="text-blue-600 hover:underline"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setPopup(false)}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
