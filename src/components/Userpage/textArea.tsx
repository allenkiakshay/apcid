"use client";

import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import React, { Dispatch, SetStateAction } from "react";

interface TextAreaProps {
  setMessage: Dispatch<SetStateAction<string>>;
  setSubmitStatus: Dispatch<SetStateAction<boolean>>;
}

export const TextArea: React.FC<TextAreaProps> = ({ setMessage, setSubmitStatus }) => {
  const [text, setText] = useState<string>("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [typingSpeed, setTypingSpeed] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutes in seconds
  const [timerStarted, setTimerStarted] = useState<boolean>(false);
  const { data: session, status } = useSession();

  // Refs to store timer IDs and current text value
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textRef = useRef<string>(""); // Add ref to track current text value

  // Update ref whenever text changes
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get progress percentage for timer
  const getProgressPercentage = (): number => {
    return ((300 - timeRemaining) / 300) * 100;
  };

  // Start auto-submit timer when user starts typing
  const startAutoSubmitTimer = () => {
    // Clear any existing timers
    clearAutoSubmitTimers();
    setTimerStarted(true);

    // Start countdown timer (updates every second)
    countdownTimerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-submit after 5 minutes
    autoSubmitTimerRef.current = setTimeout(() => {
      handleAutoSubmit();
    }, 5 * 60 * 1000); // 5 minutes
  };

  // Clear all timers
  const clearAutoSubmitTimers = () => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setTimerStarted(false);
  };

  // Handle auto-submit
  const handleAutoSubmit = async (): Promise<void> => {
    const currentText = textRef.current; // Use ref value instead of state
    
    if (!currentText.trim()) {
      setMessage("Time limit reached - No text to submit.");
      clearAutoSubmitTimers();
      setTimeRemaining(300); // Reset for next session
      return;
    }

    setMessage("Auto-submitting due to time limit...");
    await handleSubmit(true); // Pass true to indicate auto-submit
  };

  // Reset timer when text changes
  const resetTimer = () => {
    setTimeRemaining(300); // Reset to 5 minutes
    setTimerStarted(false);
    clearAutoSubmitTimers();
  };

  // Clean up timers on component unmount
  useEffect(() => {
    return () => {
      clearAutoSubmitTimers();
    };
  }, []);

  const handleSubmit = async (isAutoSubmit: boolean = false): Promise<void> => {
    if (!session) return;
    setSubmitting(true);

    // Clear timers since we're submitting
    clearAutoSubmitTimers();

    const token = generateToken(
      {
        user: session?.user,
      },
      60 * 2 // Token valid for 2 minutes
    );

    const currentText = isAutoSubmit ? textRef.current : text; // Use ref for auto-submit

    if (!currentText.trim()) {
      const message = isAutoSubmit 
        ? "Time limit reached - No text to submit."
        : "Please enter some text before submitting.";
      alert(message);
      setSubmitting(false);
      setShowConfirmation(false);
      if (isAutoSubmit) {
        // Reset timer for next session after auto-submit with no text
        setTimeRemaining(300);
        setTimerStarted(false);
      }
      return;
    }

    try {
      const textBlob = new Blob(["\n\n\n\n\n\n" + currentText], {
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

      const successMessage = isAutoSubmit 
        ? "Auto-submitted successfully!" 
        : "Submitted Successfully!";
      setMessage(successMessage);
      setSubmitStatus(true);
      setText(""); // Clear the text area after successful submission
      setTimeRemaining(300); // Reset timer
      setTimerStarted(false); // Reset timer state for next session
    } catch (error: any) {
      console.error("Error submitting text:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
      setShowConfirmation(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const currentText = e.target.value;
    setText(currentText);

    // Handle typing speed calculation
    if (startTime === null) {
      setStartTime(Date.now());
    } else {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const wordsTyped = currentText
        .split(" ")
        .filter((word) => word.length > 0).length;
      setTypingSpeed((wordsTyped / elapsedTime) * 60);
    }

    // Start timer only once when user begins typing
    if (!timerStarted && currentText.trim()) {
      startAutoSubmitTimer();
    }
    
    // Timer continues even if text becomes empty - no clearing
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>): void => {
    e.preventDefault(); // disable right-click
  };

  const handleCopy = (e: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    e.preventDefault(); // disable Ctrl+C
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    e.preventDefault(); // disable Ctrl+V
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "v")) {
      e.preventDefault();
    }
  };

  const handleManualSubmit = () => {
    setShowConfirmation(true);
  };

  // Get timer color based on remaining time
  const getTimerColor = () => {
    if (timeRemaining <= 30) return "text-red-500";
    if (timeRemaining <= 60) return "text-orange-500";
    return "text-emerald-500";
  };

  const getTimerBgColor = () => {
    if (timeRemaining <= 30) return "bg-red-50 border-red-200";
    if (timeRemaining <= 60) return "bg-orange-50 border-orange-200";
    return "bg-emerald-50 border-emerald-200";
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      {/* Header */}
      
       <div className="mb-4 bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-inner">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Sample Text</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          The quick brown fox jumps over the lazy dog. This is a sample sentence to help you get started. Feel free to ignore it and write your own.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Typing Practice</h2>
        <p className="text-gray-600">Start typing to begin your session. Auto-submit after 5 minutes.</p>
      </div>

      {/* Timer Display */}
      {timerStarted && (
        <div className={`mb-6 p-4 rounded-xl border-2 transition-all duration-300 ${getTimerBgColor()}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Time Remaining</span>
              </div>
              <span className={`text-2xl font-bold ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            {timeRemaining <= 60 && timeRemaining > 0 && (
              <div className="flex items-center space-x-2 text-orange-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-semibold">Auto-submit in {timeRemaining}s</span>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                timeRemaining <= 30 ? 'bg-red-500' : 
                timeRemaining <= 60 ? 'bg-orange-500' : 
                'bg-emerald-500'
              }`}
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Text Area */}
      <div className="mb-6">
        <div className="relative">
          <textarea
            value={text}
            onChange={handleTextChange}
            onContextMenu={handleContextMenu}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Start typing here... Your session will begin automatically and auto-submit after 5 minutes."
            className="w-full h-48 resize-none border-2 border-gray-200 rounded-xl p-6 text-lg leading-relaxed shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-200 placeholder-gray-400"
          />
          
          {/* Character Count */}
          <div className="absolute bottom-4 right-4 text-sm text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
            {text.length} characters
          </div>
        </div>
      </div>

      {/* Stats and Submit Section */}
      <div className="flex items-center justify-between">
        {/* Typing Speed Display */}
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div>
                <p className="text-sm text-gray-600">Typing Speed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {typingSpeed ? typingSpeed.toFixed(1) : '0.0'} 
                  <span className="text-sm font-normal text-gray-500 ml-1">WPM</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Word Count */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="text-sm text-gray-600">Word Count</p>
                <p className="text-2xl font-bold text-purple-600">
                  {text.split(" ").filter(word => word.length > 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleManualSubmit}
          disabled={submitting}
          className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
        >
          {submitting ? (
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Submitting...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              
              <span>Submit Text</span>
            </div>
          )}
        </button>
      </div>

      {/* Manual Submit Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Confirm Submission
              </h2>
              <p className="text-gray-600 text-sm">
                Review your text before final submission
              </p>
            </div>
            
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <p className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                  {text || "No text entered."}
                </p>
              </div>
              
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>{text.length} characters</span>
                <span>{text.split(" ").filter(word => word.length > 0).length} words</span>
                <span>{typingSpeed ? typingSpeed.toFixed(1) : '0.0'} WPM</span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              {submitting ? (
                <div className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Submitting...</span>
                </div>
              ) : (
                <button
                  onClick={() => handleSubmit(false)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Confirm Submit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};