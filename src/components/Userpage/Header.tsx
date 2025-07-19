"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import IP from "./ip";

interface HeaderProps {
  session: any;
}

export default function Header({ session }: HeaderProps) {
  const TOTAL_DURATION = 45 * 60 * 1000; // 45 minutes in milliseconds
  const [timeLeft, setTimeLeft] = useState(TOTAL_DURATION / 1000);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Check if a start time is already stored
    const savedStartTime = localStorage.getItem("sessionStartTime");
    let sessionStartTime: number;

    if (savedStartTime) {
      sessionStartTime = parseInt(savedStartTime);
    } else {
      sessionStartTime = Date.now();
      localStorage.setItem("sessionStartTime", sessionStartTime.toString());
    }

    const updateTimer = () => {
      const elapsed = Date.now() - sessionStartTime;
      const remaining = Math.max(TOTAL_DURATION - elapsed, 0);
      setTimeLeft(Math.floor(remaining / 1000));

      if (remaining <= 0) {
        signOut({ callbackUrl: "/login" });
      }
    };

    updateTimer(); // Call immediately on mount

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 300) return "text-red-600";
    if (timeLeft <= 600) return "text-yellow-500";
    return "text-green-600";
  };

  return (
    <header className="w-full bg-white shadow-md px-6 md:px-16 py-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
        <h1 className="text-lg md:text-xl font-semibold text-gray-700">
          Name:
        </h1>
        <span className="text-base md:text-xl font-medium text-gray-900">
          {session?.user.name}
        </span>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500">Time Remaining</p>
        <div
          className={`text-2xl md:text-3xl font-bold tracking-wide ${getTimerColor()}`}
        >
          {formatTime(timeLeft)}
        </div>
        {timeLeft <= 300 && (
          <p className="text-xs text-red-500 mt-1 animate-pulse">
            Less than 5 minutes left!
          </p>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-700">
          Hall No:
        </h2>
        <span className="text-base md:text-xl font-medium text-gray-900">
          {session?.user.examroom}
        </span>
      </div>

      <IP />

      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-700">
          Hall Ticket No:
        </h2>
        <span className="text-base md:text-xl font-medium text-gray-900">
          {session?.user.hallticket}
        </span>
      </div>
    </header>
  );
}
