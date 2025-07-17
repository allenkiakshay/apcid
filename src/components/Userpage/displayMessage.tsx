"use client";
import { useEffect, useState } from "react";

interface DisplayMessageProps {
  message: {
    message: string;
  };
  setMessage: (message: string) => void;
}

export const DisplayMessage = ({
  message,
  setMessage,
}: DisplayMessageProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (message.message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setMessage(""); // Clear the message after displaying
      }, 5000); // Message will disappear after 5 seconds
      return () => clearTimeout(timer); // Cleanup the timer
    }
  }, [message]);

  if (!visible) return null;

  return (
    <div>
      {message.message === "Submitted Successfully!" ? (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white p-3 rounded-lg shadow-lg">
          {message.message}
        </div>
      ) : message.message === "Uploaded Successfully!" ? (
        <div className="fixed bottom-5 right-5 bg-yellow-500 text-white p-3 rounded-lg shadow-lg">
          {message.message}
        </div>
      ) : message.message === "You have already submitted the Text." ? (
        <div className="fixed bottom-5 right-5 bg-orange-500 text-white p-3 rounded-lg shadow-lg">
          {message.message}
        </div>
      ) : (
        message.message && (
          <div className="fixed bottom-5 right-5 bg-red-500 text-white p-3 rounded-lg shadow-lg">
            {message.message}
          </div>
        )
      )}
    </div>
  );
};
