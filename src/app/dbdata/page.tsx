"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";

const DashboardPage = () => {
  const [submittedData, setSubmittedData] = useState<
    {
      id: string;
      name: string;
      email: string;
      submittedAt: string;
      mergedurl: string;
      excelurl: string;
      wordurl: string;
      ppturl: string;
      texturl: string;
      typingspeed: string;
      password: string;
      hallticket: string;
      isSubmitted: boolean;
      createdAt: string;
      updatedAt: string;
      role: string;
    }[]
  >([]);

  const { data: session } = useSession();

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

        const response = await fetch("/api/fetch/users", {
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

        {/* Section 3: Submitted Data */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Submitted Data</h2>
          <div className="overflow-auto">
            <table className="table-auto border-collapse border border-gray-300 w-full">
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2">Name</th>
                  <th className="border border-gray-300 p-2">Hall Ticket No</th>

                  <th className="border border-gray-300 p-2">Role</th>
                  <th className="border border-gray-300 p-2">Password</th>
                  <th className="border border-gray-300 p-2">Email</th>
                  <th className="border border-gray-300 p-2">Merged File</th>
                  <th className="border border-gray-300 p-2">Excel File</th>
                  <th className="border border-gray-300 p-2">Word File</th>
                  <th className="border border-gray-300 p-2">PPT File</th>
                  <th className="border border-gray-300 p-2">Textarea File</th>
                  <th className="border border-gray-300 p-2">Typing Speed</th>
                  <th className="border border-gray-300 p-2">Submitted Time</th>
                  <th className="border border-gray-300 p-2">Is Submitted</th>
                  <th className="border border-gray-300 p-2">Created At</th>
                  <th className="border border-gray-300 p-2">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {submittedData.map((data, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">{data.name}</td>
                    <td className="border border-gray-300 p-2">
                      {data.hallticket}
                    </td>
                    <td className="border border-gray-300 p-2">{data.role}</td>
                    <td className="border border-gray-300 p-2">
                      {data.password}
                    </td>
                    <td className="border border-gray-300 p-2">{data.email}</td>
                    <td className="border border-gray-300 p-2">
                      {data.mergedurl && (
                        <button
                          onClick={() => fetchFile(data.mergedurl)}
                          className="bg-blue-500 text-white px-2 py-1 rounded"
                        >
                          Merged File
                        </button>
                      )}
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
                    <td className="border border-gray-300 p-2">
                      {data.isSubmitted ? "Yes" : "No"}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {new Date(data.createdAt).toLocaleString()}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {new Date(data.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
