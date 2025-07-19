"use client";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { TextArea } from "./textArea";
import { ExcelFile, PPTFile, WordFile } from "./filesUpload";

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
  }, [session]);

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
    } catch (error: any) {
      console.error("Error during final submission:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
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
          <button
            type="submit"
            className="mt-5 bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition-colors"
          >
            {loading ? "Submitting..." : "Submit All Files"}
          </button>
        </form>
      ) : (
        <TextArea setMessage={setMessage} setSubmitStatus={setSubmitStatus} />
      )}

      {showPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-96 relative">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full"
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold mb-4 text-center text-gray-800">
              Uploaded Files
            </h3>
            <ul className="space-y-4">
              {["excel", "word", "ppt"].map((key) => (
                <div key={key} className="bg-gray-100 p-4 rounded-lg shadow-sm">
                  <li className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={submittedData?.[key]?.length > 0}
                      readOnly
                      className="mr-3 h-5 w-5 text-blue-500 focus:ring-blue-400 rounded"
                    />
                    <span className="text-gray-700 font-medium">
                      {key.toUpperCase()}
                    </span>
                  </li>
                  <div className="flex flex-col space-y-1 pl-8">
                    {submittedData?.[key]?.length > 0 ? (
                      submittedData[key].map((item: string, index: number) => (
                        <p
                          key={index}
                          className="text-sm text-gray-600 truncate"
                          title={item}
                        >
                          {item}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No data</p>
                    )}
                  </div>
                </div>
              ))}
            </ul>
            <button
              className="mt-6 w-full bg-green-500 text-white py-3 px-4 rounded-lg shadow hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={
                !(
                  submittedData?.excel?.length > 0 &&
                  submittedData?.word?.length > 0 &&
                  submittedData?.ppt?.length > 0
                )
              }
              onClick={handleFinalSubmit}
            >
              {loading ? "Finalizing..." : "Finalize Submission"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
