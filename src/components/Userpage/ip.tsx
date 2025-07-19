"use client";

import { useEffect, useState } from "react";

export default function IP() {
  const [ip, setIp] = useState("");

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const res = await fetch("/api/ip");
        const data = await res.json();
        setIp(data.ip);
      } catch (err) {
        console.error("Failed to fetch IP:", err);
      }
    };

    fetchIp();
  }, []);

  return (
    <div className="flex items-center justify-center">
      <p className="text-xl font-semibold text-gray-800">
        Your IP Address: <span className="text-blue-600">{ip || "Loading..."}</span>
      </p>
    </div>
  );
}
