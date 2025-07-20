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
      hallticket: string;
      mergedPdfUrl: string;
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
    formData.append("password", otp);

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

  const handleReleaseQuestionPaper = async () => {
    if (!examSlot || !examDate)
      return alert("Please select both slot and date.");
    if (!otp) return alert("Please enter the password.");
    if (!session?.user) return alert("User session is not available.");

    const formData = new FormData();
    formData.append("examslot", examSlot);
    formData.append("examdate", examDate);
    formData.append("password", otp);

    try {
      const token = generateToken({ user: session.user }, 60);
      const response = await fetch("/api/releaseqp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok)
        return alert(result.error || "Failed to release question paper.");
      alert(result.message || "Question paper released successfully.");
    } catch (error) {
      console.error("Error releasing question paper:", error);
      alert("An unexpected error occurred.");
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 text-center max-w-md w-full border border-white/20">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-8 text-lg">Please log in to access the dashboard</p>
          <a
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 text-center max-w-md w-full border border-white/20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h2>
            <p className="text-gray-700 mb-8 text-lg">You do not have permission to access this page</p>
            <a
              href="/login"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Login as Super Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-gray-800 via-gray-900 to-black bg-clip-text text-transparent mb-4">
            Super Admin Dashboard
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full"></div>
        </div>

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Users */}
          <section className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-8 border border-white/20 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Upload Users</h2>
            </div>
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={handleFileChange}
                />
              </div>
              <button
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-6 py-4 rounded-2xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                onClick={handleFileUpload}
              >
                Upload Users
              </button>
              <a
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-300"
                href="https://docs.google.com/spreadsheets/d/1r_R0L1PxA2Wol3Hmp0LMo7MbADo9f4bW8hV8J2kImhg/edit?usp=sharing"
                target="_blank"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Sample CSV
              </a>
            </div>
          </section>

          {/* Upload Question Papers */}
          <section className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-8 border border-white/20 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Upload Question Papers</h2>
            </div>
            <div className="space-y-6">
              <input
                type="file"
                accept=".pdf"
                className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                onChange={(e) => setQuestionPaper(e.target.files?.[0] || null)}
              />
              <select
                className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all duration-300 bg-white"
                value={examSlot}
                onChange={(e) => setExamSlot(e.target.value)}
              >
                <option value="" disabled>Select Exam Slot</option>
                <option value="FN">FN</option>
                <option value="AN">AN</option>
              </select>
              <select
                className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all duration-300 bg-white"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              >
                <option value="" disabled>Select Exam Date</option>
                <option value="2025-07-18">2025-07-18</option>
                <option value="2025-07-19">2025-07-19</option>
                <option value="2025-07-20">2025-07-20</option>
              </select>
              <input
                onChange={(e) => setOtp(e.target.value)}
                type="text"
                value={otp}
                placeholder="Enter Password to protect the file"
                className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all duration-300"
              />
              <button
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                onClick={handleQuestionPaperUpload}
              >
                Upload Question Papers
              </button>
            </div>
          </section>
        </div>

        {/* Release Question Papers */}
        <section className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-8 border border-white/20 hover:shadow-2xl transition-all duration-500">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Release Question Papers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <select
              className="p-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 bg-white"
              value={examSlot}
              onChange={(e) => setExamSlot(e.target.value)}
            >
              <option value="" disabled>Select Exam Slot</option>
              <option value="FN">FN</option>
              <option value="AN">AN</option>
            </select>
            <select
              className="p-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 bg-white"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            >
              <option value="" disabled>Select Exam Date</option>
              <option value="2025-07-18">2025-07-18</option>
              <option value="2025-07-19">2025-07-19</option>
              <option value="2025-07-20">2025-07-20</option>
            </select>
            <input
              onChange={(e) => setOtp(e.target.value)}
              type="text"
              value={otp}
              placeholder="Enter Password to protect file"
              className="p-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300"
            />
          </div>
          <button
            className="mt-6 w-full md:w-auto bg-gradient-to-r from-purple-500 to-violet-600 text-white px-8 py-4 rounded-2xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
            onClick={handleReleaseQuestionPaper}
          >
            Release Question Paper
          </button>
        </section>

        {/* Room-wise Analytics */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-800 text-center">Room-wise Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(roomWiseData).map(([room, counts], index) => (
              <div
                key={index}
                className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-6 cursor-pointer border border-white/20 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group"
                onClick={() => {
                  setPopup(true);
                  setRoomNo(room);
                }}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Room {room}</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                    <span className="text-green-700 font-semibold">Submitted</span>
                    <span className="text-green-800 font-bold text-lg">{counts.submitted}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl">
                    <span className="text-yellow-700 font-semibold">Writing Exam</span>
                    <span className="text-yellow-800 font-bold text-lg">{counts.writingExam}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
                    <span className="text-red-700 font-semibold">Not Logged In</span>
                    <span className="text-red-800 font-bold text-lg">{counts.notlogedin}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-100">
                    <span className="text-indigo-700 font-bold">Total Count</span>
                    <span className="text-indigo-800 font-bold text-xl">{counts.entries.length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Modal */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/20 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-6">
              <h2 className="text-3xl font-bold text-white text-center">Room {roomNo} Details</h2>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-2xl overflow-hidden shadow-lg">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="py-4 px-6 text-left font-bold text-gray-700 border-b border-gray-200">Name</th>
                      <th className="py-4 px-6 text-left font-bold text-gray-700 border-b border-gray-200">Hall Ticket</th>
                      <th className="py-4 px-6 text-left font-bold text-gray-700 border-b border-gray-200">Status</th>
                      <th className="py-4 px-6 text-left font-bold text-gray-700 border-b border-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomWiseData[roomNo]?.entries.map((user, index) => (
                      <tr key={index} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300">
                        <td className="py-4 px-6 border-b border-gray-100 font-medium text-gray-800">{user.name}</td>
                        <td className="py-4 px-6 border-b border-gray-100 font-mono text-gray-700">{user.hallticket}</td>
                        <td className="py-4 px-6 border-b border-gray-100">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            user.isSubmitted
                              ? "bg-green-100 text-green-800"
                              : user.logedInAt
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {user.isSubmitted
                              ? "Submitted"
                              : user.logedInAt
                              ? "Writing Exam"
                              : "Not Started"}
                          </span>
                        </td>
                        <td className="py-4 px-6 border-b border-gray-100">
                          <button
                            onClick={() =>
                              fetchFile(user.mergedPdfUrl, user.hallticket)
                            }
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 flex justify-center">
              <button
                onClick={() => setPopup(false)}
                className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-8 py-3 rounded-2xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;