"use client";
import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";
import { useState } from "react";

const ToastMessage = ({ message, type }: { message: string; type: 'success' | 'error' }) => {
  if (!message) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${type === 'success'
      ? 'bg-green-500 text-white'
      : 'bg-red-500 text-white'
      } flex items-center space-x-2 animate-pulse`}>
      <span>{type === 'success' ? '✅' : '❌'}</span>
      <span>{message}</span>
    </div>
  );
};

const FileUploadCard = ({
  title,
  description,
  icon,
  acceptedFormat,
  apiEndpoint,
  fieldName,
  setMessage,
  color = "blue"
}: {
  title: string;
  description: string;
  icon: JSX.Element;
  acceptedFormat: string;
  apiEndpoint: string;
  fieldName: string;
  setMessage: (message: string) => void;
  color?: string;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const { data: session } = useSession();

  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-600",
      button: "bg-blue-500 hover:bg-blue-600",
      dragOver: "border-blue-400 bg-blue-100"
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-600",
      button: "bg-green-500 hover:bg-green-600",
      dragOver: "border-green-400 bg-green-100"
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-600",
      button: "bg-purple-500 hover:bg-purple-600",
      dragOver: "border-purple-400 bg-purple-100"
    }
  };

  const currentColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const validateFile = (selectedFile: File): boolean => {
    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();
    const expectedExtension = acceptedFormat.replace(".", "").toLowerCase();

    if (fileExtension !== expectedExtension) {
      showToast(`Please select a ${acceptedFormat.toUpperCase()} file. The selected file is not supported.`, 'error');
      return false;
    }

    // Check file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      showToast("File size should be less than 10MB. Please choose a smaller file.", 'error');
      return false;
    }

    return true;
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setUploadedFileName(null); // Clear previous upload status
      setToastMessage(''); // Clear any previous messages
    } else {
      setFile(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!session || !file) {
      showToast("Please make sure you're logged in and have selected a file.", 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const token = generateToken(
        { user: session?.user },
        60 * 2
      );

      const formData = new FormData();
      formData.append(fieldName, file);

      setUploadProgress(30);

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      setUploadProgress(80);

      if (!response.ok) {
        throw new Error("Upload failed. Please try again or contact support.");
      }

      const result = await response.json();
      setUploadProgress(100);
      setUploadedFileName(file.name);
      showToast(`${title} uploaded successfully!`, 'success');

      // Reset file selection after successful upload
      setTimeout(() => {
        setFile(null);
        setUploadProgress(0);
      }, 2000);

    } catch (error: any) {
      console.error("Upload error:", error);
      showToast(`Upload failed: ${error.message}`, 'error');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check if there's any uploaded file (current or previous)
  const hasUploadedFile = uploadedFileName || file;

  return (
    <div className={`${currentColor.bg} ${currentColor.border} border-2 rounded-xl p-4 transition-all duration-200 ${isDragOver ? currentColor.dragOver : 'hover:shadow-lg'} h-fit`}>
      <ToastMessage message={toastMessage} type={toastType} />

      {/* Header */}
      <div className="flex items-center space-x-3 mb-3">
        <div className="text-xl">{icon}</div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-800 truncate">{title}</h3>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
      </div>

      {/* Upload Success Status */}
      {uploadedFileName && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-500 text-sm">✅</span>
            <span className="text-xs font-medium text-green-800">Saved File:</span>
          </div>
          <p className="text-xs text-green-700 mt-1 truncate">{uploadedFileName}</p>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-3 text-center transition-all duration-200 ${isDragOver
          ? `${currentColor.border} bg-white`
          : 'border-gray-300 hover:border-gray-400 bg-white'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!file ? (
          <>
            <div className="text-2xl mb-2">📁</div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Drop {acceptedFormat.toUpperCase()} file here
            </p>
            <p className="text-xs text-gray-500 mb-2">or click to browse</p>
            <input
              type="file"
              accept={acceptedFormat}
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
              id={`file-input-${fieldName}`}
            />
            <label
              htmlFor={`file-input-${fieldName}`}
              className={`inline-block px-3 py-2 bg-blue-500 hover:bg-green-500 text-white rounded-lg cursor-pointer transition-colors duration-200 font-medium text-xs`}
            >
              {hasUploadedFile ? 'Replace File' : 'Choose File'}
            </label>
            <p className="text-xs text-gray-400 mt-2">Max: 10MB</p>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <div className="text-2xl">📄</div>
              <div className="text-left min-w-0 flex-1">
                <p className="font-medium text-gray-800 truncate text-sm">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            </div>

            {isUploading && (
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`${currentColor.button.split(' ')[0]} h-1.5 rounded-full transition-all duration-300`}
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className={`flex-1 py-2 px-3 bg-blue-500 hover:bg-green-500 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs`}
              >
                {isUploading ? (
                  <span className="flex items-center justify-center space-x-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>{uploadProgress}%</span>
                  </span>
                ) : (
                  "Save File"
                )}
              </button>
              <button
                onClick={() => setFile(null)}
                disabled={isUploading}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 text-xs"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File Format Info */}
      <div className="mt-3 p-2 bg-white rounded-lg border">
        <p className="text-xs font-medium text-gray-700">Format: {acceptedFormat.toUpperCase()}</p>
      </div>
    </div>
  );
};

export const ExcelFile = ({ setMessage }: { setMessage: (message: string) => void }) => {
  return (
    <FileUploadCard
      title="Upload Excel File"
      description="Upload Excel files for data processing"
      icon={
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="28" height="28" rx="3" fill="#217346" />
          <path d="M8 8h16v16H8V8z" fill="#ffffff" />
          <path d="M12.5 12l3 4-3 4h2l2-2.5L18.5 20h2l-3-4 3-4h-2l-2 2.5L14.5 12h-2z" fill="#217346" />
        </svg>
      }
      acceptedFormat=".xlsx"
      apiEndpoint="/api/submit/excelfile"
      fieldName="excelfile"
      setMessage={setMessage}
      color="blue"
    />
  );
};

export const WordFile = ({ setMessage }: { setMessage: (message: string) => void }) => {
  return (
    <FileUploadCard
      title="Word Document"
      description="Upload Word docs for processing"
      icon={
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="28" height="28" rx="3" fill="#2B579A" />
          <path d="M8 8h16v16H8V8z" fill="#ffffff" />
          <path d="M10 12h2l1.5 6L15 12h2l1.5 6L20 12h2l-2.5 8h-2L16 14.5 14.5 20h-2L10 12z" fill="#2B579A" />
        </svg>
      }
      acceptedFormat=".docx"
      apiEndpoint="/api/submit/wordfile"
      fieldName="wordfile"
      setMessage={setMessage}
      color="blue"
    />
  );
};

export const PPTFile = ({ setMessage }: { setMessage: (message: string) => void }) => {
  return (
    <FileUploadCard
      title="PowerPoint Presentation"
      description="Upload PPT files for processing"
      icon={
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="28" height="28" rx="3" fill="#D24726" />
          <path d="M8 8h16v16H8V8z" fill="#ffffff" />
          <path d="M10 12h6c1.7 0 3 1.3 3 3s-1.3 3-3 3h-4v2h-2v-8zm2 2v4h4c.6 0 1-.4 1-1v-2c0-.6-.4-1-1-1h-4z" fill="#D24726" />
        </svg>
      }
      acceptedFormat=".pptx"
      apiEndpoint="/api/submit/pptfile"
      fieldName="pptfile"
      setMessage={setMessage}
      color="blue"
    />
  );
};