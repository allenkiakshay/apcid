"use client";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { TextArea } from "./textArea";
import { signOut } from "next-auth/react";
import { ExcelFile, PPTFile, WordFile } from "./filesUpload";
import { FileText, FileSpreadsheet, Presentation, CheckCircle, X, Upload } from 'lucide-react';

export const FormSubmit = ({
  setMessage,
}: {
  setMessage: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [submitstatus, setSubmitStatus] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!session) return;

    const fetchSubmissionStatus = async () => {
      const token = generateToken(
        {
          user: session?.user,
        },
        60 * 2 // Token valid for 2 minutes
      );

      try {
        const response = await fetch("/api/submitstatus/text", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 400) {
          setSubmitStatus(true);
          setMessage("You have already submitted the Text.");
          return;
        }

        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(`Failed to fetch submission status: ${errorMessage}`);
        }
      } catch (error) {
        console.error("Error fetching submission status:", error);
      }
    };

    fetchSubmissionStatus();
  }, [session, setMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setLoading(true);
    const token = generateToken(
      {
        user: session?.user,
      },
      60 * 2 // Token valid for 2 minutes
    );

    try {
      const response = await fetch("/api/submitstatus/files", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 400) {
        const result = await response.json();
        setSubmittedData(result.formattedData);
        setMessage(result.message);
        setShowPopup(true);
        return;
      }

      if (!response.ok) {
        throw new Error("Form submission failed");
      }

      const result = await response.json();
      setSubmittedData(result.formattedData);
      setShowPopup(true);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!session) return;
    setLoading(true);

    const token = generateToken(
      {
        user: session?.user,
      },
      60 * 2 // Token valid for 2 minutes
    );

    try {
      const response = await fetch("/api/finalsubmit", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Final submission failed");
      }

      const result = await response.blob();
      const url = URL.createObjectURL(result);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${session.user.hallticket}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage("Submitted Successfully!");
      setShowPopup(false);

      // ✅ Sign out user after download
      await signOut(); // No callbackUrl = default NextAuth sign-out
    } catch (error: any) {
      console.error("Error during final submission:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'excel':
        return <FileSpreadsheet className="w-6 h-6 text-green-600" />;
      case 'word':
        return <FileText className="w-6 h-6 text-blue-600" />;
      case 'ppt':
        return <Presentation className="w-6 h-6 text-orange-600" />;
      default:
        return <Upload className="w-6 h-6 text-gray-600" />;
    }
  };

  const getFileTypeName = (type: string) => {
    switch (type) {
      case 'excel':
        return 'Excel File';
      case 'word':
        return 'Word Document';
      case 'ppt':
        return 'PowerPoint';
      default:
        return type.toUpperCase();
    }
  };

  const getLastFile = (files: string[] | undefined) => {
    return files && files.length > 0 ? files[files.length - 1] : null;
  };

  return (
    <div className="flex-1 p-5">
      {submitstatus ? (
        <form onSubmit={handleSubmit} className="mb-5 pb-10">
          <h3 className="text-lg font-semibold mb-3">Upload Files</h3>
          <div className="space-y-3">
            <ExcelFile setMessage={setMessage} />
            <WordFile setMessage={setMessage} />
            <PPTFile setMessage={setMessage} />
          </div>
          {/* Bottom part: Typing speed calculator */}
          <div className="flex justify-end mt-5">
            <button
              type="submit"
              className="bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-green-500 transition-colors"
            >
              {loading ? "Submitting..." : "Submit All Files"}
            </button>
          </div>
        </form>
      ) : (
        <TextArea setMessage={setMessage} setSubmitStatus={setSubmitStatus} />
      )}

      {showPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white relative">
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors rounded-full p-1 hover:bg-white/20"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Uploaded Files</h3>
                  <p className="text-blue-100 text-sm">Review your latest uploads</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                {["excel", "word", "ppt"].map((key) => {
                  const lastFile = getLastFile(submittedData?.[key]);
                  const hasFiles = submittedData?.[key]?.length > 0;

                  return (
                    <div
                      key={key}
                      className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${hasFiles
                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                        : 'border-gray-200 bg-gray-50'
                        }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getFileIcon(key)}
                          </div>

                          <div className="flex-grow min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              {hasFiles && (
                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                              )}
                              <span className={`font-semibold ${hasFiles ? 'text-green-800' : 'text-gray-600'}`}>
                                {getFileTypeName(key)}
                              </span>
                              {hasFiles && (
                                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                  ✓ Uploaded
                                </span>
                              )}
                            </div>

                            <div className="text-sm">
                              {lastFile ? (
                                <div>
                                  <p
                                    className="text-gray-700 font-medium break-all leading-relaxed"
                                    title={lastFile}
                                  >
                                    {lastFile}
                                  </p>
                                  {submittedData[key].length > 1 && (
                                    <p className="text-gray-500 text-xs mt-1">
                                      Latest of {submittedData[key].length} files
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-gray-500 italic">No file uploaded</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit Button */}
              <div className="mt-8 pt-4 border-t border-gray-200">
                <button
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${!(
                    submittedData?.excel?.length > 0 &&
                    submittedData?.word?.length > 0 &&
                    submittedData?.ppt?.length > 0
                  )
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : loading
                      ? 'bg-blue-400 cursor-wait'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-green-700 hover:to-green-700 focus:ring-blue-400 transform hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  disabled={
                    !(
                      submittedData?.excel?.length > 0 &&
                      submittedData?.word?.length > 0 &&
                      submittedData?.ppt?.length > 0
                    ) || loading
                  }
                  onClick={handleFinalSubmit}
                >
                  <div className="flex items-center justify-center space-x-2">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Finalizing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5" />
                        <span>Finalize Submission</span>
                      </>
                    )}
                  </div>
                </button>

                {!(
                  submittedData?.excel?.length > 0 &&
                  submittedData?.word?.length > 0 &&
                  submittedData?.ppt?.length > 0
                ) && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Please upload all required file types to continue
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};