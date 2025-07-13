"use client";
import Navbar from "@/components/Navbar";
import { generateToken } from "@/lib/jwttoken";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [typingSpeed, setTypingSpeed] = useState<number | null>(null);
  const [questionPaper, setQuestionPaper] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [formdata, setFormData] = useState<{
    excelfile: File | null;
    wordfile: File | null;
    pptfile: File | null;
    text: string;
  }>({
    excelfile: null,
    wordfile: null,
    pptfile: null,
    text: "",
  });
  const [submitstatus, setSubmitStatus] = useState(false);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (!session) return; // Ensure session is defined before calling fetchData

    const fetchData = async () => {
      const token = generateToken(
        {
          user: session?.user,
        },
        60 * 2 // Token valid for 2 minutes
      );

      try {
        const response = await fetch("/api/submitstatus", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 400) {
          setMessage("You have already submitted the files.");
          setSubmitStatus(true);
          return;
        }

        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(`Failed to fetch submission status: ${errorMessage}`);
        }

        setSubmitStatus(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setSubmitStatus(false);
      }
    };

    fetchData();
  }, [session]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const currentText = e.target.value;
    setText(currentText);

    if (startTime === null) {
      setStartTime(Date.now());
    } else {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const wordsTyped = currentText
        .split(" ")
        .filter((word) => word.length > 0).length;
      setTypingSpeed((wordsTyped / elapsedTime) * 60);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileKey: "excelfile" | "wordfile" | "pptfile"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    const allowedTypesMap: Record<
      "excelfile" | "wordfile" | "pptfile",
      { mime: string[]; extensions: string[] }
    > = {
      excelfile: {
        mime: [
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        extensions: ["xlsx"],
      },
      wordfile: {
        mime: [
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        extensions: ["docx"],
      },
      pptfile: {
        mime: [
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ],
        extensions: ["pptx"],
      },
    };

    const allowed = allowedTypesMap[fileKey];

    if (
      !allowed.mime.includes(file.type) ||
      !allowed.extensions.includes(fileExtension || "")
    ) {
      setMessage(
        `Please upload a valid ${fileKey
          .replace("file", "")
          .toUpperCase()} file.`
      );
      e.target.value = ""; // Clear invalid input
      return;
    }

    // If valid, update your state
    setFormData((prev) => ({ ...prev, [fileKey]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Processing...");

    if (!formdata.excelfile) {
      setMessage("Please select an Excel file to upload.");
      return;
    }

    if (!formdata.wordfile) {
      setMessage("Please select a Word file to upload.");
      return;
    }

    if (!formdata.pptfile) {
      setMessage("Please select a PPT file to upload.");
      return;
    }

    const token = generateToken(
      {
        user: session?.user,
      },
      60
    );

    try {
      const textBlob = new Blob([formdata.text], { type: "text/plain" });
      const textFile = new File([textBlob], "typing-text.txt", {
        type: "text/plain",
      });

      const formData = new FormData();
      formData.append("excelfile", formdata.excelfile!);
      formData.append("wordfile", formdata.wordfile!);
      formData.append("pptfile", formdata.pptfile!);
      formData.append("textfile", textFile);
      formData.append("typingspeed", typingSpeed?.toString() || "");

      const response = await fetch("/api/localsubmit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseData = await response.json();

      if (response.status !== 200) {
        setFormData({
          excelfile: null,
          wordfile: null,
          pptfile: null,
          text: "",
        });
        setText("");
        setStartTime(null);
        setTypingSpeed(null);
        throw new Error(responseData.error || "Failed to submit data");
      }

      setFormData({
        excelfile: null,
        wordfile: null,
        pptfile: null,
        text: "",
      });
      setText("");
      setStartTime(null);
      setTypingSpeed(null);

      setMessage(`Submitted Successfully!`);
    } catch (error) {
      console.error(error);
      setFormData({
        excelfile: null,
        wordfile: null,
        pptfile: null,
        text: "",
      });
      setText("");
      setStartTime(null);
      setTypingSpeed(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to upload file. Please try again."
      );
    }
  };

  const fetchQuestionPaper = async () => {
    try {
      const response = await fetch("/api/fetch/qp", {
        method: "GET",
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to fetch question paper: ${errorMessage}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setQuestionPaper(url); // Update the questionPaper state with the file URL
    } catch (error) {
      console.error("Error fetching question paper:", error);
      setMessage("Failed to download question paper. Please try again.");
    }
  };

  const fetchMergedPDF = async () => {
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

  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault(); // disable right-click
  };

  const handleCopy = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault(); // disable Ctrl+C
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault(); // disable Ctrl+V
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "v")) {
      e.preventDefault();
    }
  };

  if (submitstatus) {
    return (
      <div>
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] bg-gray-100">
          <h1 className="text-3xl font-bold mb-5 text-center text-gray-800">
            You have already submitted the files.
          </h1>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={fetchMergedPDF}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
            >
              Download Response Sheet
            </button>
            <button
              onClick={() => signOut()}
              className="bg-red-500 text-white py-3 px-6 rounded-lg shadow-lg hover:bg-red-600 transition-transform transform hover:scale-105"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading" || !session) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center h-[80vh] bg-gray-100">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Loading...
            </h1>
            <p className="text-gray-600 text-lg">
              Please wait while we fetch your session details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="w-full flex flex-row gap-10 justify-between items-center p-5 bg-gray-100 px-16">
        <h1 className="text-2xl font-bold text-center ">
          Name:{" "}
          <span className="font-medium text-xl">{session?.user.name}</span>
        </h1>

        <h2 className="text-2xl font-bold text-center ">
          Hall Ticket No:{" "}
          <span className="font-medium text-xl">
            {session?.user.hallticket}
          </span>
        </h2>
      </div>
      <div className="flex h-[80vh]">
        {/* Left part: PDF viewer */}
        <div className="flex-1 overflow-auto border-r border-gray-300">
          <div className="w-full h-full flex flex-col items-center justify-center">
            {questionPaper ? (
              <iframe
                src={questionPaper}
                className="w-full h-full"
                typeof="application/pdf"
                title="Question Paper"
              ></iframe>
            ) : (
              <div className="text-center">
                <p className="text-gray-600">
                  Question paper is not available.
                </p>
                <button
                  onClick={fetchQuestionPaper}
                  className="mt-3 bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition-colors"
                >
                  Fetch Question Paper
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right part: Typing speed calculator */}
        <div className="flex-1 p-5">
          {/* Top part: File upload */}
          <form onSubmit={handleSubmit} className="mb-5">
            <h3 className="text-lg font-semibold mb-3">Upload Files</h3>
            <div className="space-y-3">
              <div className="border border-gray-300 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Upload Excel File:
                </label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => handleFileChange(e, "excelfile")}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>
              <div className="border border-gray-300 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Upload Word File:
                </label>
                <input
                  type="file"
                  accept=".docx"
                  onChange={(e) => handleFileChange(e, "wordfile")}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>
              <div className="border border-gray-300 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Upload PPT File:
                </label>
                <input
                  type="file"
                  accept=".pptx"
                  onChange={(e) => handleFileChange(e, "pptfile")}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>
            </div>
            {/* Bottom part: Typing speed calculator */}
            <div className="mt-5">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Typing Area:
              </label>
              <textarea
                value={text}
                onChange={(e) => {
                  handleTextChange(e);
                  setFormData((prev) => ({ ...prev, text: e.target.value }));
                }}
                onContextMenu={handleContextMenu}
                onCopy={handleCopy}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="Start typing here..."
                className="w-full h-40 resize-none border border-gray-300 rounded-lg p-4 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="mt-3">
                <h3 className="text-lg font-semibold">
                  Typing Speed: {typingSpeed ? typingSpeed.toFixed(2) : 0} WPM
                </h3>
              </div>
            </div>
            <button
              type="submit"
              className="mt-5 bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition-colors"
            >
              Submit
            </button>
          </form>
        </div>
        {message === "Submitted Successfully!" ? (
          <div className="fixed bottom-5 right-5 bg-green-500 text-white p-3 rounded-lg shadow-lg">
            {message}
          </div>
        ) : (
          message && (
            <div className="fixed bottom-5 right-5 bg-red-500 text-white p-3 rounded-lg shadow-lg">
              {message}
            </div>
          )
        )}
      </div>
    </div>
  );
}
