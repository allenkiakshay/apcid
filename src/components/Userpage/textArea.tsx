"use client";

import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";
import { useState } from "react";

export const TextArea = ({
  setMessage,
}: {
  setMessage: (message: string) => void;
}) => {
  const [text, setText] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [typingSpeed, setTypingSpeed] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data: session, status } = useSession();

  const handleSubmit = async () => {
    if (!session) return;
    setSubmitting(true);

    const token = generateToken(
      {
        user: session?.user,
      },
      60 * 2 // Token valid for 2 minutes
    );

    if (!text.trim()) {
      alert("Please enter some text before submitting.");
      setSubmitting(false);
      setShowConfirmation(false); // Close the confirmation popup
      return;
    }

    try {
      const textBlob = new Blob(["\n\n\n\n\n\n" + text], {
        type: "text/plain",
      });

      const textFile = new File([textBlob], "typing-text.txt", {
        type: "text/plain",
      });

      const formData = new FormData();
      formData.append("textfile", textFile);
      formData.append("typingspeed", typingSpeed?.toString() || "");

      const response = await fetch("/api/submit/text", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to submit text: ${errorMessage}`);
      }

      setMessage(`Submitted Successfully!`);
      setText(""); // Clear the text area after successful submission
    } catch (error: any) {
      console.error("Error submitting text:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
      setShowConfirmation(false); // Close the confirmation popup
    }
  };

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

  return (
    <div className="mt-5">
      <label className="block text-sm font-medium mb-2 text-gray-700">
        Typing Area:
      </label>
      <textarea
        value={text}
        onChange={(e) => {
          handleTextChange(e);
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
      <button
        onClick={() => setShowConfirmation(true)}
        className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Submit Text
      </button>

      {showConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Confirm Submission
            </h2>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-bold">Text Entered:</span>{" "}
              {text || "No text entered."}
            </p>
            <p className="text-sm text-gray-600 font-semibold">
              Are you sure you want to submit this text?
            </p>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              {submitting ? (
                <div className="px-4 py-2 bg-blue-500 text-white rounded-lg">
                  Submitting...
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Confirm
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
