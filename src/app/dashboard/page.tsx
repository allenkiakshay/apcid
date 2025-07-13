"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";

const DashboardPage = () => {
  const [submittedUsers, setSubmittedUsers] = useState(0);
  const [submittedData, setSubmittedData] = useState<
    {
      name: string;
      email: string;
      submittedAt: string;
      mergedurl: string;
      excelurl: string;
      wordurl: string;
      ppturl: string;
      texturl: string;
      typingspeed: string;
    }[]
  >([]);
  const [file, setFile] = useState<File | null>(null);
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

  const fetchFile = async (filePath: string) => {
    const formData = new FormData();
    formData.append("filePath", filePath);
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
      const fileExtension = filePath.split(".").pop()?.toLowerCase();

      if (fileExtension === "pdf") {
        window.open(url, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = filePath.split("/").pop() || "downloaded_file";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      alert("Failed to Fetch File. Please try again.");
    }
  };

  useEffect(() => {
    if (!session) return;
    const fetchSubmittedUsers = async () => {
      if (!session) {
        console.error("Session is not available. Please log in.");
        return;
      }

      if (!session.user) {
        console.error("User session is not available.");
        return;
      }

      try {
        const token = generateToken({ user: session.user }, 60);

        const response = await fetch("/api/fetch/submitted", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error fetching submitted users: ${errorData.error}`);
          return;
        }

        const result = await response.json();

        setSubmittedUsers(result.submittedUsers.length);
        setSubmittedData(result.submittedUsers);
      } catch (error) {
        console.error("Error fetching submitted users:", error);
      }
    };

    fetchSubmittedUsers();
  }, [session]);

  return (
    <div>
      <Navbar />
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

        <div className="flex space-x-4 mb-8">
          {/* Section 1: Upload CSV File */}
          <section className="flex-1 bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">
              Upload CSV File
            </h2>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept=".csv"
                className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={handleFileChange}
                id="fileInput"
              />
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                onClick={handleFileUpload}
              >
                Upload
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Sample CSV format: &nbsp;
              <a
                href="https://docs.google.com/spreadsheets/d/1r_R0L1PxA2Wol3Hmp0LMo7MbADo9f4bW8hV8J2kImhg/edit?usp=sharing"
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                Click here to view
              </a>
            </div>
          </section>

          {/* Section 2: Number of Submitted Users */}
          <section className="flex-1 bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">
              Number of Submitted Users
            </h2>
            <div className="flex items-center justify-center bg-blue-100 text-blue-700 font-bold text-4xl rounded-lg p-6">
              {submittedUsers}
            </div>
          </section>
        </div>

        {/* Section 3: Submitted Data */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Submitted Data</h2>
          <table className="table-auto border-collapse border border-gray-300 w-full">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Name</th>
                <th className="border border-gray-300 p-2">Email</th>
                <th className="border border-gray-300 p-2">Merged File</th>
                <th className="border border-gray-300 p-2">Excel File</th>
                <th className="border border-gray-300 p-2">Word File</th>
                <th className="border border-gray-300 p-2">PPT File</th>
                <th className="border border-gray-300 p-2">Textarea File</th>
                <th className="border border-gray-300 p-2">Typing Speed</th>
                <th className="border border-gray-300 p-2">Submitted Time</th>
              </tr>
            </thead>
            <tbody>
              {submittedData.map((data, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{data.name}</td>
                  <td className="border border-gray-300 p-2">{data.email}</td>
                  <td className="border border-gray-300 p-2">
                    <button
                      onClick={() => fetchFile(data.mergedurl)}
                      className="bg-blue-500 text-white px-2 py-1 rounded"
                    >
                      Merged File
                    </button>
                  </td>
                  <td className="border border-gray-300 p-2">
                    {data.excelurl && (
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() =>
                            fetchFile(
                              data.excelurl
                                .replace("/pdf", "/original")
                                .replace(".pdf", ".xlsx")
                            )
                          }
                          className="bg-green-500 text-white px-2 py-1 rounded"
                        >
                          Original
                        </button>
                        <button
                          onClick={() => fetchFile(data.excelurl)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded"
                        >
                          PDF
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {data.wordurl && (
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() =>
                            fetchFile(
                              data.wordurl
                                .replace("/pdf", "/original")
                                .replace(".pdf", ".docx")
                            )
                          }
                          className="bg-purple-500 text-white px-2 py-1 rounded"
                        >
                          Original
                        </button>
                        <button
                          onClick={() => fetchFile(data.wordurl)}
                          className="bg-pink-500 text-white px-2 py-1 rounded"
                        >
                          PDF
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {data.ppturl && (
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() =>
                            fetchFile(
                              data.ppturl
                                .replace("/pdf", "/original")
                                .replace(".pdf", ".pptx")
                            )
                          }
                          className="bg-orange-500 text-white px-2 py-1 rounded"
                        >
                          Original
                        </button>
                        <button
                          onClick={() => fetchFile(data.ppturl)}
                          className="bg-red-500 text-white px-2 py-1 rounded"
                        >
                          PDF
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {data.texturl && (
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() =>
                            fetchFile(
                              data.texturl
                                .replace("/pdf", "/original")
                                .replace(".pdf", ".txt")
                            )
                          }
                          className="bg-gray-500 text-white px-2 py-1 rounded"
                        >
                          Original
                        </button>
                        <button
                          onClick={() => fetchFile(data.texturl)}
                          className="bg-gray-700 text-white px-2 py-1 rounded"
                        >
                          PDF
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {data.typingspeed}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {data.submittedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
