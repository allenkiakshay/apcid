"use client";
import Navbar from "@/components/Navbar";
import { uploadFileToS3 } from "@/lib/ImageUpload";
import { generateToken } from "@/lib/jwttoken";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [typingSpeed, setTypingSpeed] = useState<number | null>(null);
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

  const { data: session,status } = useSession();

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
    fileType: string
  ) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, [fileType]: file }));
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
      60 // Token valid for 5 minutes
    );

    try {
      const excelurl = await uploadFileToS3(
        formdata.excelfile,
        "main",
        "excel",
        `${session?.user.hallticket}.${formdata.excelfile.name.split(".")[1]}`
      );

      const wordurl = await uploadFileToS3(
        formdata.wordfile,
        "main",
        "word",
        `${session?.user.hallticket}.${formdata.wordfile.name.split(".")[1]}`
      );
      const ppturl = await uploadFileToS3(
        formdata.pptfile,
        "main",
        "ppt",
        `${session?.user.hallticket}.${formdata.pptfile.name.split(".")[1]}`
      );

      // Convert textarea text to a .txt file
      const textBlob = new Blob([formdata.text], { type: "text/plain" });
      const textFile = new File([textBlob], "typing-text.txt", {
        type: "text/plain",
      });
      const texturl = await uploadFileToS3(
        textFile,
        "main",
        "text",
        `${session?.user.hallticket}.txt`
      );

      if (!excelurl || !wordurl || !ppturl || !texturl) {
        setMessage("Failed to upload one or more files. Please try again.");
        return;
      }

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          excelurl,
          wordurl,
          ppturl,
          texturl,
          typingspeed: typingSpeed,
        }),
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

  if (submitstatus) {
    return (
      <div>
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] bg-gray-100">
          <h1 className="text-3xl font-bold mb-5 text-center text-gray-800">
            You have already submitted the files.
          </h1>
          <div className="flex flex-col items-center gap-4">
            <button className="bg-blue-600 text-white py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
              <a href={`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/apcid/mergedpdf/${session?.user.hallticket}.pdf`} target="_blank" rel="noopener noreferrer">
                Download Response Sheet
              </a>
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
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Loading...</h1>
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
            <iframe
              // src="https://mahesh-mens-touch.s3.ap-south-1.amazonaws.com/apcid/Question+Paper.pdf"
              src="/uploads/Question Paper.pdf"
              className="w-full h-full"
              title="Question Paper"
            ></iframe>
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
                  accept=".xls,.xlsx"
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
                  accept=".doc,.docx"
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
                  accept=".ppt,.pptx"
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
