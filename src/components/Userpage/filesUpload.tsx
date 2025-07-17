"use client";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";
import { useState } from "react";

export const ExcelFile = ({
  setMessage,
}: {
  setMessage: (message: string) => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (!file) {
      setMessage("Please select a file to upload.");
      return;
    }
    setSubmitting(true);

    const token = generateToken(
      {
        user: session?.user,
      },
      60 * 2 // Token valid for 2 minutes
    );

    const formData = new FormData();
    formData.append("excelfile", file);

    try {
      const response = await fetch("/api/submit/excelfile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const result = await response.json();
      setMessage("Uploaded Successfully!");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
      setFile(null);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
    <div className="flex-1">
      <label className="block text-sm font-medium mb-2 text-gray-700">
        Upload Excel File:
      </label>
      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => {
        const selectedFile = e.target.files?.[0] || null;
        if (!selectedFile) {
          setFile(null);
          return;
        }
        if (
          selectedFile.name.split(".").pop()?.toLowerCase() !== "xlsx"
        ) {
          alert("Only .xlsx files are allowed.");
          setFile(null);
          return;
        }
        setFile(selectedFile);
        }}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
      />
    </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {submitting ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export const WordFile = ({
  setMessage,
}: {
  setMessage: (message: string) => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (!file) {
      setMessage("Please select a file to upload.");
      return;
    }
    setSubmitting(true);

    const token = generateToken(
      {
        user: session?.user,
      },
      60 * 2 // Token valid for 2 minutes
    );

    const formData = new FormData();
    formData.append("wordfile", file);

    try {
      const response = await fetch("/api/submit/wordfile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const result = await response.json();
      setMessage("Uploaded Successfully!");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
      setFile(null);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-2 text-gray-700">
          Upload Word File:
        </label>
        <input
          type="file"
          accept=".docx"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] || null;
            if (
              selectedFile &&
              selectedFile.name.split(".").pop()?.toLowerCase() !== "docx"
            ) {
              alert("Only .docx files are allowed.");
              setFile(null);
              return;
            }
            setFile(selectedFile);
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {submitting ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export const PPTFile = ({
  setMessage,
}: {
  setMessage: (message: string) => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (!file) {
      setMessage("Please select a file to upload.");
      return;
    }
    setSubmitting(true);

    const token = generateToken(
      {
        user: session?.user,
      },
      60 * 2 // Token valid for 2 minutes
    );

    const formData = new FormData();
    formData.append("pptfile", file);

    try {
      const response = await fetch("/api/submit/pptfile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const result = await response.json();
      setMessage("Uploaded Successfully!");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
      setFile(null);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-2 text-gray-700">
          Upload PPT File:
        </label>
        <input
          type="file"
          accept=".pptx"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] || null;
            if (
              selectedFile &&
              selectedFile.name.split(".").pop()?.toLowerCase() !== "pptx"
            ) {
              alert("Only .pptx files are allowed.");
              setFile(null);
              return;
            }
            setFile(selectedFile);
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {submitting ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};
