"use client";
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";
import { Download, Printer, Users, FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const DashboardPage = () => {
  const [submittedData, setSubmittedData] = useState<
    {
      id: string;
      name: string;
      mergedPdfUrl: string;
      hallticket: string;
      isSubmitted: boolean;
      logedInAt: string;
      examroom: string;
    }[]
  >([]);

  const [isPrinting, setIsPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState({ current: 0, total: 0 });
  const [currentPrintItem, setCurrentPrintItem] = useState<string>('');
  const [printQueue, setPrintQueue] = useState<any[]>([]);

  const { data: session } = useSession();

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
      const fileExtension = filePath.split(".").pop()?.toLowerCase();

      if (fileExtension === "pdf") {
        window.open(url, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${hallticket}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      alert("Failed to Fetch File. Please try again.");
    }
  };

  // Queue-based printing system
  const printAllResponsesQueue = async () => {
    const submittedResponses = submittedData.filter(data => data.mergedPdfUrl && data.isSubmitted);
    
    if (submittedResponses.length === 0) {
      alert("No submitted responses available to print.");
      return;
    }

    setIsPrinting(true);
    setPrintProgress({ current: 0, total: submittedResponses.length });
    setPrintQueue([...submittedResponses]);
    setCurrentPrintItem('');

    // Process queue sequentially
    await processQueue(submittedResponses);
  };

  const processQueue = async (queue: any[]) => {
    let printWindow: Window | null = null;
    
    try {
      for (let i = 0; i < queue.length; i++) {
        const data = queue[i];
        setPrintProgress({ current: i + 1, total: queue.length });
        setCurrentPrintItem(`${data.name} (${data.hallticket})`);
        
        try {
          // Fetch the file
          const formData = new FormData();
          formData.append("filePath", data.mergedPdfUrl);
          formData.append("hallticket", data.hallticket);
          
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

          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            // If this is the first item or previous window was closed, open new window
            if (!printWindow || printWindow.closed) {
              printWindow = window.open('', '_blank', 'width=800,height=600');
              if (!printWindow) {
                throw new Error('Unable to open print window. Please allow popups.');
              }
            }
            
            // Load PDF in the same window
            printWindow.location.href = url;
            printWindow.focus();
            
            // Wait for PDF to load and trigger print
            await new Promise<void>((resolve) => {
              const checkLoad = () => {
                try {
                  if (printWindow && !printWindow.closed) {
                    // Trigger print after a short delay
                    setTimeout(() => {
                      if (printWindow && !printWindow.closed) {
                        printWindow.print();
                      }
                    }, 2000);
                  }
                } catch (error) {
                  console.log('Print window access error (expected for cross-origin)');
                }
              };
              
              setTimeout(checkLoad, 1000);
              
              // Wait for user interaction (either print completion or manual skip)
              setTimeout(() => {
                URL.revokeObjectURL(url);
                resolve();
              }, 5000); // 5 seconds per document
            });
            
          } else {
            console.error(`Failed to fetch file for ${data.hallticket}`);
          }
        } catch (error) {
          console.error(`Error processing ${data.hallticket}:`, error);
        }
      }
      
      // Close the print window after all items are processed
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      
      alert(`Completed printing process for ${queue.length} responses.`);
    } catch (error) {
      console.error("Error during bulk printing:", error);
      alert("An error occurred while printing responses. Please try again.");
    } finally {
      setIsPrinting(false);
      setPrintProgress({ current: 0, total: 0 });
      setCurrentPrintItem('');
      setPrintQueue([]);
    }
  };

  // Download all responses
  const downloadAllResponses = async () => {
    const submittedResponses = submittedData.filter(data => data.mergedPdfUrl && data.isSubmitted);
    
    if (submittedResponses.length === 0) {
      alert("No submitted responses available to download.");
      return;
    }

    setIsPrinting(true);
    setPrintProgress({ current: 0, total: submittedResponses.length });
    setCurrentPrintItem('');

    try {
      for (let i = 0; i < submittedResponses.length; i++) {
        const data = submittedResponses[i];
        setPrintProgress({ current: i + 1, total: submittedResponses.length });
        setCurrentPrintItem(`${data.name} (${data.hallticket})`);
        
        const formData = new FormData();
        formData.append("filePath", data.mergedPdfUrl);
        formData.append("hallticket", data.hallticket);
        
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

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          // Download each file
          const link = document.createElement("a");
          link.href = url;
          link.download = `${data.hallticket}_${data.name.replace(/\s+/g, '_')}_response.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          URL.revokeObjectURL(url);
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 800));
        } else {
          console.error(`Failed to fetch file for ${data.hallticket}`);
        }
      }
      
      alert(`Successfully downloaded ${submittedResponses.length} responses.`);
    } catch (error) {
      console.error("Error during bulk download:", error);
      alert("An error occurred while downloading responses. Please try again.");
    } finally {
      setIsPrinting(false);
      setPrintProgress({ current: 0, total: 0 });
      setCurrentPrintItem('');
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

        if (!result.submittedUsers || !Array.isArray(result.submittedUsers)) {
          console.error("Invalid response format:", result);
          return;
        }

        setSubmittedData(result.submittedUsers);
      } catch (error) {
        console.error("Error fetching submitted users:", error);
      }
    };

    fetchSubmittedUsers();
  }, [session]);

  const getStatusInfo = (data: any) => {
    if (data.isSubmitted) {
      return { text: "Submitted", color: "text-green-700", bgColor: "bg-green-100", icon: CheckCircle };
    } else if (data.logedInAt) {
      return { text: "Writing Exam", color: "text-yellow-700", bgColor: "bg-yellow-100", icon: Clock };
    } else {
      return { text: "Not Started", color: "text-red-700", bgColor: "bg-red-100", icon: XCircle };
    }
  };

  const writingCount = submittedData.filter(data => data.logedInAt && !data.isSubmitted).length;
  const submittedCount = submittedData.filter(data => data.isSubmitted).length;
  const notStartedCount = submittedData.filter(data => !data.logedInAt && !data.isSubmitted).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Dashboard</h1>
          <p className="text-gray-600">Monitor and manage exam submissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Writing Exam Count */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Writing Exam</h2>
                <p className="text-3xl font-bold text-yellow-600">{writingCount}</p>
              </div>
            </div>
          </div>

          {/* Submitted Count */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Submitted</h2>
                <p className="text-3xl font-bold text-green-600">{submittedCount}</p>
              </div>
            </div>
          </div>

          {/* Not Started Count */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Not Started</h2>
                <p className="text-3xl font-bold text-red-600">{notStartedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submitted Data Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Section Header with Print/Download Buttons */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Submitted Responses</h2>
                <p className="text-sm text-gray-600">Manage and download student responses</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={downloadAllResponses}
                disabled={isPrinting || submittedCount === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isPrinting || submittedCount === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-green-600 shadow-md hover:shadow-lg transform hover:scale-105'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Download All</span>
              </button>
              
              <button
                onClick={printAllResponsesQueue}
                disabled={isPrinting || submittedCount === 0}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isPrinting || submittedCount === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-green-600 shadow-md hover:shadow-lg transform hover:scale-105'
                }`}
              >
                {isPrinting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Printing ({printProgress.current}/{printProgress.total})</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Print All Responses</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hall Ticket
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submittedData.map((data, index) => {
                  const statusInfo = getStatusInfo(data);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 rounded-full bg-gray-100">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{data.name}</div>
                            {data.examroom && (
                              <div className="text-sm text-gray-500">Room: {data.examroom}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono font-medium text-gray-900">{data.hallticket}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {data.mergedPdfUrl ? (
                          <button
                            onClick={() => fetchFile(data.mergedPdfUrl, data.hallticket)}
                            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors shadow-sm hover:shadow-md transform hover:scale-105"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">No response available</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {submittedData.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
                <p className="text-gray-500">No student records found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Progress Modal */}
        {isPrinting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-lg w-full mx-4 shadow-2xl">
              <div className="text-center">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      {printQueue.length > 0 ? (
                        <Printer className="h-8 w-8 text-blue-600" />
                      ) : (
                        <Download className="h-8 w-8 text-blue-600" />
                      )}
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {printQueue.length > 0 ? 'Printing Responses' : 'Processing Responses'}
                </h3>
                
                <p className="text-gray-600 mb-6">
                  Processing {printProgress.current} of {printProgress.total} responses
                </p>

                {currentPrintItem && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <p className="text-sm font-medium text-blue-800">Currently processing:</p>
                    <p className="text-blue-600 font-semibold">{currentPrintItem}</p>
                  </div>
                )}

                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(printProgress.current / printProgress.total) * 100}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-500 mb-6">
                  <span>{printProgress.current} completed</span>
                  <span>{printProgress.total - printProgress.current} remaining</span>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Please note:</p>
                      <p>
                        {printQueue.length > 0 
                          ? 'Each PDF will automatically open the print dialog. Using a single browser tab to avoid overwhelming your browser.'
                          : 'Files are being downloaded to your Downloads folder automatically.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;